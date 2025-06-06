<template>
  <div class="spine-character">
    <div ref="playerContainer" class="spine-character__player" :style="containerStyles"></div>

    <div v-if="showDebug" class="spine-character__debug">
      <p><strong>Animation:</strong> {{ currentAnimation }}</p>
      <p>
        <strong>State:</strong> {{ internalState }} | <strong>Animating:</strong>
        {{ isAnimating ? '🎬' : '⏸️' }}
      </p>
      <p>
        <strong>Store:</strong> Loading: {{ isLoading ? '🔄' : '❌' }} | Responding:
        {{ isResponding ? '💬' : '❌' }}
      </p>
      <p>
        <strong>Text:</strong> "{{ currentResponseText.slice(0, 25)
        }}{{ currentResponseText.length > 25 ? '...' : '' }}"
      </p>
      <p><strong>Speed:</strong> {{ speechSpeed }}ms</p>
      <p>
        <strong>Timeouts:</strong> Loading: {{ loadingTimeout ? '⏱️' : '❌' }} | Responding:
        {{ respondingTimeout ? '⏱️' : '❌' }}
      </p>
      <div style="margin-top: 8px">
        <button @click="testSpeech" class="debug-btn">Test Speech</button>
        <button @click="playRandomAnimation" class="debug-btn">Random Lip</button>
        <button @click="toggleSpeed" class="debug-btn">Speed: {{ speechSpeed }}</button>
        <button @click="forceIdle" class="debug-btn">Force Idle</button>
        <button @click="forceWalking" class="debug-btn">Force Walk</button>
      </div>
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
const speechSpeed = ref(120) // Увеличиваем базовую скорость для плавности
const internalState = ref<'idle' | 'thinking' | 'speaking'>('idle')

// Debounce переменные для watchers
let loadingTimeout: number | null = null
let respondingTimeout: number | null = null

const animationList = [
  'brows_angry',
  'brows_default',
  'brows_happy',
  'brows_sad',
  'eyelids_bottop_closed',
  'eyelids_closed',
  'eyelids_upper_lowered',
  'head_no',
  'head_yes',
  'lips_a_big',
  'lips_a_small',
  'lips_default_smile',
  'lips_e',
  'lips_er',
  'lips_i',
  'lips_m_p_b',
  'lips_o',
  'lips_u',
  'lips_t_s_d_c',
  'lips_v_f',
  'loop_idle',
  'loop_walking',
]

const lipGroups = {
  vowels: ['lips_a_big', 'lips_a_small', 'lips_e', 'lips_i', 'lips_o', 'lips_u'],
  consonants: ['lips_m_p_b', 'lips_t_s_d_c', 'lips_v_f', 'lips_default_smile'],
  neutral: ['lips_default_smile', 'lips_er'],
}

