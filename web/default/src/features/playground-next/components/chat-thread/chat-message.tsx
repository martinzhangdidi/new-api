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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Bot, Copy, RotateCcw, Pencil, Trash2, ChevronDown, ChevronRight, Sparkles, AlertCircle, AlertTriangle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ExtendedMessage } from '../../ai-sdk/types'

interface ChatMessageProps {
  message: ExtendedMessage
  isGenerating: boolean
  onRegenerate: () => void
  onEdit: (newContent: string) => void
  onDelete: () => void
}

export function ChatMessage(props: ChatMessageProps) {
  const { t } = useTranslation()
  const { message, isGenerating, onRegenerate, onEdit, onDelete } = props
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [showReasoning, setShowReasoning] = useState(true)
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = user?.role != null && user.role >= 10

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isError = (message as ExtendedMessage).isError
  const hasReasoning = !!message.reasoning?.content

  // Get text from parts
  const textContent = message.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('') || ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent)
    } catch {
      // Silent fail
    }
  }

  const handleEdit = () => {
    setEditContent(textContent)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    onEdit(editContent)
    setIsEditing(false)
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 flex size-8 items-center justify-center rounded-full ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {/* Reasoning Block */}
        {hasReasoning && (
          <div className="mb-2 rounded-lg border bg-muted/50 overflow-hidden text-left">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
            >
              <Sparkles size={12} />
              <span>{t('Reasoning')}</span>
              {message.reasoning?.isStreaming && (
                <span className="ml-auto flex size-1.5 rounded-full bg-primary animate-pulse" />
              )}
              {showReasoning ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {showReasoning && (
              <div className="px-3 py-2 border-t">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {message.reasoning?.content}
                  {message.reasoning?.isStreaming && (
                    <span className="inline-block w-1 h-3 ml-0.5 bg-primary animate-pulse" />
                  )}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        {isEditing ? (
          <div className="text-left space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded"
              >
                {t('Save')}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs border rounded"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        ) : isError ? (
          message.errorCode === 'model_price_error' ? (
            <div className="text-left rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-3 text-sm text-orange-600 dark:text-orange-400 max-w-none">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{t('Model Price Not Configured')}</p>
                  <p className="text-orange-600/80 dark:text-orange-400/80 mt-1">{textContent}</p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open('/system-settings/billing/model-pricing', '_blank')}
                    >
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      {t('Go to Settings')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-left rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-none">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{t('Error')}</p>
                  <p className="text-destructive/80 mt-1">{textContent}</p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className={`text-left prose prose-sm dark:prose-invert max-w-none ${isUser ? 'bg-primary/10 rounded-lg px-4 py-2 inline-block' : ''}`}>
            <Markdown remarkPlugins={[remarkGfm]}>
              {textContent}
            </Markdown>
            {isGenerating && (
              <span className="inline-block w-[2px] h-4 ml-1 bg-primary/60 animate-pulse" />
            )}
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className={`flex gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
            <Button
              onClick={handleCopy}
              variant="ghost"
              className="size-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label={t('Copy')}
            >
              <Copy size={12} />
            </Button>
            {isUser && (
              <Button
                onClick={handleEdit}
                variant="ghost"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                aria-label={t('Edit')}
              >
                <Pencil size={12} />
              </Button>
            )}
            {isAssistant && !isGenerating && (
              <Button
                onClick={onRegenerate}
                variant="ghost"
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
                aria-label={t('Regenerate')}
              >
                <RotateCcw size={12} />
              </Button>
            )}
            <Button
              onClick={onDelete}
              variant="ghost"
              className="size-6 p-0 text-muted-foreground hover:text-destructive"
              aria-label={t('Delete')}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
