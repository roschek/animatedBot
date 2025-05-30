<template>
  <div class="message-list">
    <div class="message-list__header" v-if="showPagination">
      <div class="message-list__pagination">
        <button
          class="message-list__page-btn"
          @click="loadPreviousPage"
          :disabled="currentPage <= 1"
        >
          ← Previous
        </button>

        <span class="message-list__page-info"> Page {{ currentPage }} of {{ totalPages }} </span>

        <button class="message-list__page-btn" @click="loadNextPage" :disabled="!hasMoreMessages">
          Next →
        </button>
      </div>
    </div>

    <div class="message-list__container" ref="messagesContainer">
      <div class="message-list__messages">
        <TransitionGroup name="message" tag="div">
          <ChatMessage v-for="message in messages" :key="message.id" :message="message" />
        </TransitionGroup>

        <div v-if="messages.length === 0" class="message-list__empty">
          <div class="message-list__empty-icon">💬</div>
          <p class="message-list__empty-text">No messages yet. Start a conversation!</p>
        </div>
      </div>
    </div>

    <div class="message-list__footer" v-if="totalMessages > 0">
      <div class="message-list__stats">
        <span class="message-list__count">
          {{ totalMessages }} message{{ totalMessages !== 1 ? 's' : '' }}
        </span>

        <button class="message-list__clear-btn" @click="clearAllMessages" v-if="totalMessages > 3">
          Clear Chat
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import type { MessageListProps, MessageListEmits } from '@/types/chat'
import ChatMessage from './ChatMessage.vue'

const props = withDefaults(defineProps<MessageListProps>(), {
  messages: () => [],
  totalMessages: 0,
  currentPage: 1,
  totalPages: 1,
  hasMoreMessages: false,
})

const emit = defineEmits<MessageListEmits>()

const messagesContainer = ref<HTMLElement | null>(null)

const showPagination = computed((): boolean => {
  return props.totalPages > 1
})

const loadNextPage = (): void => {
  emit('load-next-page')
}

const loadPreviousPage = (): void => {
  emit('load-previous-page')
}

const clearAllMessages = (): void => {
  if (confirm('Are you sure you want to clear all messages?')) {
    emit('clear-messages')
  }
}

const scrollToBottom = (): void => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Auto scroll to bottom when new messages arrive
watch(
  () => props.messages.length,
  (newLength: number, oldLength: number) => {
    if (newLength > oldLength) {
      scrollToBottom()
    }
  },
  { immediate: true },
)

// Auto scroll when on the last page
watch(
  () => props.currentPage,
  (newPage: number) => {
    if (newPage === props.totalPages) {
      scrollToBottom()
    }
  },
)

defineExpose({
  scrollToBottom,
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/base/variables' as *;
@use '@/assets/styles/base/mixins' as *;

.message-list {
  height: 100%;
  @include flex-column;

  &__header {
    padding: 16px;
    border-bottom: 1px solid $border-light;
  }

  &__pagination {
    @include flex-between;
    align-items: center;
  }

  &__page-btn {
    @include button-base;
    padding: 8px 16px;
    background-color: white;
    border: 1px solid $border-medium;
    color: $primary-color;
    font-size: 0.9rem;

    &:hover:not(:disabled) {
      background-color: $primary-color;
      color: white;
    }

    &:disabled {
      color: $text-light;
      border-color: $border-light;
      cursor: not-allowed;
    }
  }

  &__page-info {
    font-size: 0.9rem;
    color: $text-secondary;
    font-weight: 500;
  }

  &__container {
    flex: 1;
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  &__messages {
    padding: 16px 0;
    min-height: 100%;
    @include flex-column;
    justify-content: flex-end;
  }

  &__empty {
    @include flex-center;
    @include flex-column;
    gap: 16px;
    padding: 40px 20px;
    text-align: center;
    color: $text-secondary;
  }

  &__empty-icon {
    font-size: 3rem;
    opacity: 0.5;
  }

  &__empty-text {
    font-size: 1.1rem;
    margin: 0;
  }

  &__footer {
    padding: 12px 16px;
    border-top: 1px solid $border-light;
    background-color: #fafbfc;
  }

  &__stats {
    @include flex-between;
    align-items: center;
  }

  &__count {
    font-size: 0.85rem;
    color: $text-secondary;
    font-weight: 500;
  }

  &__clear-btn {
    @include button-base;
    padding: 6px 12px;
    background-color: transparent;
    color: #dc2626;
    border: 1px solid #dc2626;
    font-size: 0.8rem;

    &:hover {
      background-color: #dc2626;
      color: white;
    }
  }

  @include mobile {
    &__header {
      padding: 12px;
    }

    &__pagination {
      gap: 12px;
    }

    &__page-btn {
      padding: 6px 12px;
      font-size: 0.85rem;
    }

    &__messages {
      padding: 12px 0;
    }
  }
}

// Message transitions
.message-enter-active {
  transition: all 0.3s ease-out;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-leave-active {
  transition: all 0.3s ease-in;
}

.message-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
