import { ref, computed, onMounted } from 'vue'

export type TTSVoice =
  | 'rachel'
  | 'drew'
  | 'clyde'
  | 'paul'
  | 'domi'
  | 'dave'
  | 'fin'
  | 'sarah'
  | 'antoni'
  | 'thomas'
  | 'charlie'
  | 'george'
  | 'callum'
  | 'liam'
  | 'charlotte'
  | 'alice'
  | 'matilda'
  | 'james'

export interface TTSSettings {
  stability?: number // 0-1, higher = more stable but less expressive
  similarity_boost?: number // 0-1, higher = more similar to original voice
  style?: number // 0-1, style exaggeration
  use_speaker_boost?: boolean
}

export interface TTSState {
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  currentAudio: HTMLAudioElement | null
  voice: TTSVoice
  settings: TTSSettings
}

export const VOICE_DESCRIPTIONS = {
  rachel: 'Rachel - Дружелюбная американка',
  drew: 'Drew - Мужской американский',
  clyde: 'Clyde - Средний американский',
  paul: 'Paul - Глубокий мужской',
  domi: 'Domi - Молодая американка',
  dave: 'Dave - Британский мужской',
  fin: 'Fin - Ирландский акцент',
  sarah: 'Sarah - Профессиональная',
  antoni: 'Antoni - Теплый мужской',
  thomas: 'Thomas - Четкий американский',
  charlie: 'Charlie - Австралийский',
  george: 'George - Элегантный британский',
  callum: 'Callum - Энергичный американский',
  liam: 'Liam - Молодой американский',
  charlotte: 'Charlotte - Умная американка',
  alice: 'Alice - Мягкая британка',
  matilda: 'Matilda - Выразительная американка',
  james: 'James - Уверенный австралиец',
} as const

export function useTTS() {
  // State
  const state = ref<TTSState>({
    isPlaying: false,
    isLoading: false,
    error: null,
    currentAudio: null,
    voice: 'alice',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  })

  onMounted(() => {
    const savedVoice = localStorage.getItem('tts-voice')
    const savedSettings = localStorage.getItem('tts-settings')

    if (savedVoice && savedVoice in VOICE_DESCRIPTIONS) {
      state.value.voice = savedVoice as TTSVoice
    }

    if (savedSettings) {
      try {
        state.value.settings = { ...state.value.settings, ...JSON.parse(savedSettings) }
      } catch (e) {
        console.warn('Failed to parse saved TTS settings' + e)
      }
    }
  })

  const audioCache = new Map<string, Blob>()

  const canSpeak = computed(() => !state.value.isLoading && !state.value.isPlaying)
  const voiceOptions = computed(() =>
    Object.entries(VOICE_DESCRIPTIONS).map(([key, description]) => ({
      value: key as TTSVoice,
      label: description,
    })),
  )

  const getCacheKey = (text: string, voice: TTSVoice, settings: TTSSettings): string => {
    return `${text}_${voice}_${JSON.stringify(settings)}`
  }

  const speak = async (text: string): Promise<void> => {
    if (!text.trim()) {
      throw new Error('Текст не может быть пустым')
    }

    stop()

    state.value.isLoading = true
    state.value.error = null

    try {
      const cacheKey = getCacheKey(text, state.value.voice, state.value.settings)
      let audioBlob = audioCache.get(cacheKey)

      if (!audioBlob) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            voice: state.value.voice,
            settings: state.value.settings,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        audioBlob = await response.blob()

        if (audioCache.size > 50) {
          const firstKey = audioCache.keys().next().value
          if (typeof firstKey === 'string') {
            audioCache.delete(firstKey)
          }
        }
        audioCache.set(cacheKey, audioBlob)
      }

      const audio = new Audio(URL.createObjectURL(audioBlob))
      state.value.currentAudio = audio

      audio.onplay = () => {
        state.value.isPlaying = true
        state.value.isLoading = false
      }

      audio.onended = () => {
        state.value.isPlaying = false
        cleanup()
      }

      audio.onerror = () => {
        state.value.error = 'Error playing audio'
        state.value.isPlaying = false
        state.value.isLoading = false
        cleanup()
      }

      await audio.play()
    } catch (error) {
      state.value.error = error instanceof Error ? error.message : 'unknown error'
      state.value.isLoading = false
      state.value.isPlaying = false
      console.error('TTS Error:', error)
      throw error
    }
  }

  const stop = (): void => {
    if (state.value.currentAudio) {
      state.value.currentAudio.pause()
      state.value.currentAudio.currentTime = 0
      cleanup()
    }
    state.value.isPlaying = false
  }

  const toggle = (): void => {
    if (!state.value.currentAudio) return

    if (state.value.isPlaying) {
      state.value.currentAudio.pause()
      state.value.isPlaying = false
    } else {
      state.value.currentAudio.play()
      state.value.isPlaying = true
    }
  }

  const cleanup = (): void => {
    if (state.value.currentAudio) {
      URL.revokeObjectURL(state.value.currentAudio.src)
      state.value.currentAudio = null
    }
  }

  const setVoice = (voice: TTSVoice): void => {
    state.value.voice = voice
  }

  const updateSettings = (newSettings: Partial<TTSSettings>): void => {
    state.value.settings = { ...state.value.settings, ...newSettings }
  }

  const clearError = (): void => {
    state.value.error = null
  }

  const preloadAudio = async (texts: string[]): Promise<void> => {
    const promises = texts.map(async (text) => {
      try {
        const cacheKey = getCacheKey(text, state.value.voice, state.value.settings)
        if (!audioCache.has(cacheKey)) {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              voice: state.value.voice,
              settings: state.value.settings,
            }),
          })
          if (response.ok) {
            const blob = await response.blob()
            audioCache.set(cacheKey, blob)
          }
        }
      } catch (error) {
        console.warn('Preload failed for:', text, error)
      }
    })

    await Promise.allSettled(promises)
  }

  const destroy = (): void => {
    stop()
    audioCache.clear()
  }

  return {
    // State
    isPlaying: computed(() => state.value.isPlaying),
    isLoading: computed(() => state.value.isLoading),
    error: computed(() => state.value.error),
    voice: computed(() => state.value.voice),
    settings: computed(() => state.value.settings),
    canSpeak,
    voiceOptions,

    // Actions
    speak,
    stop,
    toggle,
    setVoice,
    updateSettings,
    clearError,
    preloadAudio,
    destroy,
  }
}
