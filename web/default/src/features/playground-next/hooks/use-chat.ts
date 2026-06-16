/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { NewApiTransport } from '../ai-sdk/transport'
import { createUserMessage, createAssistantMessage, applyStreamChunk, finalizeStreamingMessage } from '../ai-sdk/adapter'
import { API_ENDPOINTS } from '../constants'
import type { ExtendedMessage, Attachment } from '../types'

interface UseChatOptions {
  model: string
  group: string
  params: {
    temperature?: number
    topP?: number
    maxTokens?: number
    frequencyPenalty?: number
    presencePenalty?: number
    seed?: number
  }
}

export function useCustomChat(options: UseChatOptions) {
  const transportRef = useRef(new NewApiTransport({ api: API_ENDPOINTS.CHAT_COMPLETIONS }))
  const [isGenerating, setIsGenerating] = useState(false)
  const [messages, setMessages] = useState<ExtendedMessage[]>([])

  const sendMessage = useCallback(async (content: string, attachments: Attachment[] = []) => {
    if (!content.trim() && attachments.length === 0) return
    if (!options.model) {
      toast.error('Please select a model')
      return
    }

    // Create user message
    const userMessage = createUserMessage(content, attachments)
    const assistantMessage = createAssistantMessage()

    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    setIsGenerating(true)

    // Use transport to stream
    try {
      await transportRef.current.stream(
        newMessages,
        {
          model: options.model,
          group: options.group,
          stream: true,
          temperature: options.params.temperature,
          top_p: options.params.topP,
          max_tokens: options.params.maxTokens,
          frequency_penalty: options.params.frequencyPenalty,
          presence_penalty: options.params.presencePenalty,
          seed: options.params.seed,
        },
        {
          onMessage: (content, reasoning) => {
            setMessages((prev) => {
              const lastIndex = prev.length - 1
              if (lastIndex < 0) return prev
              const last = prev[lastIndex]
              if (last.role !== 'assistant') return prev
              const updated = applyStreamChunk(last, content, reasoning)
              return [...prev.slice(0, lastIndex), updated]
            })
          },
          onComplete: () => {
            setMessages((prev) => {
              const lastIndex = prev.length - 1
              if (lastIndex < 0) return prev
              const last = prev[lastIndex]
              if (last.role !== 'assistant') return prev
              return [...prev.slice(0, lastIndex), finalizeStreamingMessage(last)]
            })
            setIsGenerating(false)
          },
          onError: (error, errorCode) => {
            // 错误显示在对话中（像老版 playground）
            setMessages((prev) => {
              const lastIndex = prev.length - 1
              if (lastIndex < 0) return prev
              const last = prev[lastIndex]
              if (last.role !== 'assistant') return prev
              return [
                ...prev.slice(0, lastIndex),
                {
                  ...last,
                  content: error,
                  isError: true,
                  errorCode,
                } as ExtendedMessage,
              ]
            })
            setIsGenerating(false)
            toast.error(error)
          },
        }
      )
    } catch {
      setIsGenerating(false)
    }
  }, [messages, options])

  const stopGeneration = useCallback(() => {
    transportRef.current.abort()
    setIsGenerating(false)
    setMessages((prev) => {
      const lastIndex = prev.length - 1
      if (lastIndex < 0) return prev
      const last = prev[lastIndex]
      if (last.role !== 'assistant') return prev
      return [...prev.slice(0, lastIndex), finalizeStreamingMessage(last)]
    })
  }, [])

  const regenerateMessage = useCallback(async (messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId)
    if (index === -1) return

    const messagesUpToHere = messages.slice(0, index)
    const newAssistant = createAssistantMessage()
    const newMessages = [...messagesUpToHere, newAssistant]
    setMessages(newMessages)
    setIsGenerating(true)

    try {
      await transportRef.current.stream(
        newMessages,
        {
          model: options.model,
          group: options.group,
          stream: true,
          temperature: options.params.temperature,
          top_p: options.params.topP,
          max_tokens: options.params.maxTokens,
          frequency_penalty: options.params.frequencyPenalty,
          presence_penalty: options.params.presencePenalty,
          seed: options.params.seed,
        },
        {
          onMessage: (content, reasoning) => {
            setMessages((prev) => {
              const lastIndex = prev.length - 1
              const last = prev[lastIndex]
              if (last.role !== 'assistant') return prev
              const updated = applyStreamChunk(last, content, reasoning)
              return [...prev.slice(0, lastIndex), updated]
            })
          },
          onComplete: () => {
            setMessages((prev) => {
              const lastIndex = prev.length - 1
              const last = prev[lastIndex]
              if (last.role !== 'assistant') return prev
              return [...prev.slice(0, lastIndex), finalizeStreamingMessage(last)]
            })
            setIsGenerating(false)
          },
          onError: (error) => {
            toast.error(error)
            setIsGenerating(false)
          },
        }
      )
    } catch {
      setIsGenerating(false)
    }
  }, [messages, options])

  const editMessage = useCallback((messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, parts: [{ type: 'text' as const, text: newContent }] }
          : m
      )
    )
  }, [])

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }, [])

  return {
    messages,
    isGenerating,
    sendMessage,
    stopGeneration,
    regenerateMessage,
    editMessage,
    deleteMessage,
  }
}