const containerStyles = computed(() => ({
  width: '600px',
  height: '700px',
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
  const sentences = text.split(/([.!?;:])/g).filter((sentence) => sentence.trim())

  sentences.forEach((sentence, sentenceIndex) => {
    // Skip standalone punctuation
    if (/^[.!?;:]+$/.test(sentence.trim())) {
      // Pause after punctuation
      pattern.push('lips_default_smile')
      pattern.push('lips_default_smile') // Double pause for punctuation
      return
    }

    const words = sentence
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)

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

// Плавный переход между основными состояниями
const smoothTransitionTo = async (targetAnimation: string, transitionDelay: number = 300) => {
  // Для основных состояний (idle/walking) - прямой переход без промежуточных анимаций
  if (targetAnimation === 'loop_idle' || targetAnimation === 'loop_walking') {
    playAnimation(targetAnimation)
    return
  }

  // Для речевых анимаций - используем промежуточную анимацию
  if (
    currentAnimation.value !== 'lips_default_smile' &&
    targetAnimation !== currentAnimation.value
  ) {
    playAnimation('lips_default_smile')
    await new Promise((resolve) => setTimeout(resolve, transitionDelay))
  }

  playAnimation(targetAnimation)
}

const speak = async (text: string) => {
  if (!text.trim()) return

  console.log('🗣️ Starting speech:', text)

  // Прерываем thinking если нужно
  if (internalState.value === 'thinking') {
    console.log('🤔→💬 Transitioning from thinking to speaking')
  }

  isAnimating.value = true
  internalState.value = 'speaking'

  const speechPattern = textToSpeechPattern(text)

  // Play speech pattern
  for (let i = 0; i < speechPattern.length; i++) {
    if (!isAnimating.value) break

    const animation = speechPattern[i]
    playAnimation(animation)

    // Более длинные паузы для плавности
    let delay = speechSpeed.value

    // Увеличиваем паузы для определенных анимаций
    if (animation === 'lips_default_smile') {
      delay = speechSpeed.value * 1.5 // Длинные паузы между словами
    } else if (animation.includes('brows_')) {
      delay = speechSpeed.value * 2 // Эмоциональные выражения держим дольше
    }

    // Добавляем небольшую случайность
    const variance = delay * 0.2
    delay = delay + (Math.random() - 0.5) * variance

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  // Плавное завершение речи
  if (isAnimating.value) {
    isAnimating.value = false
    internalState.value = 'idle'

    // Промежуточная пауза перед возвратом к idle
    playAnimation('lips_default_smile')
    await new Promise((resolve) => setTimeout(resolve, 400))

    await smoothTransitionTo('loop_idle', 300)
    console.log('✅ Speech finished, smoothly back to idle')
  }
}

const stopSpeaking = async () => {
  console.log('🛑 Stopping speech')
  isAnimating.value = false
  internalState.value = 'idle'
  await smoothTransitionTo('loop_idle', 200)
}

const startThinking = () => {
  // Убираем проверку isAnimating - thinking имеет приоритет над речью
  console.log('🤔 Started thinking - walking animation')
  internalState.value = 'thinking'
  playAnimation('loop_walking')
}

const stopThinking = async () => {
  // Останавливаем думание только если мы действительно думаем
  if (internalState.value === 'thinking' && !isAnimating.value) {
    console.log('😴 Stopped thinking - back to idle')
    internalState.value = 'idle'
    await smoothTransitionTo('loop_idle', 200)
  } else if (internalState.value === 'thinking' && isAnimating.value) {
    console.log('🗣️ Stopped thinking but speech is active - will go to idle after speech')
    // Просто меняем internal state, анимация изменится после завершения речи
    internalState.value = 'speaking'
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
  speechSpeed.value = speechSpeed.value === 120 ? 80 : speechSpeed.value === 80 ? 160 : 120
}

const forceIdle = async () => {
  await stopSpeaking()
  await stopThinking()
}

const forceWalking = () => {
  console.log('🚶‍♂️ Debug: Force walking animation')
  internalState.value = 'thinking'
  playAnimation('loop_walking')
}

// 🎯 АВТОНОМНЫЕ WATCHERS - следят за store с плавными переходами
watch(isLoading, (loading) => {
  console.log('📊 Store isLoading changed:', loading)

  // Очищаем предыдущий timeout
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }

  if (loading) {
    startThinking() // Сразу запускаем думание
  } else {
    // Небольшая задержка перед остановкой, чтобы избежать "мигания"
    loadingTimeout = setTimeout(() => {
      if (!isLoading.value) {
        // Проверяем что состояние не изменилось
        stopThinking()
      }
      loadingTimeout = null
    }, 100)
  }
})

watch(isResponding, (responding) => {
  console.log('📊 Store isResponding changed:', responding)

  // Очищаем предыдущий timeout
  if (respondingTimeout) {
    clearTimeout(respondingTimeout)
    respondingTimeout = null
  }

  if (!responding) {
    // Задержка перед остановкой речи для естественности
    respondingTimeout = setTimeout(() => {
      if (!isResponding.value) {
        // Проверяем что состояние не изменилось
        stopSpeaking()
      }
      respondingTimeout = null
    }, 300)
  }
})

watch(currentResponseText, async (text) => {
  console.log('📊 Store currentResponseText changed:', text)
  if (text && isResponding.value) {
    // Небольшая пауза перед началом речи
    await new Promise((resolve) => setTimeout(resolve, 150))
    if (text && isResponding.value) {
      // Проверяем что состояние не изменилось
      speak(text)
    }
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

  // Очищаем все timeouts
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }
  if (respondingTimeout) {
    clearTimeout(respondingTimeout)
    respondingTimeout = null
  }

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
  forceWalking,
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
      width: 600px;
      height: 700px;

      object-fit: contain;
    }

    :deep(.spine-player-container) {
      width: 600px;
      height: 700px;
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
