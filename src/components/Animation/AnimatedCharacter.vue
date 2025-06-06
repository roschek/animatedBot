<template>
  <div class="spine-character">
    <div ref="playerContainer" class="spine-character__player" :style="containerStyles"></div>

    <div v-if="showDebug" class="spine-character__debug">
      <p>Current: {{ currentAnimation }}</p>
      <p>Store Loading: {{ isLoading }}</p>
      <p>Store Responding: {{ isResponding }}</p>
      <p>Response Text: "{{ currentResponseText.slice(0, 20) }}..."</p>
      <p>Internal State: {{ internalState }}</p>
      <p>Speed: {{ speechSpeed }}ms</p>
      <button @click="testSpeech" class="debug-btn">Test Speech</button>
      <button @click="playRandomAnimation" class="debug-btn">Random Anim</button>
      <button @click="toggleSpeed" class="debug-btn">Speed: {{ speechSpeed }}ms</button>
      <button @click="forceIdle" class="debug-btn">Force Idle</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import '@esotericsoftware/spine-player/dist/spine-player.css'
import * as spine from '@esotericsoftware/spine-player'

// Минимальный API - только конфигурация отображения
interface Props {
  scale?: number
  showDebug?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1,
  showDebug: false,
})

// Подключаемся к store автономно
const chatStore = useChatStore()
const { isLoading, isResponding, currentResponseText } = storeToRefs(chatStore)

// Внутреннее состояние компонента
const playerContainer = ref<HTMLElement | null>(null)
const spinePlayer = ref<spine.SpinePlayer | null>(null)
const currentAnimation = ref('loop_idle')
const isAnimating = ref(false)
const speechSpeed = ref(50)
const internalState = ref<'idle' | 'thinking' | 'speaking'>('idle')

const animationList = [
  'brows_angry', 'brows_default', 'brows_happy', 'brows_sad',
  'eyelids_bottop_closed', 'eyelids_closed', 'eyelids_upper_lowered',
  'head_no', 'head_yes',
  'lips_a_big', 'lips_a_small', 'lips_default_smile', 'lips_e', 'lips_er',
  'lips_i', 'lips_m_p_b', 'lips_o', 'lips_u', 'lips_t_s_d_c', 'lips_v_f',
  'loop_idle', 'loop_walking',
]

const lipGroups = {
  vowels: ['lips_a_big', 'lips_a_small', 'lips_e', 'lips_i', 'lips_o', 'lips_u'],
  consonants: ['lips_m_p_b', 'lips_t_s_d_c', 'lips_v_f', 'lips_default_smile'],
  neutral: ['lips_default_smile', 'lips_er'],
}

const containerStyles = computed(() => ({
  width: '600px',
  height: '800px',
  transform: props.scale !== 1 ? `scale(${props.scale})` : undefined,
  transformOrigin: 'center center',
}))

const getRandomFromGroup = (group: string[]): string => {
  return group[Math.floor(Math.random() * group.length)]
}

const textToSpeechPattern = (text: string): string[] => {
  const pattern: string[] = []
  
  // Emotional setup based on text
  if (text.includes('!')) {
    pattern.push('brows_happy')
  } else if (text.includes('?')) {
    pattern.push('brows_default')
  } else if (text.includes('sad') || text.includes('sorry')) {
    pattern.push('brows_sad')
  }

  // Split by sentences first, then by words
  const sentences = text.split(/([.!?;:])/g).filter(sentence => sentence.trim())
  
  sentences.forEach((sentence, sentenceIndex) => {
    // Skip standalone punctuation
    if (/^[.!?;:]+$/.test(sentence.trim())) {
      // Pause after punctuation
      pattern.push('lips_default_smile')
      pattern.push('lips_default_smile') // Double pause for punctuation
      return
    }

    const words = sentence.trim().split(/\s+/).filter(word => word.length > 0)
    
    words.forEach((word, wordIndex) => {
      if (wordIndex > 0) {
        // Pause between words
        pattern.push('lips_default_smile')
      }

      // Generate realistic lip movements for the word
      for (let i = 0; i < Math.max(2, Math.ceil(word.length / 2)); i++) {
        if (Math.random() > 0.6) {
          pattern.push(getRandomFromGroup(lipGroups.vowels))
        } else if (Math.random() > 0.3) {
          pattern.push(getRandomFromGroup(lipGroups.consonants))
        } else {
          pattern.push(getRandomFromGroup(lipGroups.neutral))
        }
      }
    })
  })

  return pattern
}

