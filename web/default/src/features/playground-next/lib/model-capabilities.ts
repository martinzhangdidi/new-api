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

import type { Modality } from '@/features/pricing/types'

/**
 * 模型能力定义
 */
export interface ModelCapabilities {
  // 多模态能力
  vision: boolean        // 支持图片输入
  video: boolean        // 支持视频输入
  reasoning: boolean     // 支持思考链 (reasoning_content)

  // 参数支持
  supportsTemperature: boolean
  supportsTopP: boolean
  supportsMaxTokens: boolean
  supportsFrequencyPenalty: boolean
  supportsPresencePenalty: boolean
  supportsSeed: boolean
  
  // 参数范围限制
  temperatureRange: { min: number; max: number }
  maxTokensLimit: number
}

/**
 * 默认能力配置 (保守模式 - 只支持基础文本)
 */
const DEFAULT_CAPABILITIES: ModelCapabilities = {
  vision: false,
  video: false,
  reasoning: false,
  supportsTemperature: true,
  supportsTopP: true,
  supportsMaxTokens: true,
  supportsFrequencyPenalty: true,
  supportsPresencePenalty: true,
  supportsSeed: false,
  temperatureRange: { min: 0, max: 2 },
  maxTokensLimit: 4096,
}

/**
 * 已知模型能力映射表
 * 基于模型名称前缀匹配
 */
const MODEL_CAPABILITIES_MAP: Record<string, Partial<ModelCapabilities>> = {
  // OpenAI
  'gpt-4o': { vision: true, supportsSeed: true, maxTokensLimit: 4096 },
  'gpt-4o-mini': { vision: true, supportsSeed: true, maxTokensLimit: 16384 },
  'gpt-4-turbo': { vision: true, supportsSeed: true, maxTokensLimit: 4096 },
  'gpt-4-vision': { vision: true, supportsSeed: true, maxTokensLimit: 4096 },
  'gpt-4': { vision: false, supportsSeed: true, maxTokensLimit: 8192 },
  'gpt-3.5': { vision: false, supportsSeed: true, maxTokensLimit: 4096 },
  'o1': {
    vision: true, reasoning: true,
    supportsTemperature: false, supportsTopP: false,
    supportsFrequencyPenalty: false, supportsPresencePenalty: false,
    supportsSeed: false, maxTokensLimit: 32768,
  },
  'o3': {
    vision: true, reasoning: true,
    supportsTemperature: false, supportsTopP: false,
    supportsFrequencyPenalty: false, supportsPresencePenalty: false,
    supportsSeed: false, maxTokensLimit: 32768,
  },

  // Claude
  'claude-3-opus': { vision: true, supportsSeed: false, maxTokensLimit: 4096, temperatureRange: { min: 0, max: 1 } },
  'claude-3-sonnet': { vision: true, supportsSeed: false, maxTokensLimit: 4096, temperatureRange: { min: 0, max: 1 } },
  'claude-3-haiku': { vision: true, supportsSeed: false, maxTokensLimit: 4096, temperatureRange: { min: 0, max: 1 } },
  'claude-3.5': { vision: true, supportsSeed: false, maxTokensLimit: 8192, temperatureRange: { min: 0, max: 1 } },
  'claude-3.7-sonnet': { vision: true, reasoning: true, supportsSeed: false, maxTokensLimit: 8192, temperatureRange: { min: 0, max: 1 } },
  'claude': { vision: false, supportsSeed: false, maxTokensLimit: 4096, temperatureRange: { min: 0, max: 1 } },

  // Gemini
  'gemini-1.5-pro': { vision: true, supportsSeed: false, maxTokensLimit: 8192 },
  'gemini-1.5-flash': { vision: true, supportsSeed: false, maxTokensLimit: 8192 },
  'gemini-pro-vision': { vision: true, supportsSeed: false, maxTokensLimit: 4096 },
  'gemini-2.0': { vision: true, supportsSeed: false, maxTokensLimit: 8192 },
  'gemini-2.5': { vision: true, supportsSeed: false, maxTokensLimit: 8192 },
  'gemini': { vision: false, supportsSeed: false, maxTokensLimit: 4096 },

  // DeepSeek
  'deepseek-r1': { vision: false, reasoning: true, supportsSeed: true, maxTokensLimit: 8192 },
  'deepseek-v3': { vision: false, reasoning: false, supportsSeed: true, maxTokensLimit: 8192 },
  'deepseek-v2': { vision: false, reasoning: false, supportsSeed: true, maxTokensLimit: 4096 },
  'deepseek': { vision: false, reasoning: false, supportsSeed: true, maxTokensLimit: 4096 },

  // Qwen
  'qwen-vl': { vision: true, supportsSeed: true, maxTokensLimit: 4096 },
  'qwen2-vl': { vision: true, supportsSeed: true, maxTokensLimit: 4096 },
  'qwen2.5-vl': { vision: true, supportsSeed: true, maxTokensLimit: 4096 },
  'qwen': { vision: false, supportsSeed: true, maxTokensLimit: 4096 },

  // Kimi (Moonshot)
  'kimi-k2.5': { vision: true, video: true, reasoning: true, supportsSeed: true, maxTokensLimit: 8192 },
  'kimi': { vision: false, supportsSeed: true, maxTokensLimit: 4096 },

  // 其他视觉模型
  'llava': { vision: true, supportsSeed: false, maxTokensLimit: 4096 },
  'cogvlm': { vision: true, supportsSeed: false, maxTokensLimit: 4096 },
  'yi-vision': { vision: true, supportsSeed: true, maxTokensLimit: 4096 },

  // 嵌入模型
  'text-embedding': {
    vision: false, reasoning: false,
    supportsTemperature: false, supportsTopP: false, supportsMaxTokens: false,
    supportsFrequencyPenalty: false, supportsPresencePenalty: false, supportsSeed: false,
    maxTokensLimit: 0,
  },
  embedding: {
    vision: false, reasoning: false,
    supportsTemperature: false, supportsTopP: false, supportsMaxTokens: false,
    supportsFrequencyPenalty: false, supportsPresencePenalty: false, supportsSeed: false,
    maxTokensLimit: 0,
  },
}

