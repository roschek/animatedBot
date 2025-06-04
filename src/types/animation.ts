// src/types/animation.ts
export type AnimationName =
  | 'idle'
  | 'talking'
  | 'thinking'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'waving'

export type CharacterState = 'idle' | 'speaking' | 'listening' | 'thinking'

export interface AnimatedCharacterProps {
  currentAnimation?: AnimationName
  isSpeaking?: boolean
  characterState?: CharacterState
  scale?: number
  showDebug?: boolean
}
