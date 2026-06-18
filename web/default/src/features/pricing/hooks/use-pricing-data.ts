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
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'
import { getChannels, getPublicChannelStats } from '@/features/channels/api'
import { parseModelsList } from '@/features/channels/lib/channel-utils'
import { getChannelTypeIcon } from '@/features/channels/lib/channel-utils'
import { getPricing } from '../api'
import { OSS_METADATA_URL } from '@/lib/oss-config'

export function usePricingData() {
  const { status } = useStatus()
  const user = useAuthStore((s) => s.auth.user)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pricing'],
    queryFn: getPricing,
    staleTime: 5 * 60 * 1000,
  })

  const { data: channelsData } = useQuery({
    queryKey: ['channels-all'],
    queryFn: () => getChannels({ page_size: 10000 }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const { data: publicChannelsData } = useQuery({
    queryKey: ['channels-public'],
    queryFn: getPublicChannelStats,
    enabled: !user,
    staleTime: 5 * 60 * 1000,
  })

  const { data: customMetadata } = useQuery<Record<string, any>>({
    queryKey: ['customMetadata'],
    queryFn: async () => {
      try {
        const res = await fetch(`${OSS_METADATA_URL}?t=${Date.now()}`)
        if (res.ok) {
          return await res.json()
        }
      } catch (e) {
        console.error('Failed to load custom model metadata:', e)
      }
      return {}
    },
    staleTime: 5 * 60 * 1000,
  })

  // Ensure rates never reach zero to prevent division errors
  const priceRate = useMemo(
    () => Math.max((status?.price as number) ?? 1, 0.001),
    [status?.price]
  )
  const usdExchangeRate = useMemo(
    () => Math.max((status?.usd_exchange_rate as number) ?? priceRate, 0.001),
    [status?.usd_exchange_rate, priceRate]
  )

  const channelMap = useMemo(() => {
    const items =
      channelsData?.data?.items ?? publicChannelsData?.data?.items ?? []
    const map = new Map<string, { count: number; iconSet: Set<string> }>()

    for (const channel of items) {
      const modelList = parseModelsList(channel.models)
      const icon = getChannelTypeIcon(channel.type)
      for (const modelName of modelList) {
        const entry = map.get(modelName)
        if (entry) {
          entry.count += 1
          entry.iconSet.add(icon)
        } else {
          map.set(modelName, { count: 1, iconSet: new Set([icon]) })
        }
      }
    }
    return map
  }, [channelsData, publicChannelsData])

  const models = useMemo(() => {
    if (!data?.data || !data?.vendors) return []

    const vendorMap = new Map(data.vendors.map((v) => [v.id, v]))

    return data.data.map((model) => {
      const vendor = model.vendor_id
        ? vendorMap.get(model.vendor_id)
        : undefined
      const custom = customMetadata?.[model.model_name] || {}
      const channelInfo = channelMap.get(model.model_name)
      return {
        ...model,
        key: model.model_name,
        vendor_name: vendor?.name,
        vendor_icon: vendor?.icon,
        vendor_description: vendor?.description,
        group_ratio: data.group_ratio,
        context_length: custom.context_length ?? model.context_length,
        max_output_tokens: custom.max_output_tokens ?? model.max_output_tokens,
        knowledge_cutoff: custom.knowledge_cutoff ?? model.knowledge_cutoff,
        release_date: custom.release_date ?? model.release_date,
        parameter_count: custom.parameter_count ?? model.parameter_count,
        input_modalities: custom.input_modalities ?? model.input_modalities,
        output_modalities: custom.output_modalities ?? model.output_modalities,
        capabilities: custom.capabilities ?? model.capabilities,
        description: custom.description ?? model.description,
        _channel_count: channelInfo?.count ?? 0,
        _channel_icons: channelInfo
          ? Array.from(channelInfo.iconSet)
          : undefined,
      }
    })
  }, [data, customMetadata, channelMap])

  return {
    models,
    vendors: data?.vendors ?? [],
    groupRatio: data?.group_ratio ?? {},
    usableGroup: data?.usable_group ?? {},
    endpointMap: data?.supported_endpoint ?? {},
    autoGroups: data?.auto_groups ?? [],
    isLoading,
    error,
    refetch,
    priceRate,
    usdExchangeRate,
  }
}