const playAnimation = (animationName: string) => {
  if (spinePlayer.value && animationList.includes(animationName)) {
    currentAnimation.value = animationName
    spinePlayer.value.setAnimation(animationName)
    console.log('🎬 Playing animation:', animationName)
  }
}

const speak = async (text: string) => {
  if (!text.trim() || isAnimating.value) return

  console.log('🗣️ Starting speech:', text)
  isAnimating.value = true
  internalState.value = 'speaking'
  
  const speechPattern = textToSpeechPattern(text)

  // Play speech pattern
  for (let i = 0; i < speechPattern.length; i++) {
    if (!isAnimating.value) break

    const animation = speechPattern[i]
    playAnimation(animation)

    // Add some randomness to timing
    const variance = speechSpeed.value * 0.3
    const delay = speechSpeed.value + (Math.random() - 0.5) * variance

    await new Promise(resolve => setTimeout(resolve, delay))
  }

  // Return to idle after speech
  if (isAnimating.value) {
    isAnimating.value = false
    internalState.value = 'idle'
    playAnimation('loop_idle')
    console.log('✅ Speech finished, back to idle')
  }
}

const stopSpeaking = () => {
  console.log('🛑 Stopping speech')
  isAnimating.value = false
  internalState.value = 'idle'
  playAnimation('loop_idle')
}

const startThinking = () => {
  if (!isAnimating.value) {
    console.log('🤔 Started thinking - walking animation')
    internalState.value = 'thinking'
    playAnimation('loop_walking')
  }
}

const stopThinking = () => {
  if (internalState.value === 'thinking') {
    console.log('😴 Stopped thinking - back to idle')
    internalState.value = 'idle'
    playAnimation('loop_idle')
  }
}

// Debug functions
const testSpeech = () => {
  speak('Hello! How are you doing today? This is a test of the speech animation system!')
}

const playRandomAnimation = () => {
  const randomAnim = getRandomFromGroup(lipGroups.vowels.concat(lipGroups.consonants))
  playAnimation(randomAnim)
}

const toggleSpeed = () => {
  speechSpeed.value = speechSpeed.value === 50 ? 80 : speechSpeed.value === 80 ? 120 : 50
}

const forceIdle = () => {
  stopSpeaking()
  stopThinking()
}

// 🎯 АВТОНОМНЫЕ WATCHERS - следят за store
watch(isLoading, (loading) => {
  console.log('📊 Store isLoading changed:', loading)
  if (loading) {
    startThinking()
  } else {
    stopThinking()
  }
})

watch(isResponding, (responding) => {
  console.log('📊 Store isResponding changed:', responding)
  if (!responding) {
    stopSpeaking()
  }
})

watch(currentResponseText, (text) => {
  console.log('📊 Store currentResponseText changed:', text)
  if (text && isResponding.value) {
    speak(text)
  }
})

// Инициализация Spine Player
onMounted(() => {
  console.log('🎮 Mounting Smart Animated Character...')
  if (playerContainer.value) {
    spinePlayer.value = new spine.SpinePlayer(playerContainer.value, {
      skeleton: '/assets/Baby_Friend42.json',
      atlas: '/assets/Baby_Friend42.atlas',
      animation: 'loop_idle',
      backgroundColor: '#00000000',
      alpha: true,
      showControls: false,
      preserveDrawingBuffer: false,
      success: () => {
        console.log('✅ Smart Spine animation loaded successfully')
      },
      error: (err) => {
        console.error('❌ Failed to load Spine animation:', err)
      },
    })
  }
})

onUnmounted(() => {
  stopSpeaking()
  if (spinePlayer.value) {
    spinePlayer.value.dispose()
  }
})

// Expose для внешнего управления (если нужно)
defineExpose({
  speak,
  stopSpeaking,
  playAnimation,
  forceIdle,
})
</script>

<style lang="scss" scoped>
.spine-character {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__player {
    // Жёсткая фиксация размера
    overflow: hidden;
    
    :deep(canvas) {
      width: 600px !important;
      height: 800px !important;
      max-width: 600px !important;
      max-height: 800px !important;
      min-width: 600px !important;
      min-height: 800px !important;
      object-fit: contain;
    }
    
    :deep(.spine-player-container) {
      width: 600px !important;
      height: 800px !important;
    }
  }

  &__debug {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 14px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 11px;
    z-index: 10;
    min-width: 250px;
    max-width: 350px;

    p {
      margin: 0 0 4px 0;
      word-break: break-word;
    }

    .debug-btn {
      background: #007acc;
      color: white;
      border: none;
      padding: 4px 8px;
      margin: 2px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;

      &:hover {
        background: #005a9e;
      }
    }
  }
}
</style>