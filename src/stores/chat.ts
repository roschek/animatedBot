import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, MessageSender, ChatStore } from '@/types/chat'

export const useChatStore = defineStore('chat', (): ChatStore => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref<boolean>(false)
  const currentPage = ref<number>(1)
  const messagesPerPage = ref<number>(50)
  const isResponding = ref<boolean>(false)
  const currentResponseText = ref<string>('')

  const totalMessages = computed((): number => messages.value.length)
  const totalPages = computed((): number => Math.ceil(totalMessages.value / messagesPerPage.value))

  const paginatedMessages = computed((): ChatMessage[] => {
    const start = (currentPage.value - 1) * messagesPerPage.value
    const end = start + messagesPerPage.value
    return messages.value.slice(start, end)
  })

  const hasMoreMessages = computed((): boolean => currentPage.value < totalPages.value)

  const addMessage = (content: string, sender: MessageSender = 'user'): ChatMessage => {
    const message: ChatMessage = {
      id: Date.now() + Math.random(),
      content,
      sender,
      timestamp: new Date(),
      isTyping: false,
    }
    messages.value.push(message)

    if (messages.value.length > messagesPerPage.value) {
      currentPage.value = totalPages.value
    }

    return message
  }

  const addTypingMessage = (): ChatMessage => {
    const typingMessage: ChatMessage = {
      id: 'typing',
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
      isTyping: true,
    }
    messages.value.push(typingMessage)
    return typingMessage
  }

  const removeTypingMessage = (): void => {
    const index = messages.value.findIndex((msg) => msg.id === 'typing')
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return

    isLoading.value = true

    addMessage(content, 'user')
    addTypingMessage()

    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 800 + Math.random() * 1200))

      removeTypingMessage()

      const echoResponse = content
      currentResponseText.value = echoResponse
      isResponding.value = true

      addMessage(echoResponse, 'assistant')

      setTimeout(
        () => {
          isResponding.value = false
          currentResponseText.value = ''
        },
        echoResponse.length * 200 + 1000,
      )
    } catch (error) {
      removeTypingMessage()
      addMessage("Sorry, I'm having trouble responding right now. Please try again.", 'assistant')
      console.error('Error sending message:', error)
    } finally {
      isLoading.value = false
    }
  }

  const clearMessages = (): void => {
    messages.value = []
    currentPage.value = 1
    isLoading.value = false
    isResponding.value = false
    currentResponseText.value = ''
    initializeChat()
  }

  const loadNextPage = (): void => {
    if (hasMoreMessages.value) {
      currentPage.value++
    }
  }

  const loadPreviousPage = (): void => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const initializeChat = (): void => {
    if (messages.value.length === 0) {
      addMessage("Hello! I'm your AI companion. I'll repeat whatever you say!", 'assistant')
    }
  }

  return {
    messages,
    isLoading,
    currentPage,
    messagesPerPage,
    isResponding,
    currentResponseText,

    totalMessages,
    totalPages,
    paginatedMessages,
    hasMoreMessages,

    addMessage,
    addTypingMessage,
    removeTypingMessage,
    sendMessage,
    clearMessages,
    loadNextPage,
    loadPreviousPage,
    initializeChat,
  }
})
