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
import { useState, useCallback } from 'react'
import type { ChatParameters, ParameterEnabled } from '../types'
import { DEFAULT_PARAMETERS, DEFAULT_PARAMETER_ENABLED } from '../constants'

export function useParameters() {
  const [params, setParams] = useState<ChatParameters>(DEFAULT_PARAMETERS)
  const [enabled, setEnabled] = useState<ParameterEnabled>(DEFAULT_PARAMETER_ENABLED)

  const updateParam = useCallback(<K extends keyof ChatParameters>(key: K, value: ChatParameters[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleEnabled = useCallback((key: keyof ParameterEnabled) => {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const reset = useCallback(() => {
    setParams(DEFAULT_PARAMETERS)
    setEnabled(DEFAULT_PARAMETER_ENABLED)
  }, [])

  // Build API params (only enabled ones)
  const buildApiParams = useCallback(() => {
    const result: Partial<ChatParameters> & { seed?: number } = {}
    if (enabled.temperature) result.temperature = params.temperature
    if (enabled.topP) result.topP = params.topP
    if (enabled.maxTokens) result.maxTokens = params.maxTokens
    if (enabled.frequencyPenalty) result.frequencyPenalty = params.frequencyPenalty
    if (enabled.presencePenalty) result.presencePenalty = params.presencePenalty
    if (enabled.seed && params.seed !== null) result.seed = params.seed
    return result
  }, [params, enabled])

  return {
    params,
    enabled,
    updateParam,
    toggleEnabled,
    reset,
    buildApiParams,
  }
}
