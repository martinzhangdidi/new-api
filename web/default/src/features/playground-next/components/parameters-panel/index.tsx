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
import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import type { ChatParameters, ParameterEnabled } from '../../types'
import { PARAMETER_RANGES } from '../../constants'
import { getModelCapabilities, ModelCapabilities } from '../../lib/model-capabilities'

interface ParametersPanelProps {
  params: ChatParameters
  enabled: ParameterEnabled
  onParamChange: <K extends keyof ChatParameters>(key: K, value: ChatParameters[K]) => void
  onToggleEnabled: (key: keyof ParameterEnabled) => void
  className?: string
  modelId?: string
  supportedEndpointTypes?: string[]
}

export function ParametersPanel(props: ParametersPanelProps) {
  const { t } = useTranslation()
  const { params, enabled, onParamChange, onToggleEnabled, className, modelId, supportedEndpointTypes } = props
  const [isExpanded, setIsExpanded] = useState(false)

  // 获取模型能力
  const capabilities = useMemo(() => {
    return getModelCapabilities(modelId || '', supportedEndpointTypes)
  }, [modelId, supportedEndpointTypes])

  // 检查是否有任何可调参数
  const hasConfigurableParams = useMemo(() => {
    return capabilities.supportsTemperature ||
      capabilities.supportsTopP ||
      capabilities.supportsMaxTokens ||
      capabilities.supportsFrequencyPenalty ||
      capabilities.supportsPresencePenalty ||
      capabilities.supportsSeed
  }, [capabilities])

  const renderSlider = useCallback(
    (
      key: keyof ChatParameters,
      label: string,
      capabilityKey: keyof ModelCapabilities
    ) => {
      const range = PARAMETER_RANGES[key]
      const value = params[key] ?? range.min
      const isEnabled = enabled[key]
      const isSupported = capabilities[capabilityKey] as boolean

      // 如果不支持此参数，不渲染
      if (!isSupported) return null

      return (
        <div key={key} className={`space-y-2 ${!isEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => onToggleEnabled(key)}
                className="size-4"
              />
              <span className="text-xs text-muted-foreground w-12 text-right">
                {typeof value === 'number' ? value.toFixed(key === 'temperature' || key === 'topP' ? 1 : 0) : '-'}
              </span>
            </div>
          </div>
          <Slider
            value={typeof value === 'number' ? value : range.min}
            onValueChange={(v) => {
              const num = Array.isArray(v) ? v[0] : v
              if (typeof num === 'number') {
                onParamChange(key, key === 'seed' ? (Number.isInteger(num) ? num : Math.floor(num)) : num)
              }
            }}
            min={range.min}
            max={range.max}
            step={range.step}
            disabled={!isEnabled}
            className="w-full"
          />
        </div>
      )
    },
    [params, enabled, onParamChange, onToggleEnabled, capabilities]
  )

  const renderSeedInput = useCallback(() => {
    if (!capabilities.supportsSeed) return null
    const isEnabled = enabled.seed
    return (
      <div className={`space-y-2 ${!isEnabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">{t('Seed')}</label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => onToggleEnabled('seed')}
              className="size-4"
            />
          </div>
        </div>
        <Input
          type="number"
          value={params.seed ?? ''}
          onChange={(e) => onParamChange('seed', e.target.value ? parseInt(e.target.value, 10) : null)}
          disabled={!isEnabled}
          placeholder={t('Random')}
          className="h-8 text-xs"
        />
      </div>
    )
  }, [enabled.seed, params.seed, onParamChange, onToggleEnabled, t, capabilities.supportsSeed])

  return (
    <div className={`rounded-lg border bg-background p-3 ${className || ''}`}>
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
        className="flex w-full items-center justify-between text-sm font-medium h-auto py-2 px-1 hover:bg-transparent"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          {t('Parameters')}
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </Button>

      {isExpanded && hasConfigurableParams && (
        <div className="mt-4 space-y-4">
          {renderSlider('temperature', t('Temperature'), 'supportsTemperature')}
          {renderSlider('topP', t('Top P'), 'supportsTopP')}
          {renderSlider('maxTokens', t('Max Tokens'), 'supportsMaxTokens')}
          {renderSlider('frequencyPenalty', t('Frequency Penalty'), 'supportsFrequencyPenalty')}
          {renderSlider('presencePenalty', t('Presence Penalty'), 'supportsPresencePenalty')}
          {renderSeedInput()}
        </div>
      )}
      {isExpanded && !hasConfigurableParams && (
        <div className="mt-4 text-sm text-muted-foreground">
          {t('Current model does not support parameter adjustment')}
        </div>
      )}
    </div>
  )
}
