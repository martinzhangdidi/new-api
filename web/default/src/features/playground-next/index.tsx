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
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { getUserModels, getUserGroups } from './api'
import { ParametersPanel } from './components/parameters-panel'
import { ChannelSelector } from './components/channel-selector'
import { ModelSelector } from './components/model-selector'
import { ChatThread } from './components/chat-thread'
import { ChatComposer } from './components/chat-composer'
import { useAttachments, useParameters, useCustomChat } from './hooks'
import { getModelCapabilities } from './lib/model-capabilities'

export function PlaygroundNext() {
  const { t } = useTranslation()
  const search = useSearch({ from: '/_authenticated/playground-next/' })

  // Selection state
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const urlModel = (search as { model?: string }).model

  // Parameters hook
  const { params, enabled, updateParam, toggleEnabled, buildApiParams } = useParameters()

  // Attachments hook
  const { attachments, addAttachment, removeAttachment, clearAttachments } = useAttachments()

  // Input state
  const [input, setInput] = useState('')

  // Load models
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ['playground-next-models'],
    queryFn: getUserModels,
  })

  // Load groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['playground-next-groups'],
    queryFn: getUserGroups,
  })

  // 获取当前选中模型的能力信息
  const currentModelInfo = useMemo(() => {
    return modelsData?.find((m) => m.value === selectedModel)
  }, [modelsData, selectedModel])

  // 当前模型能力
  const currentModelCaps = useMemo(() => {
    return getModelCapabilities(
      selectedModel,
      currentModelInfo?.supportedEndpointTypes,
      currentModelInfo?.tags
    )
  }, [selectedModel, currentModelInfo])

  // 根据模型能力自动禁用不支持的参数
  useEffect(() => {
    if (!selectedModel) return
    const paramCapabilityMap: Record<string, keyof typeof currentModelCaps> = {
      temperature: 'supportsTemperature',
      topP: 'supportsTopP',
      maxTokens: 'supportsMaxTokens',
      frequencyPenalty: 'supportsFrequencyPenalty',
      presencePenalty: 'supportsPresencePenalty',
      seed: 'supportsSeed',
    }
    Object.entries(paramCapabilityMap).forEach(([paramKey, capKey]) => {
      if (enabled[paramKey as keyof typeof enabled] && !currentModelCaps[capKey]) {
        toggleEnabled(paramKey as keyof typeof enabled)
      }
    })
  }, [selectedModel, currentModelCaps, enabled, toggleEnabled])

  // 构建 API 参数，按模型能力过滤
  const effectiveApiParams = useMemo(() => {
    const apiParams = buildApiParams()
    const result: typeof apiParams = {}
    if (currentModelCaps.supportsTemperature && apiParams.temperature !== undefined) {
      result.temperature = apiParams.temperature
    }
    if (currentModelCaps.supportsTopP && apiParams.topP !== undefined) {
      result.topP = apiParams.topP
    }
    if (currentModelCaps.supportsMaxTokens && apiParams.maxTokens !== undefined) {
      result.maxTokens = apiParams.maxTokens
    }
    if (currentModelCaps.supportsFrequencyPenalty && apiParams.frequencyPenalty !== undefined) {
      result.frequencyPenalty = apiParams.frequencyPenalty
    }
    if (currentModelCaps.supportsPresencePenalty && apiParams.presencePenalty !== undefined) {
      result.presencePenalty = apiParams.presencePenalty
    }
    if (currentModelCaps.supportsSeed && apiParams.seed !== undefined) {
      result.seed = apiParams.seed
    }
    return result
  }, [buildApiParams, currentModelCaps])

  // Chat hook
  const {
    messages,
    isGenerating,
    sendMessage,
    stopGeneration,
    regenerateMessage,
    editMessage,
    deleteMessage,
  } = useCustomChat({
    model: selectedModel,
    group: selectedGroup,
    params: effectiveApiParams,
  })

  // Set defaults — prefer URL model param
  useEffect(() => {
    if (!modelsData?.length) return
    if (urlModel) {
      const exists = modelsData.some((m) => m.value === urlModel)
      if (exists && selectedModel !== urlModel) {
        setSelectedModel(urlModel)
      }
    } else if (!selectedModel) {
      setSelectedModel(modelsData[0].value)
    }
  }, [modelsData, selectedModel, urlModel])

  useEffect(() => {
    if (groupsData?.length && !selectedGroup) {
      const defaultGroup = groupsData.find((g) => g.value === 'default')?.value || groupsData[0].value
      setSelectedGroup(defaultGroup)
    }
  }, [groupsData, selectedGroup])

  // Handle send
  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return
    sendMessage(input, attachments)
    setInput('')
    clearAttachments()
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Controls */}
      <div className="w-64 flex-shrink-0 border-r bg-background overflow-y-auto p-3 space-y-4">
        <ChannelSelector
          groups={groupsData || []}
          selected={selectedGroup}
          onSelect={setSelectedGroup}
          isLoading={isLoadingGroups}
        />
        <ModelSelector
          models={modelsData || []}
          selected={selectedModel}
          onSelect={setSelectedModel}
          isLoading={isLoadingModels}
        />
        <ParametersPanel
          params={params}
          enabled={enabled}
          onParamChange={updateParam}
          onToggleEnabled={toggleEnabled}
          modelId={selectedModel}
          supportedEndpointTypes={currentModelInfo?.supportedEndpointTypes}
          tags={currentModelInfo?.tags}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatThread
          messages={messages}
          isGenerating={isGenerating}
          onRegenerate={regenerateMessage}
          onEdit={editMessage}
          onDelete={deleteMessage}
        />
        <ChatComposer
          input={input}
          onInputChange={setInput}
          attachments={attachments}
          onAddAttachment={addAttachment}
          onRemoveAttachment={removeAttachment}
          onSubmit={handleSend}
          onStop={stopGeneration}
          isGenerating={isGenerating}
          disabled={!selectedModel}
          modelId={selectedModel}
          supportedEndpointTypes={currentModelInfo?.supportedEndpointTypes}
          tags={currentModelInfo?.tags}
        />
      </div>
    </div>
  )
}
