<template>
  <div class="animated-character">
    <div class="animated-character__container">
      <!-- Loading state -->
      <div class="animated-character__loading" v-if="!isLoaded && !hasError">
        <div class="animated-character__spinner"></div>
        <p>Loading character...</p>
        <!-- Debug info -->
        <div class="animated-character__debug" v-if="showDebug && isLoaded">
          <p>Animation: {{ currentAnimation }}</p>
          <p>State: {{ characterState }}</p>
          <p>Speaking: {{ isSpeaking }}</p>
          <p>Frames loaded: {{ frameCount }}</p>
          <p>Current frame: {{ currentFrameName }}</p>
          <p>Mode: {{ compositeMode ? 'Composite' : 'Single' }}</p>
          <button @click="testAnimation" class="animated-character__test-btn">
            Test Animation
          </button>
          <button @click="toggleMode" class="animated-character__test-btn">Toggle Mode</button>
          <button @click="showBodyFrame" class="animated-character__test-btn">Single Body</button>
          <button @click="showNextFrame" class="animated-character__test-btn">Next Frame</button>
        </div>
      </div>

      <!-- Error state -->
      <div class="animated-character__error" v-if="hasError">
        <div class="animated-character__error-icon">❌</div>
        <p>Failed to load character</p>
        <button @click="retryLoad" class="animated-character__retry">Retry</button>
      </div>

      <!-- PixiJS Canvas -->
      <canvas
        ref="canvasRef"
        class="animated-character__canvas"
        :class="{ 'animated-character__canvas--hidden': !isLoaded || hasError }"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Application, Container, Sprite, Assets } from 'pixi.js'
import { loadAtlas, createPixiTextures, groupFramesByPrefix } from '@/utils/atlasLoader'
import type { AnimatedCharacterProps } from '@/types/animation'
import type { Texture } from 'pixi.js'

const props = withDefaults(defineProps<AnimatedCharacterProps>(), {
  currentAnimation: 'idle',
  isSpeaking: false,
  characterState: 'idle',
  scale: 1,
  showDebug: false,
})

// Reactive data
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isLoaded = ref(false)
const hasError = ref(false)
const frameCount = ref(0)
const currentFrameName = ref('')
const currentFrameIndex = ref(0)
const compositeMode = ref(true) // По умолчанию составной режим

// PixiJS objects
let app: Application | null = null
let character: Container | null = null
let textures: Record<string, Texture> = {}
let frameGroups: Record<string, string[]> = {}

// Initialize PixiJS and load character
const initializeCharacter = async () => {
  try {
    hasError.value = false

    if (!canvasRef.value) {
      throw new Error('Canvas element not found')
    }

    // Create PixiJS application (v8 syntax)
    app = new Application()
    await app.init({
      canvas: canvasRef.value,
      width: 400,
      height: 400,
      backgroundColor: 0xffffff,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    })

    // Load atlas
    console.log('Loading atlas...')
    const atlasInfo = await loadAtlas('/src/assets/animations/Baby_Friend.atlas')
    console.log('Atlas loaded:', atlasInfo)

    // Load texture using Assets API (PixiJS v8)
    const imagePath = '/src/assets/animations/' + atlasInfo.imagePath
    const baseTexture = await Assets.load(imagePath)
    console.log('Texture loaded:', baseTexture)

    // Create textures from atlas
    textures = createPixiTextures(baseTexture, atlasInfo)
    frameCount.value = Object.keys(textures).length
    console.log('Textures created:', Object.keys(textures).length)

    // Group frames for animations
    frameGroups = groupFramesByPrefix(atlasInfo.frames)
    console.log('Frame groups:', frameGroups)

    // Create character container
    character = new Container()
    app.stage.addChild(character)

    // Center character
    character.x = app.screen.width / 2
    character.y = app.screen.height / 2
    character.scale.set(props.scale)

    // Show first frame or idle animation
    showIdleFrame()

    isLoaded.value = true
    console.log('Character initialized successfully!')
  } catch (error) {
    console.error('Failed to initialize character:', error)
    hasError.value = true
  }
}

