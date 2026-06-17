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
import { nanoid } from 'nanoid'
import type { ExtendedMessage, NewApiStreamChunk, NewApiChatRequest, MessagePart } from './types'
import type { Attachment } from '../types'

/**
 * Create a new user message with optional attachments
 */
export function createUserMessage(content: string, attachments: Attachment[] = []): ExtendedMessage {
  const parts: MessagePart[] = [{ type: 'text', text: content }]

  // Add file parts (image, video, etc.)
  for (const attachment of attachments) {
    parts.push({
      type: 'file',
      data: attachment.url,
      mediaType: attachment.type === 'image' ? 'image/*' : 'video/*',
      filename: attachment.name,
    })
  }

  return {
    id: nanoid(),
    role: 'user',
    parts,
    content,
    createdAt: new Date(),
  } as ExtendedMessage
}

/**
 * Create a new assistant message (empty, for streaming)
 */
export function createAssistantMessage(): ExtendedMessage {
  return {
    id: nanoid(),
    role: 'assistant',
    parts: [],
    content: '',
    createdAt: new Date(),
    reasoning: {
      content: '',
      isStreaming: true,
    },
  } as ExtendedMessage
}

/**
 * Convert ExtendedMessages to new-api format
 * 支持多模态：text + image_url
 */
export function toNewApiMessages(messages: ExtendedMessage[]): NewApiChatRequest['messages'] {
  return messages.map((msg) => {
    // Handle multimodal content via parts
    if (msg.parts && msg.parts.length > 0) {
      const contentParts: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      > = []

      for (const part of msg.parts) {
        if (part.type === 'text') {
          contentParts.push({ type: 'text', text: part.text })
        } else if (part.type === 'file') {
          // 图片/视频统一转换为 OpenAI 多模态格式
          contentParts.push({
            type: 'image_url',
            image_url: { url: part.data },
          })
        }
      }

      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: contentParts.length > 0 ? contentParts : '',
      }
    }

    // Fallback: no parts, use empty content
    return {
      role: msg.role as 'user' | 'assistant' | 'system',
      content: '',
    }
  })
}

/**
 * Parse SSE chunk from new-api
 */
export function parseStreamChunk(chunk: string): NewApiStreamChunk | null {
  const trimmed = chunk.trim()
  if (!trimmed || trimmed === 'data: [DONE]') return null

  const data = trimmed.replace(/^data: /, '')
  try {
    return JSON.parse(data) as NewApiStreamChunk
  } catch {
    return null
  }
}

/**
 * Apply stream chunk to message
 */
export function applyStreamChunk(
  message: ExtendedMessage,
  content: string | null,
  reasoning: string | null
): ExtendedMessage {
  const updated = { ...message }

  // Update reasoning
  if (reasoning) {
    updated.reasoning = {
      content: (message.reasoning?.content || '') + reasoning,
      isStreaming: true,
    }
  }

  // Update content via parts (AI SDK 6.0 style)
  if (content) {
    const existingText = message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') || ''
    const newContent = existingText + content

    // Build new parts array preserving non-text parts
    const nonTextParts = message.parts?.filter((p) => p.type !== 'text') || []
    updated.parts = [...nonTextParts, { type: 'text' as const, text: newContent }]
  }

  return updated
}

/**
 * Finalize streaming message
 */
export function finalizeStreamingMessage(message: ExtendedMessage): ExtendedMessage {
  return {
    ...message,
    reasoning: message.reasoning
      ? { ...message.reasoning, isStreaming: false }
      : undefined,
  }
}
