import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from '../../shared/types'
import { PromptOptimizeService } from './promptOptimizeService'

const provider: ProviderConfig = {
  id: 'provider-1',
  name: 'Custom Provider',
  baseUrl: 'https://example.test/v1/',
  imageModel: 'gpt-image-2',
  promptModel: 'gpt-5.5',
  hasApiKey: true,
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PromptOptimizeService', () => {
  it('sends moderate clarification instructions for image prompt optimization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: '优化后的提示词' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const service = new PromptOptimizeService()
    await service.optimize(provider, 'sk-test', '一只猫')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    const systemInstruction = body.input[0].content as string

    expect(systemInstruction).toContain('适度')
    expect(systemInstruction).toContain('抽象或模糊')
    expect(systemInstruction).toContain('更容易理解')
    expect(systemInstruction).toContain('不要过度扩写')
    expect(systemInstruction).toContain('不要改变用户意图')
    expect(systemInstruction).toContain('只输出')
    expect(systemInstruction).not.toContain('必须重写')
  })

  it('reads nested Responses output instead of returning the original prompt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: '突出主体轮廓，使用克制的双色构图。'
                  }
                ]
              }
            ]
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )
    )

    await expect(
      new PromptOptimizeService().optimize(provider, 'sk-test', '生成一个软件 Logo')
    ).resolves.toBe('突出主体轮廓，使用克制的双色构图。')
  })

  it('rejects a successful response without text instead of pretending optimization succeeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ output: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    )

    await expect(
      new PromptOptimizeService().optimize(provider, 'sk-test', '生成一个软件 Logo')
    ).rejects.toThrow('Responses API returned no text output')
  })
})
