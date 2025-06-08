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
const internalState = ref<'idle' | 'thinking' | 'speaking'>('idle')

const isSpeechEnabled = ref(true)
let currentUtterance: SpeechSynthesisUtterance | null = null

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

//speech
const speakText = (audio: HTMLAudioElement) => {
  if (!isSpeechEnabled.value) return

  audio.onended = () => {
    currentUtterance = null
  }

  audio.onerror = () => {
    currentUtterance = null
    console.error('Audio playback failed')
  }

  audio.play()
}

const stopSpeech = () => {
  if (currentUtterance) {
    if (currentUtterance instanceof Audio) {
      currentUtterance.pause()
    } else if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }
  }
  currentUtterance = null
}

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

  const sentences = text.split(/([.!?;:])/g).filter((sentence) => sentence.trim())

  sentences.forEach((sentence) => {
    if (sentence.includes('!')) {
      pattern.push('brows_happy')
    } else if (sentence.includes('?')) {
      pattern.push('brows_default')
    } else if (sentence.includes('sad') || sentence.includes('sorry')) {
      pattern.push('brows_sad')
    }
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
const parseEmotions = (
  text: string,
): { cleanText: string; emotions: Array<{ position: number; emotion: string }> } => {
  const emotions: Array<{ position: number; emotion: string }> = []
  let cleanText = text
  let offset = 0

  const emotionRegex = /\[EMOTION:(\w+)\]/g
  let match

  while ((match = emotionRegex.exec(text)) !== null) {
    const emotion = match[1]
    const position = match.index - offset

    emotions.push({ position, emotion })

    cleanText = cleanText.replace(match[0], '')
    offset += match[0].length
  }

  return { cleanText, emotions }
}
const playEmotion = (emotion: string) => {
  switch (emotion.toLowerCase()) {
    case 'happy':
      playFaceAnimation('brows_happy')
      setTimeout(() => playFaceAnimation('lips_default_smile'), 500)
      break
    case 'sad':
      playFaceAnimation('brows_sad')
      setTimeout(() => playFaceAnimation('lips_default_smile'), 800)
      break
    case 'thinking':
      playFaceAnimation('brows_default')
      playFaceAnimation('eyelids_upper_lowered')
      break
    case 'surprised':
      playFaceAnimation('brows_happy')
      playFaceAnimation('eyelids_bottop_closed')
      break
    case 'waving':
      playFaceAnimation('brows_happy')
      break
    case 'neutral':
      clearFaceAnimation()
      break
    default:
      console.log('Unknown emotion:', emotion)
  }
}
const loadAudio = async (text: string): Promise<HTMLAudioElement | null> => {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) throw new Error('TTS failed')

    const audioBlob = await response.blob()
    const audio = new Audio(URL.createObjectURL(audioBlob))

    return new Promise((resolve, reject) => {
      audio.oncanplaythrough = () => resolve(audio)
      audio.onerror = () => reject(new Error('Audio load failed'))
      audio.load()
    })
  } catch (error) {
    console.error('TTS loading error:', error)
    return null
  }
}
const speak = async (text: string) => {
  if (!text.trim()) return

  const { cleanText, emotions } = parseEmotions(text)

  const audio = await loadAudio(cleanText)
  if (!audio) return

  // Ждем загрузки метаданных аудио чтобы получить длительность
  await new Promise((resolve) => {
    if (audio.readyState >= 1) {
      resolve(undefined)
    } else {
      audio.onloadedmetadata = () => resolve(undefined)
    }
  })

  const audioDuration = audio.duration * 1000 // в миллисекундах
  console.log('🔊 Audio duration:', audioDuration, 'ms')

  isAnimating.value = true
  internalState.value = 'speaking'

  const speechPattern = textToSpeechPattern(cleanText)
  const totalFrames = speechPattern.length

  const frameDelay = Math.max(50, audioDuration / totalFrames)
  console.log('🎭 Frame delay calculated:', frameDelay, 'ms')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentUtterance = audio as any

  audio.onended = () => {
    console.log('🔊 Audio ended, stopping animation')
    isAnimating.value = false
    internalState.value = 'idle'
    clearFaceAnimation()
    currentUtterance = null
  }

  audio.onerror = () => {
    console.error('🔊 Audio error, stopping animation')
    isAnimating.value = false
    internalState.value = 'idle'
    clearFaceAnimation()
    currentUtterance = null
  }

  const audioStartPromise = new Promise<void>((resolve) => {
    const onPlaying = () => {
      console.log('🔊 Audio actually started playing')
      audio.removeEventListener('playing', onPlaying)
      resolve()
    }
    audio.addEventListener('playing', onPlaying)
  })

  console.log('🔊 Starting audio...')
  audio.play()

  await audioStartPromise
  console.log('🎭 Starting animation synchronized with audio')

  const startTime = Date.now()

  let currentPosition = 0
  for (let i = 0; i < speechPattern.length; i++) {
    if (!isAnimating.value || !audio || audio.ended || audio.paused) break

    const expectedTime = i * frameDelay
    const elapsedTime = Date.now() - startTime

    if (elapsedTime < expectedTime) {
      await new Promise((resolve) => setTimeout(resolve, expectedTime - elapsedTime))
    }

    const animation = speechPattern[i]
    const emotion = emotions.find((e) => Math.abs(e.position - currentPosition) < 5)

    if (emotion) {
      playEmotion(emotion.emotion)
      emotions.splice(emotions.indexOf(emotion), 1)
    }

    playFaceAnimation(animation)
    currentPosition += 1
  }

  if (isAnimating.value && !audio.ended) {
    console.log('🎭 Animation finished, waiting for audio to end')
  }
}

const stopSpeaking = () => {
  isAnimating.value = false
  internalState.value = 'idle'
  stopSpeech()
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
      premultipliedAlpha: false,

      success: () => {
        playBaseAnimation('loop_idle', true)
        clearFaceAnimation()
        speechSynthesis.onvoiceschanged = () => {
          console.log('🎤 Voices loaded')
        }
      },
      error: (err) => {
        console.error('Failed to load Spine animation:', err)
      },
    })
  }
})

onUnmounted(() => {
  stopSpeaking()
  stopSpeech()
  if (loadingTimeout) clearTimeout(loadingTimeout)
  if (respondingTimeout) clearTimeout(respondingTimeout)

  if (spinePlayer.value) spinePlayer.value.dispose()
})

defineExpose({
  speak,
  stopSpeaking,
  speakText,
  stopSpeech,
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
