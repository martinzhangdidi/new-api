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
import type { PricingModel } from '@/features/pricing/types'
import { getPricing } from '@/features/pricing/api'
import { API_ENDPOINTS } from './constants'
import { api } from '@/lib/api'
import type { ModelOption, GroupOption } from './types'

/**
 * Get available models for user
 * 复用 /api/pricing 接口，获取模型能力数据（tags、supported_endpoint_types）
 */
export async function getUserModels(): Promise<ModelOption[]> {
  const pricingData = await getPricing()
  if (!pricingData.success || !Array.isArray(pricingData.data)) {
    return []
  }

  return pricingData.data.map((model: PricingModel) => ({
    label: model.model_name,
    value: model.model_name,
    supportedEndpointTypes: model.supported_endpoint_types,
    tags: model.tags,
  }))
}

/**
 * Get available groups for user
 */
export async function getUserGroups(): Promise<GroupOption[]> {
  const res = await api.get(API_ENDPOINTS.GROUPS)
  const { data } = res

  if (!data.success || !data.data) {
    return []
  }

  const groupData = data.data as Record<string, { desc: string; ratio: number }>

  return Object.entries(groupData).map(([group, info]) => ({
    label: group,
    value: group,
  }))
}
