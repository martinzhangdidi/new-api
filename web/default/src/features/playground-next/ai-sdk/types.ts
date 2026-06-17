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
import type { UIMessage } from 'ai'

/**
 * 自定义 part 类型，遵循 AI SDK 标准
 * - text: 文本内容
 * - file: 统一处理所有文件附件（图片、视频等），通过 mediaType 区分
 */
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'file'; data: string; mediaType: string; filename?: string }

/**
 * Extended UIMessage with reasoning support and custom parts
 */
export interface ExtendedMessage extends Omit<UIMessage, 'parts'> {
  parts?: MessagePart[]
  reasoning?: {
    content: string
    isStreaming: boolean
  }
  errorCode?: string | null
  isError?: boolean
}

/**
 * SSE chunk from new-api
 */
export interface NewApiStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: 'user' | 'assistant' | 'system'
      content?: string
      reasoning_content?: string
    }
    finish_reason: string | null
  }>
}

/**
 * Chat completion request for new-api
 */
export interface NewApiChatRequest {
  model: string
  group?: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
  }>
  stream: boolean
  temperature?: number
  top_p?: number
  max_tokens?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
}

/**
 * Transport options
 */
export interface TransportOptions {
  api: string
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

/**
 * Stream callbacks
 */
export interface StreamCallbacks {
  onMessage: (content: string | null, reasoning: string | null) => void
  onComplete: () => void
  onError: (error: string, errorCode?: string) => void
}
