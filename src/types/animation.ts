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

export interface AtlasFrame {
  x: number
  y: number
  w: number
  h: number
}

export interface AnimationSequence {
  name: string
  frames: string[]
  frameRate: number
  loop: boolean
}
