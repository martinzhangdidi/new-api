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
 * 模型能力定义
 */
export interface ModelCapabilities {
  // 多模态能力
  vision: boolean        // 支持图片输入
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
  // OpenAI 模型
  'gpt-4o': {
    vision: true,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  'gpt-4o-mini': {
    vision: true,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 16384,
  },
  'gpt-4-turbo': {
    vision: true,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  'gpt-4-vision': {
    vision: true,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  'gpt-4': {
    vision: false,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 8192,
  },
  'gpt-3.5': {
    vision: false,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  'o1': {
    vision: true,
    reasoning: true,
    supportsTemperature: false,  // o1 不支持 temperature
    supportsTopP: false,         // o1 不支持 top_p
    supportsFrequencyPenalty: false,
    supportsPresencePenalty: false,
    supportsSeed: false,
    maxTokensLimit: 32768,
  },
  'o3': {
    vision: true,
    reasoning: true,
    supportsTemperature: false,
    supportsTopP: false,
    supportsFrequencyPenalty: false,
    supportsPresencePenalty: false,
    supportsSeed: false,
    maxTokensLimit: 32768,
  },
  
  // Claude 模型
  'claude-3-opus': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
    temperatureRange: { min: 0, max: 1 },
  },
  'claude-3-sonnet': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
    temperatureRange: { min: 0, max: 1 },
  },
  'claude-3-haiku': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
    temperatureRange: { min: 0, max: 1 },
  },
  'claude-3.5': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 8192,
    temperatureRange: { min: 0, max: 1 },
  },
  'claude': {
    vision: false,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
    temperatureRange: { min: 0, max: 1 },
  },
  
  // Gemini 模型
  'gemini-1.5-pro': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 8192,
  },
  'gemini-1.5-flash': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 8192,
  },
  'gemini-pro-vision': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
  },
  'gemini': {
    vision: false,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
  },
  
  // DeepSeek 模型
  'deepseek-r1': {
    vision: false,
    reasoning: true,  // R1 支持 reasoning_content
    supportsSeed: true,
    maxTokensLimit: 8192,
  },
  'deepseek-v3': {
    vision: false,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 8192,
  },
  'deepseek-v2': {
    vision: false,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  'deepseek': {
    vision: false,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  
  // Qwen 模型
  'qwen-vl': {
    vision: true,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  'qwen2-vl': {
    vision: true,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  'qwen': {
    vision: false,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  
  // 其他视觉模型
  'llava': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
  },
  'cogvlm': {
    vision: true,
    reasoning: false,
    supportsSeed: false,
    maxTokensLimit: 4096,
  },
  'yi-vision': {
    vision: true,
    reasoning: false,
    supportsSeed: true,
    maxTokensLimit: 4096,
  },
  
  // 嵌入模型 (不支持聊天参数)
  'text-embedding': {
    vision: false,
    reasoning: false,
    supportsTemperature: false,
    supportsTopP: false,
    supportsMaxTokens: false,
    supportsFrequencyPenalty: false,
    supportsPresencePenalty: false,
    supportsSeed: false,
    maxTokensLimit: 0,
  },
  'embedding': {
    vision: false,
    reasoning: false,
    supportsTemperature: false,
    supportsTopP: false,
    supportsMaxTokens: false,
    supportsFrequencyPenalty: false,
    supportsPresencePenalty: false,
    supportsSeed: false,
    maxTokensLimit: 0,
  },
}

/**
 * 从 supportedEndpointTypes 推断能力
 */
function inferCapabilitiesFromEndpoints(endpoints: string[]): Partial<ModelCapabilities> {
  const caps: Partial<ModelCapabilities> = {}
  
  // 图片生成端点
  if (endpoints.includes('image-generation')) {
    // 纯图片生成模型，不支持聊天参数
    caps.vision = false
    caps.supportsTemperature = false
    caps.supportsTopP = false
    caps.supportsMaxTokens = false
    caps.supportsFrequencyPenalty = false
    caps.supportsPresencePenalty = false
  }
  
  // 嵌入模型
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
 * 结合 supportedEndpointTypes 和模型名称
 */
export function getModelCapabilities(
  modelId: string,
  supportedEndpointTypes?: string[]
): ModelCapabilities {
  if (!modelId) return DEFAULT_CAPABILITIES
  
  // 从端点类型推断基础能力
  const endpointCaps = supportedEndpointTypes 
    ? inferCapabilitiesFromEndpoints(supportedEndpointTypes)
    : {}
  
  // 查找最长匹配的前缀
  let nameMatchedCaps: Partial<ModelCapabilities> = {}
  let maxMatchLength = 0
  
  for (const [prefix, capabilities] of Object.entries(MODEL_CAPABILITIES_MAP)) {
    if (modelId.toLowerCase().startsWith(prefix.toLowerCase())) {
      if (prefix.length > maxMatchLength) {
        maxMatchLength = prefix.length
        nameMatchedCaps = capabilities
      }
    }
  }
  
  // 合并：端点类型优先，然后是名称匹配，最后是默认值
  return {
    ...DEFAULT_CAPABILITIES,
    ...nameMatchedCaps,
    ...endpointCaps,
  }
}

/**
 * 检查模型是否支持特定能力
 */
export function modelSupports(
  modelId: string, 
  capability: keyof ModelCapabilities,
  supportedEndpointTypes?: string[]
): boolean {
  const caps = getModelCapabilities(modelId, supportedEndpointTypes)
  return !!caps[capability]
}

/**
 * 获取参数范围限制
 */
export function getModelParameterLimits(
  modelId: string,
  supportedEndpointTypes?: string[]
) {
  const caps = getModelCapabilities(modelId, supportedEndpointTypes)
  return {
    temperature: caps.temperatureRange,
    maxTokens: { min: 1, max: caps.maxTokensLimit },
  }
}
