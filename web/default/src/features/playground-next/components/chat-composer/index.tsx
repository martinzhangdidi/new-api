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
import { useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Square, X, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Attachment } from '../../types'
import { modelSupports } from '../../lib/model-capabilities'
import { cn } from '@/lib/utils'

interface ChatComposerProps {
  input: string
  onInputChange: (value: string) => void
  attachments: Attachment[]
  onAddAttachment: (file: File) => Promise<void>
  onRemoveAttachment: (id: string) => void
  onSubmit: () => void
  onStop: () => void
  isGenerating: boolean
  disabled?: boolean
  modelId?: string
  supportedEndpointTypes?: string[]
}

export function ChatComposer(props: ChatComposerProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    input,
    onInputChange,
    attachments,
    onRemoveAttachment,
    onSubmit,
    onStop,
    isGenerating,
    disabled,
    onAddAttachment,
    modelId,
    supportedEndpointTypes,
  } = props

  const supportsVision = modelSupports(modelId || '', 'vision', supportedEndpointTypes)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      for (const file of Array.from(files)) {
        await onAddAttachment(file)
      }
      e.target.value = ''
    },
    [onAddAttachment]
  )

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isGenerating && !disabled && input.trim()) {
          onSubmit()
        }
      }
    },
    [isGenerating, disabled, input, onSubmit]
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  const canSubmit = !disabled && input.trim() && !isGenerating

  return (
    <div className="border-t bg-background/80 backdrop-blur-sm p-4">
      <div className="max-w-3xl mx-auto">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 px-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted border hover:border-primary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center overflow-hidden">
                  <img src={att.url} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {att.name}
                </span>
                <button
                  onClick={() => onRemoveAttachment(att.id)}
                  className="p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modern Input Area */}
        <div className="relative flex items-end gap-2 rounded-2xl border bg-background shadow-sm hover:shadow-md transition-shadow p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Image Upload Button */}
          <Button
            onClick={handleImageClick}
            variant="ghost"
            size="icon"
            disabled={!supportsVision || isGenerating}
            className={cn(
              "shrink-0 rounded-xl size-9",
              supportsVision
                ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            aria-label={t('Upload image')}
            title={supportsVision ? t('Upload image') : t('Current model does not support image input')}
          >
            <Paperclip size={18} />
          </Button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={disabled ? t('Select a model to start') : t('Message...')}
            disabled={disabled || isGenerating}
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none disabled:cursor-not-allowed min-h-[36px] max-h-[120px] placeholder:text-muted-foreground/60"
          />

          {/* Send/Stop Button */}
          {isGenerating ? (
            <Button
              onClick={onStop}
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={t('Stop')}
            >
              <Square size={16} fill="currentColor" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={!canSubmit}
              variant="default"
              size="icon"
              className={cn(
                "shrink-0 rounded-xl size-9 transition-all",
                canSubmit
                  ? "bg-primary hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label={t('Send')}
            >
              <Send size={16} className={cn(canSubmit && "ml-0.5")} />
            </Button>
          )}
        </div>

        {/* Helper Text */}
        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          {t('Shift + Enter for new line')}
        </p>
      </div>
    </div>
  )
}