const showIdleFrame = () => {
  if (!character || !textures) return

  // Clear existing sprites
  character.removeChildren()

  // Ищем ОДИН цельный фрейм персонажа, а не составляем из частей
  const singleFramePriority = [
    'bb34_belly', // Полное тело персонажа (другая версия)
    'BB_body', // Основное тело
    'BB_face', // Лицо
    'bb34_belly_light', // Вариант тела
    ...Object.keys(textures).filter((name) => name.includes('bb34_') && name.includes('belly')),
    ...Object.keys(textures).filter((name) => name.includes('body') || name.includes('face')),
    ...Object.keys(textures).filter(
      (name) =>
        !name.includes('arm') &&
        !name.includes('leg') &&
        !name.includes('hand') &&
        !name.includes('foot') &&
        !name.includes('eye') &&
        !name.includes('mouth') &&
        !name.includes('ear') &&
        !name.includes('nose') &&
        !name.includes('hair'),
    ),
  ]

  // Remove duplicates
  const framesToTry = [...new Set(singleFramePriority)]

  console.log('🔍 Trying frames in order:', framesToTry.slice(0, 10))

  if (framesToTry.length > 0) {
    const frameName = framesToTry[currentFrameIndex.value % framesToTry.length]
    const texture = textures[frameName]

    if (texture) {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5, 0.5)
      character.addChild(sprite)
      currentFrameName.value = frameName
      console.log(
        '✅ Showing SINGLE frame:',
        frameName,
        'Size:',
        texture.width,
        'x',
        texture.height,
      )
    }
  }
}

const toggleMode = () => {
  compositeMode.value = !compositeMode.value
  console.log('🔄 Switched to', compositeMode.value ? 'Composite' : 'Single', 'mode')
  showIdleFrame()
}

const showNextFrame = () => {
  currentFrameIndex.value++
  showIdleFrame()
}

const showBodyFrame = () => {
  compositeMode.value = false // Переключаемся в простой режим
  console.log('🎯 Switching to single body frame mode')
  showIdleFrame()
}

const playAnimation = (animationName: string) => {
  console.log(
    '🎭 Playing animation:',
    animationName,
    'Mode:',
    compositeMode.value ? 'Composite' : 'Single',
  )

  if (!character || !textures) return

  if (compositeMode.value) {
    // В составном режиме меняем только определенные части
    character.removeChildren()

    // Базовые части остаются
    const baseParts = ['BB_body', 'BB_hair', 'BB_arm1', 'BB_arm2', 'BB_leg1', 'BB_leg2']
    baseParts.forEach((partName) => {
      if (textures[partName]) {
        const sprite = new Sprite(textures[partName])
        sprite.anchor.set(0.5, 0.5)

        // Позиционирование
        switch (partName) {
          case 'BB_hair':
            sprite.y = -40
            break
          case 'BB_arm1':
            sprite.x = -30
            sprite.y = 10
            break
          case 'BB_arm2':
            sprite.x = 30
            sprite.y = 10
            break
          case 'BB_leg1':
            sprite.x = -15
            sprite.y = 40
            break
          case 'BB_leg2':
            sprite.x = 15
            sprite.y = 40
            break
        }

        character.addChild(sprite)
      }
    })

    // Меняем лицо в зависимости от анимации
    let faceFrame = 'BB_face'
    let eyeFrame = 'BB_eye1'
    let mouthFrame = 'BB_mouth1'

    switch (animationName) {
      case 'talking':
        mouthFrame = 'BB_mouth1' // Открытый рот
        faceFrame = 'BB_face'
        break
      case 'thinking':
        eyeFrame = 'BB_pup1' // Другие глаза
        mouthFrame = 'BB_mouth1'
        break
      case 'happy':
        faceFrame = 'BB_face'
        eyeFrame = 'BB_eye1'
        break
      case 'waving':
        // Машет рукой - можем сменить позицию руки
        break
    }

    // Добавляем лицо
    if (textures[faceFrame]) {
      const face = new Sprite(textures[faceFrame])
      face.anchor.set(0.5, 0.5)
      face.y = -20
      character.addChild(face)
    }

    // Добавляем глаза
    if (textures[eyeFrame]) {
      const eye1 = new Sprite(textures[eyeFrame])
      eye1.anchor.set(0.5, 0.5)
      eye1.x = -15
      eye1.y = -25
      character.addChild(eye1)

      const eye2 = new Sprite(textures['BB_eye2'] || eyeFrame)
      eye2.anchor.set(0.5, 0.5)
      eye2.x = 15
      eye2.y = -25
      character.addChild(eye2)
    }

    // Добавляем рот
    if (textures[mouthFrame]) {
      const mouth = new Sprite(textures[mouthFrame])
      mouth.anchor.set(0.5, 0.5)
      mouth.y = -5
      character.addChild(mouth)
    }

    // Добавляем нос
    if (textures['BB_nose']) {
      const nose = new Sprite(textures['BB_nose'])
      nose.anchor.set(0.5, 0.5)
      nose.y = -15
      character.addChild(nose)
    }

    currentFrameName.value = `${animationName} composite`
  } else {
    // Простой режим - одна часть
    character.removeChildren()

    let framesToShow: string[] = []

    switch (animationName) {
      case 'talking':
        framesToShow = ['BB_mouth1', 'BB_face']
        break
      case 'thinking':
        framesToShow = ['BB_face', 'BB_head']
        break
      case 'happy':
        framesToShow = ['BB_face']
        break
      default:
        framesToShow = ['BB_body', 'BB_face']
    }

    const frameName = framesToShow.find((name) => textures[name]) || 'BB_body'

    if (textures[frameName]) {
      const sprite = new Sprite(textures[frameName])
      sprite.anchor.set(0.5, 0.5)
      character.addChild(sprite)
      currentFrameName.value = frameName
    }
  }
}

