import type { ProviderConfig } from '../../shared/types'

export type ResponsesInputMessage = {
  role: 'system' | 'user'
  content: string
}

export class OpenAIResponsesClient {
  async createText(
    provider: ProviderConfig,
    apiKey: string,
    input: ResponsesInputMessage[]
  ): Promise<string> {
    const response = await fetch(`${provider.baseUrl.replace(/\/+$/, '')}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.promptModel,
        reasoning: { effort: 'high' },
        input
      })
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Responses request failed: ${response.status} ${body}`)
    }

    const payload: unknown = await response.json()
    if (isRecord(payload) && typeof payload.output_text === 'string') {
      const outputText = payload.output_text.trim()
      if (outputText) return outputText
    }

    const nestedText = readNestedOutputText(payload).trim()
    if (nestedText) return nestedText

    throw new Error('Responses API returned no text output')
  }
}

function readNestedOutputText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.output)) return ''

  const textParts: string[] = []
  for (const outputItem of payload.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) continue

    for (const contentItem of outputItem.content) {
      if (
        isRecord(contentItem) &&
        contentItem.type === 'output_text' &&
        typeof contentItem.text === 'string'
      ) {
        textParts.push(contentItem.text)
      }
    }
  }

  return textParts.join('')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
