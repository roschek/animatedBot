<template>
  <div class="spine-character">
    <div ref="playerContainer" class="spine-character__player" :style="containerStyles"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import '@esotericsoftware/spine-player/dist/spine-player.css'
import * as spine from '@esotericsoftware/spine-player'


interface Props {
  scale?: number
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1,
})

const chatStore = useChatStore()
const { isLoading, isResponding, currentResponseText } = storeToRefs(chatStore)


const playerContainer = ref<HTMLElement | null>(null)
const spinePlayer = ref<spine.SpinePlayer | null>(null)
const isAnimating = ref(false)
const speechSpeed = ref(120)
const internalState = ref<'idle' | 'thinking' | 'speaking'>('idle')

let loadingTimeout: number | null = null
let respondingTimeout: number | null = null

const BASE_TRACK = 0
const FACE_TRACK = 1

const baseAnimations = ['loop_idle', 'loop_walking']
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

const playBaseAnimation = (animationName: string, loop: boolean = true) => {
  if (!spinePlayer.value?.animationState || !baseAnimations.includes(animationName)) return

  spinePlayer.value.animationState.setAnimation(BASE_TRACK, animationName, loop)
}

const playFaceAnimation = (animationName: string) => {
  if (!spinePlayer.value?.animationState) return

  spinePlayer.value.animationState.setAnimation(FACE_TRACK, animationName, false)
}

const clearFaceAnimation = () => {
  if (!spinePlayer.value?.animationState) return

  spinePlayer.value.animationState.clearTrack(FACE_TRACK)
}

const textToSpeechPattern = (text: string): string[] => {
  const pattern: string[] = []

  
  if (text.includes('!')) pattern.push('brows_happy')
  else if (text.includes('?')) pattern.push('brows_default')
  else if (text.includes('sad') || text.includes('sorry')) pattern.push('brows_sad')

  
  const sentences = text.split(/([.!?;:])/g).filter((sentence) => sentence.trim())

  sentences.forEach((sentence) => {
    if (/^[.!?;:]+$/.test(sentence.trim())) {
      pattern.push('lips_default_smile', 'lips_default_smile') 
      return
    }

    const words = sentence
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)

    words.forEach((word, wordIndex) => {
      if (wordIndex > 0) pattern.push('lips_default_smile') 

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

const speak = async (text: string) => {
  if (!text.trim()) return

  isAnimating.value = true
  internalState.value = 'speaking'

  const speechPattern = textToSpeechPattern(text)

  for (let i = 0; i < speechPattern.length; i++) {
    if (!isAnimating.value) break

    const animation = speechPattern[i]
    playFaceAnimation(animation)

    let delay = speechSpeed.value
    if (animation === 'lips_default_smile') delay *= 1.5
    else if (animation.includes('brows_')) delay *= 2

    delay += (Math.random() - 0.5) * delay * 0.2 

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  if (isAnimating.value) {
    isAnimating.value = false
    internalState.value = 'idle'
    clearFaceAnimation()
  }
}

const stopSpeaking = () => {
  isAnimating.value = false
  internalState.value = 'idle'
  clearFaceAnimation()
}

const startThinking = () => {
  internalState.value = 'thinking'
  playBaseAnimation('loop_idle', true)
}

const stopThinking = () => {
  if (internalState.value === 'thinking' && !isAnimating.value) {
    internalState.value = 'idle'
    playBaseAnimation('loop_idle', true)
  } else if (internalState.value === 'thinking' && isAnimating.value) {
    internalState.value = 'speaking'
    playBaseAnimation('loop_idle', true)
  }
}

// Watchers
watch(isLoading, (loading) => {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }

  if (loading) {
    startThinking()
  } else {
    loadingTimeout = setTimeout(() => {
      if (!isLoading.value) stopThinking()
      loadingTimeout = null
    }, 100)
  }
})

watch(isResponding, (responding) => {
  if (respondingTimeout) {
    clearTimeout(respondingTimeout)
    respondingTimeout = null
  }

  if (!responding) {
    respondingTimeout = setTimeout(() => {
      if (!isResponding.value) stopSpeaking()
      respondingTimeout = null
    }, 300)
  }
})

watch(currentResponseText, async (text) => {
  if (text && isResponding.value) {
    await new Promise((resolve) => setTimeout(resolve, 150))
    if (text && isResponding.value) speak(text)
  }
})

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
        playBaseAnimation('loop_idle', true)
        clearFaceAnimation()
      },
      error: (err) => {
        console.error('Failed to load Spine animation:', err)
      },
    })
  }
})

onUnmounted(() => {
  stopSpeaking()

  if (loadingTimeout) clearTimeout(loadingTimeout)
  if (respondingTimeout) clearTimeout(respondingTimeout)

  if (spinePlayer.value) spinePlayer.value.dispose()
})

defineExpose({
  speak,
  stopSpeaking,
  playBaseAnimation,
  playFaceAnimation,
})
</script>

<style lang="scss" scoped>
.spine-character {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__player {
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
      height: 600px !important;
    }
  }
}
</style>