const testAnimation = () => {
  const animations = ['idle', 'talking', 'thinking', 'happy', 'waving', 'surprised']
  const randomAnim = animations[Math.floor(Math.random() * animations.length)]
  console.log('🎲 Testing random animation:', randomAnim)
  playAnimation(randomAnim)

  // Вернуться к idle через 2 секунды
  setTimeout(() => {
    playAnimation('idle')
  }, 2000)
}

const retryLoad = () => {
  hasError.value = false
  isLoaded.value = false
  initializeCharacter()
}

// Watch for prop changes
watch(
  () => props.currentAnimation,
  (newAnimation) => {
    if (isLoaded.value) {
      playAnimation(newAnimation)
    }
  },
)

watch(
  () => props.isSpeaking,
  (speaking) => {
    if (isLoaded.value) {
      playAnimation(speaking ? 'talking' : 'idle')
    }
  },
)

// Lifecycle
onMounted(() => {
  initializeCharacter()
})

onUnmounted(() => {
  if (app) {
    app.destroy(true)
    app = null
  }
})

// Expose methods
defineExpose({
  playAnimation,
  isLoaded,
  retryLoad,
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/base/variables' as *;
@use '@/assets/styles/base/mixins' as *;

.animated-character {
  width: 100%;
  height: 100%;
  @include flex-center;

  &__container {
    position: relative;
    width: 100%;
    height: 100%;
    max-width: 400px;
    max-height: 400px;
    @include flex-center;
  }

  &__loading {
    @include flex-center;
    @include flex-column;
    gap: 16px;
    color: $text-secondary;
  }

  &__spinner {
    width: 40px;
    height: 40px;
    border: 4px solid $border-light;
    border-top: 4px solid $primary-color;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  &__error {
    @include flex-center;
    @include flex-column;
    gap: 16px;
    color: $text-secondary;
    text-align: center;
  }

  &__error-icon {
    font-size: 3rem;
  }

  &__retry {
    @include button-primary;
    padding: 8px 16px;
    font-size: 0.9rem;
  }

  &__canvas {
    width: 100%;
    height: 100%;
    max-width: 400px;
    max-height: 400px;
    transition: opacity $transition-base;

    &--hidden {
      opacity: 0;
      pointer-events: none;
      position: absolute;
    }
  }

  &__debug {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.7rem;
    font-family: monospace;
    min-width: 200px;
    max-width: 300px;
    word-wrap: break-word;

    p {
      margin: 0 0 4px 0;

      &:last-child {
        margin-bottom: 8px;
      }
    }
  }

  &__test-btn {
    @include button-base;
    padding: 4px 8px;
    background: $primary-color;
    color: white;
    font-size: 0.65rem;
    margin: 2px;
    display: inline-block;
  }

  @include mobile {
    &__container {
      max-width: 300px;
      max-height: 300px;
    }

    &__canvas {
      max-width: 300px;
      max-height: 300px;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
