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
import { SSE } from 'sse.js'
import type { UIMessage } from 'ai'
import { getCommonHeaders } from '@/lib/api'
import type {
  TransportOptions,
  StreamCallbacks,
  NewApiChatRequest,
} from './types'
import { toNewApiMessages, parseStreamChunk } from './adapter'

/**
 * Custom Transport for new-api
 */
export class NewApiTransport {
  private abortController: AbortController | null = null
  private options: TransportOptions

  constructor(options: TransportOptions) {
    this.options = options
  }

  /**
   * Abort ongoing request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Build request body
   */
  private buildRequest(
    messages: UIMessage[],
    params: {
      model: string
      group?: string
      stream: boolean
      temperature?: number
      top_p?: number
      max_tokens?: number
      frequency_penalty?: number
      presence_penalty?: number
      seed?: number
    }
  ): NewApiChatRequest {
    return {
      model: params.model,
      group: params.group,
      messages: toNewApiMessages(messages),
      stream: params.stream,
      temperature: params.temperature,
      top_p: params.top_p,
      max_tokens: params.max_tokens,
      frequency_penalty: params.frequency_penalty,
      presence_penalty: params.presence_penalty,
      seed: params.seed,
    }
  }

  /**
   * Stream chat completion
   */
  async stream(
    messages: UIMessage[],
    params: {
      model: string
      group?: string
      stream: boolean
      temperature?: number
      top_p?: number
      max_tokens?: number
      frequency_penalty?: number
      presence_penalty?: number
      seed?: number
    },
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.abortController = new AbortController()

    const requestBody = this.buildRequest(messages, params)

    return new Promise((resolve, reject) => {
      const es = new SSE(this.options.api, {
        method: 'POST',
        headers: {
          ...getCommonHeaders(),
          ...this.options.headers,
        },
        payload: JSON.stringify(requestBody),
      })

      es.onmessage = (event: { data: string }) => {
        const chunk = parseStreamChunk(event.data)
        if (!chunk) {
          es.close()
          callbacks.onComplete()
          resolve()
          return
        }

        const choice = chunk.choices?.[0]
        if (!choice) return

        const content = choice.delta?.content || null
        const reasoning = choice.delta?.reasoning_content || null

        callbacks.onMessage(content, reasoning)

        if (choice.finish_reason) {
          es.close()
          callbacks.onComplete()
          resolve()
        }
      }

      es.onerror = (error: unknown & { data?: string }) => {
        es.close()
        let message = error instanceof Error ? error.message : 'Stream error'
        let code: string | undefined
        
        // 解析后端返回的错误信息（像老版 playground 一样）
        if (error?.data) {
          try {
            const parsed = JSON.parse(error.data) as {
              error?: { message?: string; code?: string }
            }
            if (parsed?.error?.message) {
              message = parsed.error.message
            }
            if (parsed?.error?.code) {
              code = parsed.error.code
            }
          } catch {
            // 不是 JSON，使用原始字符串
            message = error.data
          }
        }
        
        callbacks.onError(message, code)
        reject(new Error(message))
      }
    })
  }

  /**
   * Non-streaming request
   */
  async request(
    messages: UIMessage[],
    params: {
      model: string
      group?: string
      stream: boolean
      temperature?: number
      top_p?: number
      max_tokens?: number
      frequency_penalty?: number
      presence_penalty?: number
      seed?: number
    }
  ): Promise<{ content: string; reasoning?: string }> {
    this.abortController = new AbortController()

    const requestBody = this.buildRequest(messages, { ...params, stream: false })

    const response = await fetch(this.options.api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.options.headers,
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController.signal,
      credentials: this.options.credentials || 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    return {
      content: choice?.message?.content || '',
      reasoning: choice?.message?.reasoning_content,
    }
  }
}
