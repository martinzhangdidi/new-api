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

/**
 * Model option
 */
export interface ModelOption {
  value: string
  label: string
  description?: string
  supportedEndpointTypes?: string[]  // 后端返回的能力列表
}

/**
 * Group/Channel option
 */
export interface GroupOption {
  value: string
  label: string
}

/**
 * Chat parameters (UI state)
 */
export interface ChatParameters {
  temperature: number
  topP: number
  maxTokens: number
  frequencyPenalty: number
  presencePenalty: number
  seed: number | null
}

/**
 * Parameter enabled state (which params are active)
 */
export interface ParameterEnabled {
  temperature: boolean
  topP: boolean
  maxTokens: boolean
  frequencyPenalty: boolean
  presencePenalty: boolean
  seed: boolean
}

/**
 * Attachment for multimodal
 */
export interface Attachment {
  id: string
  type: 'image'
  url: string // base64 or blob URL
  name: string
  size: number
}

/**
 * Reasoning info
 */
export interface ReasoningInfo {
  content: string
  isStreaming: boolean
}

// Re-export from ai-sdk for convenience
export type { ExtendedMessage } from './ai-sdk/types'

/**
 * 端点类型枚举（对应后端 constant.EndpointType）
 */
export enum EndpointType {
  OpenAI = 'openai',
  OpenAIResponse = 'openai-response',
  OpenAIResponseCompact = 'openai-response-compact',
  Anthropic = 'anthropic',
  Gemini = 'gemini',
  ImageGeneration = 'image-generation',
  Embeddings = 'embeddings',
  OpenAIVideo = 'openai-video',
}
