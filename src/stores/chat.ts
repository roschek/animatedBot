import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, MessageSender, ChatStore } from '@/types/chat'

export const useChatStore = defineStore('chat', (): ChatStore => {
  // State
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref<boolean>(false)
  const currentPage = ref<number>(1)
  const messagesPerPage = ref<number>(50)

  // Getters
  const totalMessages = computed((): number => messages.value.length)
  const totalPages = computed((): number => Math.ceil(totalMessages.value / messagesPerPage.value))

  const paginatedMessages = computed((): ChatMessage[] => {
    const start = (currentPage.value - 1) * messagesPerPage.value
    const end = start + messagesPerPage.value
    return messages.value.slice(start, end)
  })

  const hasMoreMessages = computed((): boolean => currentPage.value < totalPages.value)

  // Actions
  const addMessage = (content: string, sender: MessageSender = 'user'): ChatMessage => {
    const message: ChatMessage = {
      id: Date.now() + Math.random(),
      content,
      sender,
      timestamp: new Date(),
      isTyping: false,
    }
    messages.value.push(message)

    // Auto scroll to latest page
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

    // Add user message
    addMessage(content, 'user')

    // Add typing indicator
    addTypingMessage()

    try {
      // Simulate AI response delay
      await new Promise<void>((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

      // Remove typing indicator
      removeTypingMessage()

      // Add AI response (mock for now)
      const responses: string[] = [
        "That's an interesting question! Let me think about it.",
        "I understand what you're asking. Here's my perspective...",
        "Great point! I'd like to add that...",
        'Thanks for sharing that with me!',
        'That makes sense. Would you like me to elaborate?',
        'I appreciate you bringing this up!',
        "That's a fascinating topic to discuss.",
        'I see what you mean. Let me explain further...',
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      addMessage(randomResponse, 'assistant')
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

  // Initialize with welcome message
  const initializeChat = (): void => {
    if (messages.value.length === 0) {
      addMessage("Hello! I'm your AI companion. How can I help you today?", 'assistant')
    }
  }

  return {    
    messages,
    isLoading,
    currentPage,
    messagesPerPage,

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
