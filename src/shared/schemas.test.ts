import { describe, expect, test } from 'vitest'
import {
  buildLogoPromptPackSchema,
  createGenerationSchema,
  logoPromptPackSchema,
  saveLogoProjectSchema
} from './schemas'

describe('logo schemas', () => {
  test('accepts a minimal logo project brief', () => {
    const result = saveLogoProjectSchema.parse({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者用 AI 生成图片',
      brandKeywords: ['清晰', '创造力'],
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal', 'symbolic-mark'],
      referenceImageIds: []
    })

    expect(result.brandName).toBe('生花')
    expect(result.styleDirections).toHaveLength(2)
    expect(buildLogoPromptPackSchema.parse(result).brandName).toBe('生花')
  })

  test('rejects more than four style directions', () => {
    expect(() =>
      saveLogoProjectSchema.parse({
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者用 AI 生成图片',
        brandKeywords: ['清晰'],
        logoTypes: ['combination-mark'],
        styleDirections: ['modern-minimal', 'symbolic-mark', 'wordmark', 'lettermark', 'emblem'],
        referenceImageIds: []
      })
    ).toThrow()
  })

  test('accepts logo metadata on generation input', () => {
    const promptPack = logoPromptPackSchema.parse({
      basePrompt: 'base prompt',
      directions: [
        {
          id: 'modern-minimal',
          name: '现代极简',
          prompt: 'modern direction prompt',
          finalPrompt: 'base prompt\nmodern direction prompt'
        }
      ]
    })

    const input = createGenerationSchema.parse({
      providerId: 'provider-1',
      prompt: 'base prompt\nmodern direction prompt',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: 'project-1',
      scenarioMetadata: {
        logoProjectId: 'project-1',
        styleDirectionId: 'modern-minimal',
        styleDirectionName: '现代极简',
        logoTypes: ['combination-mark'],
        promptPackSnapshot: promptPack,
        finalPrompt: 'base prompt\nmodern direction prompt',
        briefSnapshot: {
          brandName: '生花',
          industry: 'AI 绘图软件',
          businessDescription: '帮助创作者用 AI 生成图片',
          brandKeywords: ['清晰']
        },
        qualityRulesVersion: 1
      }
    })

    expect(input.scenario).toBe('logo-design')
  })
})
