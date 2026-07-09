import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenAICompatibleProvider } from './openAICompatibleProvider'
import type { GenerateImageRequest } from './openAICompatibleProvider'

function createRequest(): GenerateImageRequest {
  return {
    provider: {
      id: 'provider-1',
      name: 'OpenAI Compatible',
      baseUrl: 'https://api.example.test/v1',
      imageModel: 'gpt-image-2',
      promptModel: 'gpt-5.5',
      hasApiKey: true,
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z'
    },
    apiKey: 'sk-test',
    prompt: '一朵发光的花',
    references: [],
    parameters: {
      size: '1024x1024',
      count: 1,
      quality: 'standard',
      outputFormat: 'png'
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('OpenAICompatibleProvider', () => {
  it('calls images/generations for text-to-image', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ b64_json: Buffer.from('image-bytes').toString('base64') }]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAICompatibleProvider()
    const result = await provider.generateImages(createRequest())

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' })
      })
    )
    expect(result[0].buffer.toString()).toBe('image-bytes')
  })

  it('surfaces provider errors with the response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid api key'
      })
    )

    await expect(new OpenAICompatibleProvider().generateImages(createRequest())).rejects.toThrow(
      '401 invalid api key'
    )
  })
})
