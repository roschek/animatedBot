<template>
  <div class="chat-page">
    <div class="chat-page__container">
      <header class="chat-page__header">
        <h1 class="chat-page__title">Animated AI Chat</h1>
        <p class="chat-page__subtitle">Chat with your AI companion</p>
      </header>

      <main class="chat-page__main">
        <div class="chat-page__content">
          <div class="chat-page__messages">
            <MessageList
              :messages="paginatedMessages"
              :total-messages="totalMessages"
              :current-page="currentPage"
              :total-pages="totalPages"
              :has-more-messages="hasMoreMessages"
              @load-next-page="loadNextPage"
              @load-previous-page="loadPreviousPage"
              @clear-messages="clearMessages"
            />
          </div>

          <div class="chat-page__animation">
            <AnimatedCharacter :scale="0.5" />
          </div>
        </div>

        <div class="chat-page__input">
          <MessageInput :max-length="100" @send-message="handleSendMessage" />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import MessageList from '@/components/Chat/MessageList.vue'
import MessageInput from '@/components/Chat/MessageInput.vue'
import AnimatedCharacter from '@/components/Animation/AnimatedCharacter.vue'

const chatStore = useChatStore()
const { paginatedMessages, totalMessages, currentPage, totalPages, hasMoreMessages } =
  storeToRefs(chatStore)

const { sendMessage, clearMessages, loadNextPage, loadPreviousPage, initializeChat } = chatStore

const handleSendMessage = async (message: string): Promise<void> => await sendMessage(message)

onMounted(() => initializeChat())
</script>

<style lang="scss" scoped>
@use '@/assets/styles/base/variables' as *;
@use '@/assets/styles/base/mixins' as *;

.chat-page {
  @include flex-column;

  &__container {
    max-width: 1200px;
    height: 900px;
    margin: 0 auto;
    padding: 20px;
    @include flex-column;
  }

  &__header {
    text-align: center;
    margin-bottom: 30px;
  }

  &__title {
    font-size: 2.5rem;
    font-weight: 700;
    color: $primary-color;
    margin-bottom: 8px;
  }

  &__subtitle {
    color: $text-secondary;
    font-size: 1.1rem;
  }

  &__main {
    flex: 1;
    @include flex-column;
    gap: 20px;
  }

  &__content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 30px;

    @include mobile {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto;
    }
  }

  &__messages {
    background: white;
    border-radius: $border-radius-lg;
    @include shadow-card;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  &__animation {
    background: white;
    border-radius: $border-radius-lg;
    padding: 24px;
    @include shadow-card;
    @include flex-center;

    @include mobile {
      min-height: 250px;
    }
  }
}
</style>
