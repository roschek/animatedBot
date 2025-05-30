import { ref, computed } from 'vue'
import type { AnimationName, CharacterState } from '@/types/animation'

export function useAnimation() {
  // State
  const currentAnimation = ref<AnimationName>('idle')
  const characterState = ref<CharacterState>('idle')
  const isAnimating = ref(false)

  // Computed
  const canChangeAnimation = computed(() => !isAnimating.value)

  // Animation mappings based on message content/type
  const getAnimationForMessage = (content: string): AnimationName => {
    const lowerContent = content.toLowerCase()

    if (lowerContent.includes('hello') || lowerContent.includes('hi')) {
      return 'waving'
    }
    if (lowerContent.includes('?')) {
      return 'thinking'
    }
    if (
      lowerContent.includes('!') ||
      lowerContent.includes('great') ||
      lowerContent.includes('awesome')
    ) {
      return 'happy'
    }
    if (lowerContent.includes('sad') || lowerContent.includes('sorry')) {
      return 'sad'
    }
    if (lowerContent.includes('wow') || lowerContent.includes('amazing')) {
      return 'surprised'
    }

    return 'talking'
  }

  // Actions
  const playAnimation = (animation: AnimationName, duration?: number) => {
    if (!canChangeAnimation.value) return

    isAnimating.value = true
    currentAnimation.value = animation

    if (duration) {
      setTimeout(() => {
        isAnimating.value = false
        returnToIdle()
      }, duration)
    } else {
      isAnimating.value = false
    }
  }

  const returnToIdle = () => {
    currentAnimation.value = 'idle'
    characterState.value = 'idle'
  }

  const setCharacterState = (state: CharacterState) => {
    characterState.value = state

    // Auto-set appropriate animation for state
    switch (state) {
      case 'speaking':
        currentAnimation.value = 'talking'
        break
      case 'thinking':
        currentAnimation.value = 'thinking'
        break
      case 'listening':
        currentAnimation.value = 'idle'
        break
      default:
        currentAnimation.value = 'idle'
    }
  }

  const handleMessageSent = (message: string) => {
    console.log('Message sent:', message)
    setCharacterState('listening')
    // Brief pause, then thinking
    setTimeout(() => {
      setCharacterState('thinking')
    }, 500)
  }

  const handleResponseStart = () => {
    setCharacterState('thinking')
  }

  const handleResponseReceived = (responseContent: string) => {
    const animation = getAnimationForMessage(responseContent)
    setCharacterState('speaking')

    // Play specific animation for 2 seconds, then return to talking
    if (animation !== 'talking') {
      playAnimation(animation, 2000)
      setTimeout(() => {
        currentAnimation.value = 'talking'
      }, 2000)
    }

    // Return to idle after response
    setTimeout(() => {
      returnToIdle()
    }, 4000)
  }

  return {
    // State
    currentAnimation,
    characterState,
    isAnimating,

    // Computed
    canChangeAnimation,

    // Actions
    playAnimation,
    returnToIdle,
    setCharacterState,
    getAnimationForMessage,
    handleMessageSent,
    handleResponseStart,
    handleResponseReceived,
  }
}
