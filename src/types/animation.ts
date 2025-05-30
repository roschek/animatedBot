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

export interface AtlasData {
  frames: Record<
    string,
    {
      frame: { x: number; y: number; w: number; h: number }
      rotated: boolean
      trimmed: boolean
      spriteSourceSize: { x: number; y: number; w: number; h: number }
      sourceSize: { w: number; h: number }
    }
  >
  meta: {
    app: string
    version: string
    image: string
    format: string
    size: { w: number; h: number }
    scale: string
  }
}

export interface AnimationSequence {
  name: string
  frames: string[]
  frameRate: number
  loop: boolean
}

export interface CharacterAnimations {
  [key: string]: AnimationSequence
}
