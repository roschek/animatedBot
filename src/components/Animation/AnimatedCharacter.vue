<template>
  <div ref="playerContainer" class="spine-player" style="width: 600px; height: 800px"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import '@esotericsoftware/spine-player/dist/spine-player.css'
import * as spine from '@esotericsoftware/spine-player'

const playerContainer = ref(null)
const animationList = [
  'blink',
  'brows_down',
  'brows_up',
  'eye_left',
  'eye_right',
  'eyes_closed',
  'head_down',
  'head_up',
  'idle',
  'lips_a_big',
  'lips_a_small',
  'lips_e',
  'lips_i',
  'lips_o',
  'lips_u',
  'mouth_closed',
  'mouth_open',
]
onMounted(() => {
  if (playerContainer.value) {
    new spine.SpinePlayer(playerContainer.value, {
      skeleton: '/assets/Baby_Friend42.json',
      atlas: '/assets/Baby_Friend42.atlas',
      animation: 'lips_a_big',
      backgroundColor: '#00000000',
      alpha: true,
      showControls: false,
      preserveDrawingBuffer: false,
      success: () => {
        console.log('Spine animation loaded')
      },
      error: (err) => {
        console.error('Failed to load animation', err)
      },
    })
  }
})
</script>
