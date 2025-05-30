import type { Ref, ComputedRef } from 'vue'

export type MessageSender = 'user' | 'assistant'

export interface ChatMessage {
  id: string | number
  content: string
  sender: MessageSender
  timestamp: Date
  isTyping?: boolean
}

export interface ChatState {
  messages: Ref<ChatMessage[]>
  isLoading: Ref<boolean>
  currentPage: Ref<number>
  messagesPerPage: Ref<number>
}

export interface ChatActions {
  addMessage: (content: string, sender?: MessageSender) => ChatMessage
  addTypingMessage: () => ChatMessage
  removeTypingMessage: () => void
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  loadNextPage: () => void
  loadPreviousPage: () => void
  initializeChat: () => void
}

export interface ChatGetters {
  totalMessages: ComputedRef<number>
  totalPages: ComputedRef<number>
  paginatedMessages: ComputedRef<ChatMessage[]>
  hasMoreMessages: ComputedRef<boolean>
}

export interface ChatStore extends ChatState, ChatActions, ChatGetters {}

export interface MessageInputEmits {
  'send-message': [message: string]
}

export interface MessageListEmits {
  'load-next-page': []
  'load-previous-page': []
  'clear-messages': []
}

export interface MessageListProps {
  messages: ChatMessage[]
  totalMessages: number
  currentPage: number
  totalPages: number
  hasMoreMessages: boolean
}

export interface MessageInputProps {
  isLoading: boolean
  maxLength: number
}

export interface ChatMessageProps {
  message: ChatMessage
}
