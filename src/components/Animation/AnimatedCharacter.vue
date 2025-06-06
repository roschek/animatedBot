<template>
  <div class="spine-character">
    <div ref="playerContainer" class="spine-character__player" :style="containerStyles"></div>

    <div v-if="showDebug" class="spine-character__debug">
      <p>Current: {{ currentAnimation }}</p>
      <p>Speaking: {{ isSpeaking }}</p>
      <p>Speed: {{ speechSpeed }}ms</p>
      <p>Text: "{{ currentText.slice(0, 20) }}..."</p>
      <button @click="testSpeech" class="debug-btn">Test Speech</button>
      <button @click="playRandomAnimation" class="debug-btn">Random Anim</button>
      <button @click="toggleSpeed" class="debug-btn">Speed: {{ speechSpeed }}ms</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, onUnmounted } from 'vue'
import '@esotericsoftware/spine-player/dist/spine-player.css'
import * as spine from '@esotericsoftware/spine-player'

interface Props {
  isSpeaking?: boolean
  currentText?: string
  scale?: number
  showDebug?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSpeaking: false,
  currentText: '',
  scale: 1,
  showDebug: false,
})

const playerContainer = ref<HTMLElement | null>(null)
const spinePlayer = ref<spine.SpinePlayer | null>(null)
const currentAnimation = ref('loop_walking')
const isAnimating = ref(false)
const speechSpeed = ref(50)

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
  height: '800px',
  transform: props.scale !== 1 ? `scale(${props.scale})` : undefined,
  transformOrigin: 'center center',
}))

const getRandomFromGroup = (group: string[]): string => {
  return group[Math.floor(Math.random() * group.length)]
}

const textToSpeechPattern = (text: string): string[] => {
  const words = text.toLowerCase().trim().split(/\s+/)
  const pattern: string[] = []

  if (text.includes('!')) {
    pattern.push('brows_happy')
  } else if (text.includes('?')) {
    pattern.push('brows_default')
  } else if (text.includes('sad') || text.includes('sorry')) {
    pattern.push('brows_sad')
  }

  // Generate speech pattern - grouped by words, not letters
  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) {
      // Brief pause between words
      pattern.push('lips_default_smile')
    }

     for (let i = 0; i < Math.max(2, Math.ceil(word.length / 2)); i++) {
      if (Math.random() > 0.6) {
        // Vowel sound
        pattern.push(getRandomFromGroup(lipGroups.vowels))
      } else if (Math.random() > 0.3) {
        // Consonant sound
        pattern.push(getRandomFromGroup(lipGroups.consonants))
      } else {
        // Neutral position
        pattern.push(getRandomFromGroup(lipGroups.neutral))
      }
    }
  })

  return pattern
}

const playAnimation = (animationName: string) => {
  if (spinePlayer.value && animationList.includes(animationName)) {
    currentAnimation.value = animationName
    spinePlayer.value.setAnimation(animationName)
  }
}

let speechTimeout: number | null = null

const speak = async (text: string) => {
  if (!text.trim() || isAnimating.value) return

  console.log('🗣️ Starting speech:', text)
  isAnimating.value = true
  const speechPattern = textToSpeechPattern(text)
  
 
  // Play speech pattern
  for (let i = 0; i < speechPattern.length; i++) {
    if (!isAnimating.value) break

    const animation = speechPattern[i]
    playAnimation(animation)

    // Add some randomness to timing
    const variance = speechSpeed.value * 0.3
    const delay = speechSpeed.value + (Math.random() - 0.5) * variance

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  // Return to idle after speech
  if (isAnimating.value) {
    playAnimation('loop_idle')
    isAnimating.value = false
  }
}

const stopSpeaking = () => {
  console.log('🛑 Stopping speech')
  isAnimating.value = false
  if (speechTimeout) {
    clearTimeout(speechTimeout)
    speechTimeout = null
  }
  playAnimation('loop_idle')
}

const testSpeech = () => {
  speak('Hello! How are you doing today? This is a test of the speech animation system!')
}

const playRandomAnimation = () => {
  const randomAnim = getRandomFromGroup(lipGroups.vowels.concat(lipGroups.consonants))
  playAnimation(randomAnim)
}

const toggleSpeed = () => {
  speechSpeed.value = speechSpeed.value === 80 ? 50 : speechSpeed.value === 50 ? 120 : 80
}

// Watchers
watch(
  () => props.currentText,
  (newText) => {
    if (newText && props.isSpeaking) {
      speak(newText)
    }
  },
)

watch(
  () => props.isSpeaking,
  (speaking) => {
    if (!speaking) {
      stopSpeaking()
    }
  },
)

onMounted(() => {
  if (playerContainer.value) {
    spinePlayer.value = new spine.SpinePlayer(playerContainer.value, {
      skeleton: '/assets/Baby_Friend42.json',
      atlas: '/assets/Baby_Friend42.atlas',
      animation: 'loop_walking',
      backgroundColor: '#00000000',
      alpha: true,
      showControls: false,
      preserveDrawingBuffer: false,
      success: () => {
        console.log('✅ Spine animation loaded successfully')
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

defineExpose({
  speak,
  stopSpeaking,
  playAnimation,
})
</script>

<style lang="scss" scoped>
.spine-character {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__debug {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 11px;
    z-index: 10;
    min-width: 200px;

    p {
      margin: 0 0 4px 0;
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
