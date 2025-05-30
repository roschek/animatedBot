<template>
  <div class="chat-message" :class="messageClasses">
    <div class="chat-message__avatar">
      <span class="chat-message__avatar-icon">
        {{ isUser ? '👤' : '🤖' }}
      </span>
    </div>

    <div class="chat-message__content">
      <div class="chat-message__bubble" :class="bubbleClasses">
        <div v-if="message.isTyping" class="chat-message__typing">
          <span class="chat-message__typing-dot"></span>
          <span class="chat-message__typing-dot"></span>
          <span class="chat-message__typing-dot"></span>
        </div>
        <p v-else class="chat-message__text">{{ message.content }}</p>
      </div>

      <div class="chat-message__meta">
        <span class="chat-message__time">
          {{ formatTime(message.timestamp) }}
        </span>
        <span v-if="isUser" class="chat-message__sender">You</span>
        <span v-else class="chat-message__sender">AI Assistant</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessageProps } from '@/types/chat'

const props = defineProps<ChatMessageProps>()

const isUser = computed((): boolean => props.message.sender === 'user')
const isAssistant = computed((): boolean => props.message.sender === 'assistant')

const messageClasses = computed(() => ({
  'chat-message--user': isUser.value,
  'chat-message--assistant': isAssistant.value,
  'chat-message--typing': props.message.isTyping,
}))

const bubbleClasses = computed(() => ({
  'chat-message__bubble--user': isUser.value,
  'chat-message__bubble--assistant': isAssistant.value,
  'chat-message__bubble--typing': props.message.isTyping,
}))

const formatTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/base/variables' as *;
@use '@/assets/styles/base/mixins' as *;

.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 16px;

  &--user {
    flex-direction: row-reverse;

    .chat-message__content {
      align-items: flex-end;
    }

    .chat-message__meta {
      text-align: right;
    }
  }

  &--assistant {
    flex-direction: row;

    .chat-message__content {
      align-items: flex-start;
    }

    .chat-message__meta {
      text-align: left;
    }
  }

  &__avatar {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    @include flex-center;
    background: $border-light;
    font-size: 18px;
  }

  &__avatar-icon {
    display: block;
  }

  &__content {
    @include flex-column;
    max-width: calc(100% - 52px);
    min-width: 0;
  }

  &__bubble {
    padding: 12px 16px;
    border-radius: $border-radius;
    word-wrap: break-word;
    position: relative;

    &--user {
      background-color: $chat-user-bg;
      color: white;
      border-bottom-right-radius: 4px;
    }

    &--assistant {
      background-color: $chat-assistant-bg;
      color: $text-primary;
      border-bottom-left-radius: 4px;
    }

    &--typing {
      background-color: $chat-assistant-bg;
      border-bottom-left-radius: 4px;
      padding: 16px;
    }
  }

  &__text {
    margin: 0;
    line-height: 1.5;
  }

  &__typing {
    @include flex-center;
    gap: 4px;
  }

  &__typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: $text-secondary;
    animation: typing-bounce 1.4s infinite ease-in-out;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }

    &:nth-child(3) {
      animation-delay: 0s;
    }
  }

  &__meta {
    margin-top: 4px;
    font-size: 0.75rem;
    color: $text-light;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  &__time {
    font-weight: 500;
  }

  &__sender {
    font-weight: 600;
  }

  @include mobile {
    padding: 0 12px;

    &__content {
      max-width: calc(100% - 44px);
    }

    &__bubble {
      padding: 10px 14px;
    }
  }
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>