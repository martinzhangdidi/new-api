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
import { useTranslation } from 'react-i18next'
import { Bot } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ModelOption } from '../../types'

interface ModelSelectorProps {
  models: ModelOption[]
  selected: string
  onSelect: (value: string) => void
  isLoading?: boolean
  className?: string
}

export function ModelSelector(props: ModelSelectorProps) {
  const { t } = useTranslation()
  const { models, selected, onSelect, isLoading, className } = props

  const selectedModel = useMemo(() => {
    return models.find((m) => m.value === selected)
  }, [models, selected])

  return (
    <div className={`rounded-lg border bg-background p-3 ${className || ''}`}>
      <div className="flex items-center gap-2 text-sm font-medium mb-2">
        <Bot size={16} />
        {t('Model')}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-2">{t('Loading...')}</div>
      ) : models.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">{t('No models')}</div>
      ) : (
        <Select value={selected} onValueChange={(v) => v && onSelect(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('Select model')}>
              {selectedModel?.label || t('Select model')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
