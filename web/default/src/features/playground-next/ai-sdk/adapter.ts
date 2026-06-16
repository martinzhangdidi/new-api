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
import type { UIMessage } from 'ai'
import type { ExtendedMessage, NewApiStreamChunk, NewApiChatRequest } from './types'
import type { Attachment } from '../types'

/**
 * Create a new user message with optional attachments
 */
export function createUserMessage(content: string, attachments: Attachment[] = []): ExtendedMessage {
  const parts: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
    { type: 'text', text: content },
  ]

  // Add image parts
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      parts.push({ type: 'image', image: attachment.url })
    }
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
 * Convert UIMessages to new-api format
 */
export function toNewApiMessages(messages: UIMessage[]): NewApiChatRequest['messages'] {
  return messages.map((msg) => {
    // Handle multimodal content via parts (AI SDK 6.0)
    if (msg.parts && msg.parts.length > 0) {
      const contentParts = msg.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => ({
          type: 'text' as const,
          text: part.text,
        }))

      // Note: AI SDK 6.0 parts don't include image types directly
      // Images should be handled via separate logic in the UI layer
      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: contentParts.length > 0 ? contentParts : '',
      }
    }

    // Fallback: AI SDK 6.0 doesn't have content field, use parts only
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
