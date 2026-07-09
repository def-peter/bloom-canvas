import { readFile } from 'fs/promises'
import { basename } from 'path'
import type { Asset, GenerationParameters, ProviderConfig } from '../../shared/types'

export interface GenerateImageRequest {
  provider: ProviderConfig
  apiKey: string
  prompt: string
  references: Asset[]
  parameters: GenerationParameters
}

export interface GeneratedImage {
  buffer: Buffer
  revisedPrompt?: string
}

export class OpenAICompatibleProvider {
  async generateImages(request: GenerateImageRequest): Promise<GeneratedImage[]> {
    const endpoint = request.references.length > 0 ? 'images/edits' : 'images/generations'
    const url = `${request.provider.baseUrl.replace(/\/+$/, '')}/${endpoint}`
    const response =
      request.references.length > 0
        ? await this.postImageEdit(url, request)
        : await this.postTextToImage(url, request)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Provider request failed: ${response.status} ${text}`)
    }

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string; revised_prompt?: string }>
    }
    const items = payload.data ?? []
    if (items.length === 0) {
      throw new Error('Provider returned no images')
    }

    return items.map((item) => {
      if (!item.b64_json) {
        throw new Error('Provider response missing b64_json image data')
      }

      return {
        buffer: Buffer.from(item.b64_json, 'base64'),
        revisedPrompt: item.revised_prompt
      }
    })
  }

  private async postTextToImage(url: string, request: GenerateImageRequest): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.provider.imageModel,
        prompt: request.prompt,
        size: request.parameters.size,
        n: request.parameters.count,
        quality: request.parameters.quality,
        response_format: 'b64_json',
        output_format: request.parameters.outputFormat
      })
    })
  }

  private async postImageEdit(url: string, request: GenerateImageRequest): Promise<Response> {
    const form = new FormData()
    form.set('model', request.provider.imageModel)
    form.set('prompt', request.prompt)
    form.set('size', request.parameters.size)
    form.set('n', String(request.parameters.count))
    form.set('quality', request.parameters.quality)
    form.set('response_format', 'b64_json')
    form.set('output_format', request.parameters.outputFormat)

    for (const reference of request.references) {
      const bytes = await readFile(reference.filePath)
      const blob = new Blob([new Uint8Array(bytes)], { type: reference.mimeType })
      form.append('image[]', blob, basename(reference.filePath))
    }

    return fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.apiKey}`
      },
      body: form
    })
  }
}
