<template>
  <div class="animated-character">
    <div class="animated-character__container">
      <!-- Пока используем placeholder, дальше добавим PixiJS рендер -->
      <div class="animated-character__placeholder" v-if="!isLoaded">
        <div class="animated-character__loading">
          <div class="animated-character__spinner"></div>
          <p>Loading character...</p>
        </div>
      </div>
      
      <!-- Здесь будет canvas для анимации -->
      <canvas 
        ref="canvasRef"
        class="animated-character__canvas"
        :class="{ 'animated-character__canvas--hidden': !isLoaded }"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      
      <!-- Debug info (только в development) -->
      <div class="animated-character__debug" v-if="showDebug">
        <p>Animation: {{ currentAnimation }}</p>
        <p>State: {{ characterState }}</p>
        <p>Speaking: {{ isSpeaking }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { AnimatedCharacterProps } from '@/types/animation'

const props = withDefaults(defineProps<AnimatedCharacterProps>(), {
  currentAnimation: 'idle',
  isSpeaking: false,
  characterState: 'idle',
  scale: 1,
  showDebug: false
})

// Reactive data
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isLoaded = ref(false)
const canvasWidth = ref(400)
const canvasHeight = ref(400)

// Character animation logic will be here
const initializeCharacter = async () => {
  // TODO: Initialize PixiJS and load atlas
  console.log('Initializing character...')
  
  // Simulate loading
  setTimeout(() => {
    isLoaded.value = true
    console.log('Character loaded!')
  }, 1000)
}

const playAnimation = (animationName: string) => {
  // TODO: Play specific animation
  console.log('Playing animation:', animationName)
}

// Watch for prop changes
watch(() => props.currentAnimation, (newAnimation) => {
  if (isLoaded.value) {
    playAnimation(newAnimation)
  }
})

watch(() => props.isSpeaking, (speaking) => {
  if (isLoaded.value) {
    playAnimation(speaking ? 'talking' : 'idle')
  }
})

// Lifecycle
onMounted(() => {
  initializeCharacter()
})

onUnmounted(() => {
  // TODO: Cleanup PixiJS resources
  console.log('Cleaning up character resources')
})

// Expose methods for parent component
defineExpose({
  playAnimation,
  isLoaded
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

  &__placeholder {
    @include flex-center;
    @include flex-column;
    gap: 16px;
    width: 100%;
    height: 100%;
    min-height: 200px;
  }

  &__loading {
    @include flex-center;
    @include flex-column;
    gap: 12px;
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

  &__canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity $transition-base;
    
    &--hidden {
      opacity: 0;
      pointer-events: none;
    }
  }

  &__debug {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-family: monospace;
    
    p {
      margin: 0 0 4px 0;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  @include mobile {
    &__container {
      max-width: 300px;
      max-height: 300px;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>