import { afterEach, describe, expect, test, vi } from 'vitest'
import { logoTestProvider } from '../../shared/logoDesign.testFixtures'
import { OpenAIResponsesClient, type ResponsesInputMessage } from './openAIResponsesClient'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(payload: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('OpenAIResponsesClient', () => {
  test('posts the exact Responses request after trimming trailing base URL slashes', async () => {
    const fetchMock = stubFetch({ output_text: 'generated text' })
    const input: ResponsesInputMessage[] = [
      { role: 'system', content: 'Follow the schema.' },
      { role: 'user', content: 'Generate strategies.' }
    ]

    await new OpenAIResponsesClient().createText(
      { ...logoTestProvider, baseUrl: 'https://api.example.test/v1///' },
      'sk-test',
      input
    )

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sk-test',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: logoTestProvider.promptModel, input })
    })
  })

  test('prefers a non-empty top-level output_text convenience field', async () => {
    stubFetch({
      output_text: 'top-level text',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'nested text' }]
        }
      ]
    })

    await expect(
      new OpenAIResponsesClient().createText(logoTestProvider, 'sk-test', [])
    ).resolves.toBe('top-level text')
  })

  test('reads official nested Responses output when output_text is absent', async () => {
    stubFetch({
      id: 'resp_123',
      object: 'response',
      created_at: 1_784_006_400,
      status: 'completed',
      error: null,
      incomplete_details: null,
      model: logoTestProvider.promptModel,
      output: [
        {
          id: 'msg_123',
          type: 'message',
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              annotations: [],
              logprobs: [],
              text: '{"semantics":{},'
            },
            {
              type: 'output_text',
              annotations: [],
              logprobs: [],
              text: '"strategies":[]}'
            }
          ]
        }
      ],
      usage: {
        input_tokens: 10,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens: 12,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 22
      }
    })

    await expect(
      new OpenAIResponsesClient().createText(logoTestProvider, 'sk-test', [])
    ).resolves.toBe('{"semantics":{},"strategies":[]}')
  })

  test('ignores reasoning and non-text output content items', async () => {
    stubFetch({
      output_text: '   ',
      output: [
        { type: 'reasoning', summary: [{ type: 'summary_text', text: 'private reasoning' }] },
        {
          type: 'message',
          content: [
            { type: 'input_text', text: 'input echo' },
            { type: 'refusal', refusal: 'not used' },
            { type: 'output_text', text: 'first' },
            { type: 'output_text', text: 42 },
            { type: 'output_text', text: ' second' }
          ]
        }
      ]
    })

    await expect(
      new OpenAIResponsesClient().createText(logoTestProvider, 'sk-test', [])
    ).resolves.toBe('first second')
  })

  test('includes the HTTP status and response body for non-2xx responses', async () => {
    stubFetch('provider unavailable', 503)

    await expect(
      new OpenAIResponsesClient().createText(logoTestProvider, 'sk-test', [])
    ).rejects.toThrow('Responses request failed: 503 provider unavailable')
  })

  test('rejects successful responses that contain only blank text', async () => {
    stubFetch({
      output_text: '\n  ',
      output: [
        {
          type: 'message',
          content: [
            { type: 'output_text', text: ' ' },
            { type: 'output_text', text: '\n' }
          ]
        }
      ]
    })

    await expect(
      new OpenAIResponsesClient().createText(logoTestProvider, 'sk-test', [])
    ).rejects.toThrow('Responses API returned no text output')
  })
})
