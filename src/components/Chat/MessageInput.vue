<template>
  <div class="message-input">
    <form class="message-input__form" @submit.prevent="handleSubmit">
      <div class="message-input__group">
        <textarea
          ref="textareaRef"
          v-model="message"
          class="message-input__textarea"
          placeholder="Type your message..."
          :disabled="isLoading"
          @keydown="handleKeydown"
          @input="adjustTextareaHeight"
          rows="1"
        ></textarea>

        <button type="submit" class="message-input__send-btn" :disabled="!canSend">
          <span v-if="isLoading" class="message-input__loading">⏳</span>
          <span v-else class="message-input__send-icon">📤</span>
        </button>
      </div>

      <div class="message-input__footer">
        <div class="message-input__stats">
          <span class="message-input__char-count" :class="charCountClasses">
            {{ message.length }}/{{ maxLength }}
          </span>
        </div>

        <div class="message-input__actions">
          <button
            type="button"
            class="message-input__clear-btn"
            @click="clearMessage"
            v-if="message.length > 0"
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { MessageInputProps, MessageInputEmits } from '@/types/chat'

const props = withDefaults(defineProps<MessageInputProps>(), {
  isLoading: false,
  maxLength: 1000,
})

const emit = defineEmits<MessageInputEmits>()

const message = ref<string>('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed((): boolean => {
  return (
    message.value.trim().length > 0 && message.value.length <= props.maxLength && !props.isLoading
  )
})

const charCountClasses = computed(() => ({
  'message-input__char-count--warning': message.value.length > props.maxLength * 0.8,
  'message-input__char-count--error': message.value.length > props.maxLength,
}))

const handleSubmit = (): void => {
  if (!canSend.value) return

  const messageText = message.value.trim()
  if (messageText) {
    emit('send-message', messageText)
    clearMessage()
  }
}

const clearMessage = (): void => {
  message.value = ''
  adjustTextareaHeight()
  focusTextarea()
}

const focusTextarea = (): void => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
}

const adjustTextareaHeight = (): void => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      const scrollHeight = textareaRef.value.scrollHeight
      const maxHeight = 120 // max height in pixels (about 6 lines)
      textareaRef.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  })
}

const handleKeydown = (event: KeyboardEvent): void => {
  // Send on Enter (but not Shift+Enter)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}

// Auto-focus on mount
watch(
  () => props.isLoading,
  (isLoading: boolean) => {
    if (!isLoading) {
      focusTextarea()
    }
  },
  { immediate: true },
)

defineExpose({
  focusTextarea,
  clearMessage,
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/base/variables' as *;
@use '@/assets/styles/base/mixins' as *;

.message-input {
  background: white;
  border-radius: $border-radius-lg;
  padding: 20px;
  @include shadow-card;

  &__form {
    @include flex-column;
    gap: 12px;
  }

  &__group {
    @include flex-between;
    align-items: flex-end;
    gap: 16px;
  }

  &__textarea {
    flex: 1;
    padding: 16px 20px;
    border: 2px solid $border-light;
    border-radius: $border-radius;
    font-size: 1rem;
    font-family: inherit;
    line-height: 1.5;
    resize: none;
    transition: border-color $transition-base;
    background: white;
    min-height: 52px;
    max-height: 120px;
    overflow-y: auto;

    &:focus {
      outline: none;
      border-color: $primary-color;
    }

    &:disabled {
      background-color: #f9fafb;
      color: $text-light;
      cursor: not-allowed;
    }

    &::placeholder {
      color: $text-light;
    }
  }

  &__send-btn {
    @include button-primary;
    padding: 16px 20px;
    font-size: 1.2rem;
    min-width: 56px;
    min-height: 52px;
    flex-shrink: 0;

    &:disabled {
      background-color: $border-medium;
      transform: none;
      box-shadow: none;
    }
  }

  &__loading {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  &__send-icon {
    display: inline-block;
  }

  &__footer {
    @include flex-between;
    align-items: center;
    padding-top: 8px;
  }

  &__stats {
    @include flex-center;
    gap: 12px;
  }

  &__char-count {
    font-size: 0.8rem;
    color: $text-light;
    font-weight: 500;

    &--warning {
      color: #f59e0b;
    }

    &--error {
      color: #dc2626;
    }
  }

  &__actions {
    @include flex-center;
    gap: 8px;
  }

  &__clear-btn {
    @include button-base;
    padding: 4px 8px;
    background: transparent;
    color: $text-secondary;
    border: 1px solid $border-light;
    font-size: 0.8rem;

    &:hover {
      background-color: $border-light;
      color: $text-primary;
    }
  }

  @include mobile {
    padding: 16px;

    &__group {
      gap: 12px;
    }

    &__textarea {
      padding: 12px 16px;
      font-size: 0.9rem;
    }

    &__send-btn {
      padding: 12px 16px;
      font-size: 1.1rem;
      min-width: 48px;
      min-height: 44px;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
