import { describe, expect, test } from 'vitest'
import { logoTestBrief, logoTestPromptPack, logoTestRevision } from './logoDesign.testFixtures'
import type { LogoStrategyPromptPack } from './logoDesign'
import {
  buildLogoPromptPackSchema,
  createGenerationSchema,
  generationParametersSchema,
  logoCandidateReviewSchema,
  logoDesignRevisionSchema,
  logoPromptPackSchema,
  logoStrategyPromptPackSchema,
  saveLogoProjectSchema
} from './schemas'

const validGenerationParameters = {
  count: 1,
  quality: 'standard',
  outputFormat: 'png'
} as const

describe('generation parameters schema', () => {
  test.each(['1024x1024', '1024x1536', '1536x1024', 'auto'])('accepts standard size %s', (size) => {
    expect(generationParametersSchema.parse({ ...validGenerationParameters, size }).size).toBe(size)
  })

  test('accepts a valid flexible image size', () => {
    expect(
      generationParametersSchema.parse({
        ...validGenerationParameters,
        size: '1536x864'
      }).size
    ).toBe('1536x864')
  })

  test('rejects a size whose dimensions are not multiples of 16', () => {
    const result = generationParametersSchema.safeParse({
      ...validGenerationParameters,
      size: '1537x864'
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('16')
    }
  })
})

const validStrategy = {
  id: 'strategy-path',
  version: 1,
  nameZh: '连续创作路径',
  summaryZh: '用一条展开路径表达从想法到画面的过程。',
  grammarId: 'continuous-path',
  brandEvidence: ['帮助创作者把想法转化为图片'],
  coreMetaphor: 'an unfolding creative path',
  construction: 'one broad continuous ribbon with two turns',
  silhouette: 'compact open loop',
  composition: 'centered with a stable lower-left visual anchor',
  colorPlan: 'one solid blue with a monochrome fallback',
  recommendedRenderStyles: ['flat-monochrome', 'flat-duotone'],
  exclusions: ['flower petals', 'leaves', 'pseudo-text'],
  rationaleZh: '连续路径对应创作流程，不依赖品牌名中的花。',
  imagePromptEn: 'Create exactly one standalone logo mark.'
} as const

describe('logo schemas', () => {
  test('accepts a scored vision review', () => {
    const review = logoCandidateReviewSchema.parse({
      candidateId: 'variant-1',
      status: 'recommended',
      reviewMode: 'vision-model',
      scores: {
        strategyFit: 86,
        distinctiveness: 78,
        simplicity: 91,
        smallSizePotential: 84,
        craft: 80
      },
      hardFailures: [],
      risksZh: ['内侧转角可以更统一'],
      suggestedRevisionZh: '统一转角半径。',
      revisionInstructionEn: 'Use one consistent corner radius.'
    })

    expect(review.scores?.simplicity).toBe(91)
  })

  test('accepts local-only review without fake scores', () => {
    const review = logoCandidateReviewSchema.parse({
      candidateId: 'variant-1',
      status: 'unreviewed',
      reviewMode: 'local-only',
      hardFailures: [],
      risksZh: [],
      unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
    })

    expect(review.scores).toBeUndefined()
  })

  test('rejects local-only review with aesthetic scores', () => {
    expect(() =>
      logoCandidateReviewSchema.parse({
        candidateId: 'variant-1',
        status: 'unreviewed',
        reviewMode: 'local-only',
        scores: {
          strategyFit: 50,
          distinctiveness: 50,
          simplicity: 50,
          smallSizePotential: 50,
          craft: 50
        },
        hardFailures: [],
        risksZh: [],
        unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
      })
    ).toThrow()
  })

  test('accepts a complete three-strategy design revision', () => {
    const revision = logoDesignRevisionSchema.parse({
      briefVersion: 1,
      strategyVersion: 1,
      grammarLibraryVersion: 1,
      semantics: {
        functionalTruths: ['帮助创作者把想法转化为图片'],
        emotionalQualities: ['清晰', '有创造力'],
        differentiators: ['轻量工作流'],
        audienceSignals: ['个人创作者'],
        usableMetaphors: ['路径', '画布窗口'],
        literalMetaphorRisks: ['花瓣', '叶片'],
        industryCliches: ['AI sparkle', 'robot head'],
        usageConstraints: ['readable at 32px']
      },
      strategies: [
        validStrategy,
        { ...validStrategy, id: 'strategy-frame', grammarId: 'frame-threshold' },
        { ...validStrategy, id: 'strategy-grid', grammarId: 'modular-grid' }
      ],
      selectedStrategyIds: ['strategy-path', 'strategy-frame', 'strategy-grid'],
      createdAt: '2026-07-13T00:00:00.000Z'
    })

    expect(revision.strategies).toHaveLength(3)
  })

  test('rejects a prompt pack whose source prompt version is missing', () => {
    const promptPack: Partial<LogoStrategyPromptPack> = { ...logoTestPromptPack }
    delete promptPack.sourcePromptVersion

    expect(() => logoStrategyPromptPackSchema.parse(promptPack)).toThrow()
  })

  test.each([0, 1.5])('rejects prompt pack source prompt version %s', (sourcePromptVersion) => {
    expect(() =>
      logoStrategyPromptPackSchema.parse({
        ...logoTestPromptPack,
        sourcePromptVersion
      })
    ).toThrow()
  })

  test('rejects a prompt direction whose source prompt version is missing', () => {
    expect(() =>
      logoStrategyPromptPackSchema.parse({
        ...logoTestPromptPack,
        directions: logoTestPromptPack.directions.map((direction, index) =>
          index === 0 ? { ...direction, sourcePromptVersion: undefined } : direction
        )
      })
    ).toThrow()
  })

  test.each([0, 1.5])(
    'rejects prompt direction source prompt version %s',
    (sourcePromptVersion) => {
      expect(() =>
        logoStrategyPromptPackSchema.parse({
          ...logoTestPromptPack,
          directions: logoTestPromptPack.directions.map((direction, index) =>
            index === 0 ? { ...direction, sourcePromptVersion } : direction
          )
        })
      ).toThrow()
    }
  )

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

  test('preserves whether legacy style directions were omitted or explicitly cleared', () => {
    const input = {
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者用 AI 生成图片',
      brandKeywords: ['清晰'],
      logoTypes: ['combination-mark'],
      referenceImageIds: []
    }

    expect(saveLogoProjectSchema.parse(input).styleDirections).toBeUndefined()
    expect(saveLogoProjectSchema.parse({ ...input, styleDirections: [] }).styleDirections).toEqual(
      []
    )
    expect(() => buildLogoPromptPackSchema.parse(input)).toThrow()
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

  test('rejects more than one logo type', () => {
    expect(() =>
      saveLogoProjectSchema.parse({
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者用 AI 生成图片',
        brandKeywords: ['清晰'],
        logoTypes: ['combination-mark', 'symbol-mark'],
        styleDirections: ['modern-minimal'],
        referenceImageIds: []
      })
    ).toThrow()
  })

  test('rejects more than three style directions', () => {
    expect(() =>
      saveLogoProjectSchema.parse({
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者用 AI 生成图片',
        brandKeywords: ['清晰'],
        logoTypes: ['combination-mark'],
        styleDirections: ['modern-minimal', 'symbolic-mark', 'wordmark', 'lettermark'],
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

  test('accepts a V2 logo generation snapshot', () => {
    const input = createGenerationSchema.parse({
      providerId: 'provider-1',
      prompt: 'Create exactly one standalone logo mark.',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'hd',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: 'project-1',
      scenarioMetadata: {
        version: 2,
        logoProjectId: 'project-1',
        strategyId: 'strategy-path',
        strategyNameZh: '连续创作路径',
        grammarId: 'continuous-path',
        candidateIndex: 0,
        logoType: 'combination-mark',
        designRevisionSnapshot: logoTestRevision,
        promptDirectionSnapshot: logoTestPromptPack.directions[0],
        briefSnapshot: logoTestBrief,
        qualityRulesVersion: 2,
        qualityRetryAttempt: 0
      }
    })

    expect(input.scenarioMetadata).toMatchObject({
      version: 2,
      strategyId: 'strategy-path'
    })
  })
})
