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
import { StickToBottom } from 'use-stick-to-bottom'
import type { ExtendedMessage } from '../../ai-sdk/types'
import { ChatMessage } from './chat-message'

interface ChatThreadProps {
  messages: ExtendedMessage[]
  isGenerating: boolean
  onRegenerate: (messageId: string) => void
  onEdit: (messageId: string, newContent: string) => void
  onDelete: (messageId: string) => void
}

export const ChatThread = memo(function ChatThread(props: ChatThreadProps) {
  const { messages, isGenerating, onRegenerate, onEdit, onDelete } = props

  return (
    <StickToBottom className="flex-1 overflow-hidden" initial="smooth" resize="smooth">
      <StickToBottom.Content className="p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Start a conversation...
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message as ExtendedMessage}
                isGenerating={isGenerating && index === messages.length - 1}
                onRegenerate={() => onRegenerate(message.id)}
                onEdit={(content) => onEdit(message.id, content)}
                onDelete={() => onDelete(message.id)}
              />
            ))
          )}
        </div>
      </StickToBottom.Content>
    </StickToBottom>
  )
})