/**
 * 从后端返回的 tags 推断能力
 * tags 格式：逗号分隔的标签字符串，如 "vision,reasoning"
 */
function inferCapabilitiesFromTags(tags?: string): Partial<ModelCapabilities> {
  if (!tags) return {}
  const tagSet = new Set(tags.split(',').map((t) => t.trim().toLowerCase()))
  const caps: Partial<ModelCapabilities> = {}
  if (tagSet.has('vision')) caps.vision = true
  if (tagSet.has('video')) caps.video = true
  if (tagSet.has('reasoning')) caps.reasoning = true
  return caps
}

/**
 * 从 supportedEndpointTypes 推断能力
 */
function inferCapabilitiesFromEndpoints(endpoints: string[]): Partial<ModelCapabilities> {
  const caps: Partial<ModelCapabilities> = {}
  if (endpoints.includes('image-generation')) {
    caps.vision = false
    caps.supportsTemperature = false
    caps.supportsTopP = false
    caps.supportsMaxTokens = false
    caps.supportsFrequencyPenalty = false
    caps.supportsPresencePenalty = false
  }
  if (endpoints.includes('embeddings')) {
    caps.vision = false
    caps.reasoning = false
    caps.supportsTemperature = false
    caps.supportsTopP = false
    caps.supportsMaxTokens = false
    caps.supportsFrequencyPenalty = false
    caps.supportsPresencePenalty = false
  }
  return caps
}

/**
 * 获取模型能力
 * 优先顺序：tags > MODEL_CAPABILITIES_MAP > endpoint types > 默认值
 */
export function getModelCapabilities(
  modelId: string,
  supportedEndpointTypes?: string[],
  tags?: string
): ModelCapabilities {
  if (!modelId) return DEFAULT_CAPABILITIES

  // 1. 从 tags 推断（后端返回，最高优先级）
  const tagCaps = inferCapabilitiesFromTags(tags)

  // 2. 查找 MODEL_CAPABILITIES_MAP 中最长匹配前缀
  let nameMatchedCaps: Partial<ModelCapabilities> = {}
  let maxMatchLength = 0
  for (const [prefix, caps] of Object.entries(MODEL_CAPABILITIES_MAP)) {
    if (modelId.toLowerCase().startsWith(prefix.toLowerCase())) {
      if (prefix.length > maxMatchLength) {
        maxMatchLength = prefix.length
        nameMatchedCaps = caps
      }
    }
  }

  // 3. 从端点类型推断
  const endpointCaps = supportedEndpointTypes
    ? inferCapabilitiesFromEndpoints(supportedEndpointTypes)
    : {}

  // 合并：tags 优先，然后是名称匹配，然后是端点类型，最后是默认值
  return {
    ...DEFAULT_CAPABILITIES,
    ...nameMatchedCaps,
    ...endpointCaps,
    ...tagCaps,
  }
}

/**
 * 检查模型是否支持特定能力
 */
export function modelSupports(
  modelId: string,
  capability: keyof ModelCapabilities,
  supportedEndpointTypes?: string[],
  tags?: string
): boolean {
  const caps = getModelCapabilities(modelId, supportedEndpointTypes, tags)
  return !!caps[capability]
}

/**
 * 获取参数范围限制
 */
export function getModelParameterLimits(
  modelId: string,
  supportedEndpointTypes?: string[],
  tags?: string
) {
  const caps = getModelCapabilities(modelId, supportedEndpointTypes, tags)
  return {
    temperature: caps.temperatureRange,
    maxTokens: { min: 1, max: caps.maxTokensLimit },
  }
}

/**
 * 获取模型支持的多模态格式
 * 使用 getModelCapabilities + MULTIMODAL_MAP 推断
 */
export function getModelModalities(
  modelId: string,
  tags?: string,
  supportedEndpointTypes?: string[]
): Modality[] {
  const caps = getModelCapabilities(modelId, supportedEndpointTypes, tags)
  const modalities: Modality[] = ['text']
  if (caps.vision) modalities.push('image')
  if (caps.video) modalities.push('video')
  return modalities
}
