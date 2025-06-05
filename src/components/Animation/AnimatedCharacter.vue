<template>
  <div class="spine-character">
    <div ref="playerContainer" class="spine-character__player" :style="containerStyles"></div>

    <div v-if="showDebug" class="spine-character__debug">
      <p>Current: {{ currentAnimation }}</p>
      <p>Speaking: {{ isSpeaking }}</p>
      <p>Queue: {{ animationQueue.length }}</p>
      <button @click="testSpeech" class="debug-btn">Test Speech</button>
      <button @click="playRandomAnimation" class="debug-btn">Random Anim</button>
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
const currentAnimation = ref('loop_idle')
const animationQueue = ref<string[]>([])
const isAnimating = ref(false)

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

const speechAnimations = [
  'lips_a_big',
  'lips_a_small',
  'lips_e',
  'lips_i',
  'lips_o',
  'lips_u',
  'lips_er',
  'lips_m_p_b',
  'lips_t_s_d_c',
  'lips_v_f',
  'lips_default_smile',
]

const containerStyles = computed(() => ({
  width: `${600 * props.scale}px`,
  height: `${800 * props.scale}px`,
  transform: props.scale !== 1 ? `scale(${props.scale})` : undefined,
  transformOrigin: 'center center',
}))

const textToAnimations = (text: string): string[] => {
  const animations: string[] = []
  const words = text.toLowerCase().split(' ')

  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) {
      animations.push('eyelids_closed')
    }

    for (let i = 0; i < word.length; i++) {
      const char = word[i]

      switch (char) {
        case 'a':
          animations.push(Math.random() > 0.5 ? 'lips_a_big' : 'lips_a_small')
          break
        case 'e':
          animations.push('lips_e')
          break
        case 'i':
          animations.push('lips_i')
          break
        case 'o':
          animations.push('lips_o')
          break
        case 'u':
          animations.push('lips_u')
          break
        case 'r':
          animations.push('lips_er')
          break
        case 'm':
        case 'p':
        case 'b':
          animations.push('lips_m_p_b')
          break
        case 't':
        case 's':
        case 'd':
        case 'c':
          animations.push('lips_t_s_d_c')
          break
        case 'v':
        case 'f':
          animations.push('lips_v_f')
          break
        case '?':
          animations.push('brows_default')
          break
        case '!':
          animations.push('brows_happy')
          break
        default:
          if (/[bcdfghjklmnpqrstvwxyz]/.test(char)) {
            animations.push('lips_default_smile')
          }
      }
    }
  })

  // Check for emotional context
  const lowerText = text.toLowerCase()
  if (lowerText.includes('sad') || lowerText.includes('sorry') || lowerText.includes('bad')) {
    animations.unshift('brows_sad')
  } else if (lowerText.includes('angry') || lowerText.includes('mad')) {
    animations.unshift('brows_angry')
  } else if (
    lowerText.includes('happy') ||
    lowerText.includes('great') ||
    lowerText.includes('good')
  ) {
    animations.unshift('brows_happy')
  }

  animations.push('loop_idle')
  return animations
}

const playAnimation = (animationName: string) => {
  if (spinePlayer.value && animationList.includes(animationName)) {
    currentAnimation.value = animationName
    spinePlayer.value.setAnimation(animationName)
  }
}

const playAnimationSequence = async (animations: string[]) => {
  if (isAnimating.value) return

  isAnimating.value = true
  animationQueue.value = [...animations]

  for (const animation of animations) {
    if (!isAnimating.value) break
    console.log('playing animation', animation)
    playAnimation(animation)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  animationQueue.value = []
  isAnimating.value = false
  playAnimation('loop_idle')
}

const speak = (text: string) => {
  if (!text.trim()) return

  const animations = textToAnimations(text)
  playAnimationSequence(animations)
}

const stopSpeaking = () => {
  isAnimating.value = false
  animationQueue.value = []
  playAnimation('loop_idle')
}

const testSpeech = () => {
  speak('Hello! How are you today?')
}

const playRandomAnimation = () => {
  const randomAnim = speechAnimations[Math.floor(Math.random() * speechAnimations.length)]
  playAnimation(randomAnim)
}

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
      animation: 'loop_idle',
      backgroundColor: '#00000000',
      alpha: true,
      showControls: false,
      preserveDrawingBuffer: false,
      success: () => {
        console.log('Spine animation loaded successfully')
      },
      error: (err) => {
        console.error('Failed to load Spine animation:', err)
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
  playAnimationSequence,
})
</script>

<style lang="scss" scoped>
.spine-character {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__player {
    transition: transform 0.3s ease;
  }

  &__debug {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;

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
