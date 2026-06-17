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
import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Copy, Layers, Maximize2, CalendarClock, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { StatusBadge } from '@/components/status-badge'
import { DEFAULT_TOKEN_UNIT } from '../constants'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPricingSummary,
} from '../lib/dynamic-price'
import { parseTags } from '../lib/filters'
import { isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice, formatRequestPrice } from '../lib/price'
import {
  inferModelMetadata,
  formatTokenCount,
  formatYearMonth,
} from '../lib/model-metadata'
import { ModalityIcons } from './model-details-modalities'
import type { PricingModel, TokenUnit } from '../types'
import { ModelPerfBadge, type ModelPerfBadgeData } from './model-perf-badge'

export interface ModelCardProps {
  model: PricingModel
  onClick: () => void
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  perf?: ModelPerfBadgeData
}

export const ModelCard = memo(function ModelCard(props: ModelCardProps) {
  const { t } = useTranslation()
  const { copyToClipboard } = useCopyToClipboard()
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const priceRate = props.priceRate ?? 1
  const usdExchangeRate = props.usdExchangeRate ?? 1
  const showRechargePrice = props.showRechargePrice ?? false
  const isTokenBased = isTokenBasedModel(props.model)
  const tokenUnitLabel = tokenUnit === 'K' ? '1K' : '1M'
  const tags = parseTags(props.model.tags)
  const groups = props.model.enable_groups || []
  const endpoints = props.model.supported_endpoint_types || []
  const vendorIcon = props.model.vendor_icon
    ? getLobeIcon(props.model.vendor_icon, 28)
    : null
  const initial = props.model.model_name?.charAt(0).toUpperCase() || '?'
  const isDynamicPricing =
    props.model.billing_mode === 'tiered_expr' &&
    Boolean(props.model.billing_expr)
  const hasCachedPrice = isTokenBased && props.model.cache_ratio != null
  const dynamicSummary = isDynamicPricing
    ? getDynamicPricingSummary(props.model, {
        tokenUnit,
        showRechargePrice,
        priceRate,
        usdExchangeRate,
        groupRatioMultiplier: getDynamicDisplayGroupRatio(props.model),
      })
    : null

  const primaryGroup = groups[0]
  const bottomTags = [...endpoints.slice(0, 2), ...tags.slice(0, 2)]
  const hiddenCount =
    Math.max(groups.length - 1, 0) +
    Math.max(endpoints.length - 2, 0) +
    Math.max(tags.length - 2, 0)

  const metadata = inferModelMetadata(props.model)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    copyToClipboard(props.model.model_name || '')
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border p-3 transition-colors sm:p-5',
        'hover:bg-muted/20'
      )}
    >
      {/* Header: icon + name + price + actions */}
      <div className='flex items-start justify-between gap-2.5 sm:gap-3'>
        <div className='flex min-w-0 items-start gap-2.5 sm:gap-3'>
          <div className='bg-muted/40 flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10 sm:rounded-xl'>
            {vendorIcon || (
              <span className='text-muted-foreground text-sm font-bold'>
                {initial}
              </span>
            )}
          </div>
          <div className='min-w-0'>
            <h3 className='text-foreground truncate font-mono text-[15px] leading-tight font-bold'>
              {props.model.model_name}
            </h3>
            <div className='mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs sm:mt-1 sm:gap-x-3'>
              {dynamicSummary ? (
                dynamicSummary.isSpecialExpression ? (
                  <span className='min-w-0'>
                    <span className='text-amber-700 dark:text-amber-300'>
                      {t('Special billing expression')}
                    </span>
                    <code className='text-muted-foreground/70 mt-0.5 line-clamp-1 block font-mono text-[11px] break-all'>
                      {dynamicSummary.rawExpression}
                    </code>
                  </span>
                ) : dynamicSummary.primaryEntries.length > 0 ? (
                  <>
                    {dynamicSummary.primaryEntries.map((entry) => (
                      <span
                        key={entry.key}
                        className='text-muted-foreground whitespace-nowrap'
                      >
                        {t(entry.shortLabel)}{' '}
                        <span className='text-foreground font-mono font-semibold'>
                          {entry.formatted}
                        </span>
                        /{tokenUnitLabel}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className='text-muted-foreground text-xs'>
                    {t('Dynamic Pricing')}
                  </span>
                )
              ) : isTokenBased ? (
                <>
                  <span className='text-muted-foreground whitespace-nowrap'>
                    {t('Input')}{' '}
                    <span className='text-foreground font-mono font-semibold'>
                      {formatPrice(
                        props.model,
                        'input',
                        tokenUnit,
                        showRechargePrice,
                        priceRate,
                        usdExchangeRate
                      )}
                    </span>
                    /{tokenUnitLabel}
                  </span>
                  <span className='text-muted-foreground whitespace-nowrap'>
                    {t('Output')}{' '}
                    <span className='text-foreground font-mono font-semibold'>
                      {formatPrice(
                        props.model,
                        'output',
                        tokenUnit,
                        showRechargePrice,
                        priceRate,
                        usdExchangeRate
                      )}
                    </span>
                    /{tokenUnitLabel}
                  </span>
                  {hasCachedPrice && (
                    <span className='text-muted-foreground/60 whitespace-nowrap'>
                      {t('Cached')}{' '}
                      <span className='font-mono'>
                        {formatPrice(
                          props.model,
                          'cache',
                          tokenUnit,
                          showRechargePrice,
                          priceRate,
                          usdExchangeRate
                        )}
                      </span>
                    </span>
                  )}
                </>
              ) : (
                <span className='text-muted-foreground whitespace-nowrap'>
                  <span className='text-foreground font-mono font-semibold'>
                    {formatRequestPrice(
                      props.model,
                      showRechargePrice,
                      priceRate,
                      usdExchangeRate
                    )}
                  </span>{' '}
                  / {t('request')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-1.5'>
          <Link
            to='/playground-next'
            search={{ model: props.model.model_name }}
            className='bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors sm:px-2.5 sm:py-1.5'
          >
            <Play className='size-3' />
            {t('Interact')}
          </Link>
          <Link
            to='/pricing/$modelId'
            params={{ modelId: props.model.model_name }}
            search={(prev) => prev}
            className='text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors sm:px-2.5 sm:py-1.5'
          >
            {t('Details')}
            <ChevronRight className='size-3.5' />
          </Link>
          <button
            type='button'
            onClick={handleCopy}
            className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-md border p-1.5 transition-colors'
            title={t('Copy')}
          >
            <Copy className='size-3.5' />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className='text-muted-foreground mt-2 line-clamp-1 flex-1 text-[13px] leading-relaxed sm:mt-4 sm:line-clamp-2 sm:min-h-[2.5rem]'>
        {props.model.description || t('No description available.')}
      </p>

      {/* Info section — 2 full-width borders only */}
      <div className='mt-2 flex flex-col gap-2 border-t pt-2 sm:mt-3 sm:pt-3'>
        {/* Upper: metadata */}
        <div className='space-y-2'>
          {/* Modalities flow: input → output */}
          <div className='flex items-center gap-2 text-xs'>
            <span className='text-muted-foreground/60 inline-flex items-center gap-1'>
              <ModalityIcons modalities={metadata.input_modalities} className='size-3' />
              <span className='text-[10px] uppercase tracking-wider'>Input</span>
            </span>
            <span className='text-muted-foreground/30'>→</span>
            <span className='text-muted-foreground/60 inline-flex items-center gap-1'>
              <ModalityIcons modalities={metadata.output_modalities} className='size-3' />
              <span className='text-[10px] uppercase tracking-wider'>Output</span>
            </span>
          </div>

          {/* Quick stats grid */}
          <div className='grid grid-cols-3 gap-2'>
            <div className='flex flex-col gap-0.5'>
              <span className='text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase'>
                <Layers className='size-3 shrink-0' />
                <span className='truncate'>{t('Context')}</span>
              </span>
              <span className='text-foreground text-sm font-semibold tabular-nums'>
                {formatTokenCount(metadata.context_length)}
              </span>
            </div>
            <div className='flex flex-col gap-0.5'>
              <span className='text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase'>
                <Maximize2 className='size-3 shrink-0' />
                <span className='truncate'>{t('Max Output')}</span>
              </span>
              <span className='text-foreground text-sm font-semibold tabular-nums'>
                {formatTokenCount(metadata.max_output_tokens)}
              </span>
            </div>
            <div className='flex flex-col gap-0.5'>
              <span className='text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase'>
                <CalendarClock className='size-3 shrink-0' />
                <span className='truncate'>{t('Released')}</span>
              </span>
              <span className='text-foreground text-sm font-semibold tabular-nums'>
                {formatYearMonth(metadata.release_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Lower: groups/tags/provider/perf — second border */}
        <div className='flex flex-col gap-2 border-t pt-2'>
          {/* Groups + type + tags */}
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            {primaryGroup && (
              <span className='text-muted-foreground text-xs font-medium'>
                {primaryGroup} {t('Groups')}
              </span>
            )}
            <span className='text-muted-foreground text-xs font-medium'>
              {isTokenBased ? t('Token-based') : t('Per Request')}
            </span>
            {isDynamicPricing && (
              <StatusBadge
                label={t('Dynamic Pricing')}
                variant='warning'
                copyable={false}
                size='sm'
              />
            )}
            {bottomTags.map((item) => (
              <span key={item} className='text-muted-foreground/70 text-xs'>
                {item}
              </span>
            ))}
            <span className='text-muted-foreground/50 text-xs'>
              {tokenUnitLabel}
            </span>
            {hiddenCount > 0 && (
              <span className='text-muted-foreground/40 text-xs'>
                +{hiddenCount}
              </span>
            )}
          </div>

          {/* Provider + perf */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground/60'>
              {props.model._channel_icons && props.model._channel_icons.length > 0 && (
                <span className='inline-flex items-center gap-0.5'>
                  {props.model._channel_icons.slice(0, 3).map((iconName, idx) => (
                    <span key={idx} className='inline-flex size-4 items-center justify-center'>
                      {getLobeIcon(`${iconName}.Color`, 14)}
                    </span>
                  ))}
                </span>
              )}
              <span>
                {props.model._channel_count && props.model._channel_count > 0
                  ? t('Available on {{count}} provider', { count: props.model._channel_count })
                  : t('No channel available')}
              </span>
            </div>
            <ModelPerfBadge perf={props.perf} />
          </div>
        </div>
      </div>
    </div>
  )
})
