import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, MessageSender } from '@/types/chat'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref<boolean>(false)
  const currentPage = ref<number>(1)
  const messagesPerPage = ref<number>(50)
  const isResponding = ref<boolean>(false)
  const currentResponseText = ref<string>('')

  // Добавляем контроль показа речи
  const isShowingSpeech = ref<boolean>(false)

  const totalMessages = computed((): number => messages.value.length)
  const totalPages = computed((): number => Math.ceil(totalMessages.value / messagesPerPage.value))

  const paginatedMessages = computed((): ChatMessage[] => {
    const start = (currentPage.value - 1) * messagesPerPage.value
    const end = start + messagesPerPage.value
    return messages.value.slice(start, end)
  })

  const hasMoreMessages = computed((): boolean => currentPage.value < totalPages.value)

  // Контроль показа текущей речи
  const shouldShowCurrentSpeech = computed(() => isShowingSpeech.value && currentResponseText.value)

  const currentSpeechMessage = computed(() => ({
    id: 'current-speech',
    content: currentResponseText.value,
    sender: 'assistant' as const,
    timestamp: new Date(),
    isTyping: false,
  }))

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

  // Методы контроля речи
  const startShowingSpeech = () => {
    removeTypingMessage() // Убираем typing когда начинается речь
    isShowingSpeech.value = true
    console.log('💬 Started showing speech')
  }

  const stopShowingSpeech = () => {
    isShowingSpeech.value = false

    // Добавляем в историю
    if (currentResponseText.value) {
      const parseEmotions = (text: string) => {
        return text.replace(/\[EMOTION:\w+\]/g, '').trim()
      }
      const cleanResponse = parseEmotions(currentResponseText.value)
      addMessage(cleanResponse, 'assistant')
    }

    // Очищаем
    currentResponseText.value = ''
    isResponding.value = false
    console.log('💬 Stopped showing speech')
  }

  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return

    isLoading.value = true
    const userMessage = addMessage(content, 'user')
    addTypingMessage()

    try {
      const history = messages.value
        .slice(-10)
        .filter((msg) => !msg.isTyping && msg.id !== userMessage.id)
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          history,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // НЕ убираем typing сразу! Оставляем до начала речи
      // Просто ставим текст для персонажа
      currentResponseText.value = data.response
      isResponding.value = true
    } catch (error) {
      removeTypingMessage()
      addMessage("I'm having trouble connecting right now. Please try again!", 'assistant')
      console.error('API error:', error)
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
    isShowingSpeech.value = false
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
    isShowingSpeech,

    totalMessages,
    totalPages,
    paginatedMessages,
    hasMoreMessages,
    shouldShowCurrentSpeech,
    currentSpeechMessage,

    addMessage,
    addTypingMessage,
    removeTypingMessage,
    sendMessage,
    clearMessages,
    loadNextPage,
    loadPreviousPage,
    initializeChat,
    startShowingSpeech,
    stopShowingSpeech,
  }
})
