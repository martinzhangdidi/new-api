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
import type { ChatParameters, ParameterEnabled } from './types'

export const API_ENDPOINTS = {
  CHAT_COMPLETIONS: '/pg/chat/completions',
  MODELS: '/api/user/models',  // 返回用户可用模型列表（字符串数组）
  GROUPS: '/api/user/self/groups',
} as const

export const DEFAULT_PARAMETERS: ChatParameters = {
  temperature: 1.0,
  topP: 1.0,
  maxTokens: 2048,
  frequencyPenalty: 0,
  presencePenalty: 0,
  seed: null,
} as const

export const DEFAULT_PARAMETER_ENABLED: ParameterEnabled = {
  temperature: true,
  topP: false,
  maxTokens: true,
  frequencyPenalty: false,
  presencePenalty: false,
  seed: false,
} as const

export const PARAMETER_RANGES = {
  temperature: { min: 0, max: 2, step: 0.1 },
  topP: { min: 0, max: 1, step: 0.1 },
  maxTokens: { min: 1, max: 8192, step: 1 },
  frequencyPenalty: { min: -2, max: 2, step: 0.1 },
  presencePenalty: { min: -2, max: 2, step: 0.1 },
  seed: { min: 0, max: 2147483647, step: 1 },
} as const
