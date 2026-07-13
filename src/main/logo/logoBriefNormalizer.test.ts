import { describe, expect, test } from 'vitest'
import type { LogoBrandBriefV2 } from '../../shared/logoDesign'
import { logoTestBrief } from '../../shared/logoDesign.testFixtures'
import {
  createBriefFingerprint,
  createPromptFingerprint,
  normalizeLogoBrief
} from './logoBriefNormalizer'

const brief: LogoBrandBriefV2 = {
  ...logoTestBrief,
  businessDescription: '帮助创作者把想法转化成图片',
  targetAudience: '个人创作者',
  brandKeywords: [' 清晰 ', '创造力', '清晰'],
  avoidedElements: [],
  avoidedColors: []
}

describe('normalizeLogoBrief', () => {
  test('deduplicates values and blocks literal plant and AI cliches', () => {
    const result = normalizeLogoBrief(brief)

    expect(result.brief.brandKeywords).toEqual(['清晰', '创造力'])
    expect(result.dynamicExclusions).toEqual(
      expect.arrayContaining(['flower petals', 'leaves', 'robot heads', 'circuit boards'])
    )
    expect(result.minimumNonLiteralStrategyCount).toBe(2)
  })

  test('trims scalar fields and deterministically maps semantic seeds', () => {
    const result = normalizeLogoBrief({
      ...brief,
      brandName: ' 生花 ',
      industry: ' AI 绘图软件 ',
      businessDescription: ' 帮助创作者把想法转化成图片 ',
      targetAudience: ' 个人创作者 ',
      differentiator: ' 轻量、直接的创作流程 ',
      avoidedElements: [' 复杂花瓣 ', '', '复杂花瓣'],
      usageScenarios: ['website', 'app-icon', 'website']
    })

    expect(result.brief).toMatchObject({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者把想法转化成图片',
      targetAudience: '个人创作者',
      differentiator: '轻量、直接的创作流程',
      avoidedElements: ['复杂花瓣'],
      usageScenarios: ['website', 'app-icon']
    })
    expect(result.semanticSeeds).toMatchObject({
      functionalTruths: ['帮助创作者把想法转化成图片'],
      emotionalQualities: ['清晰', '创造力'],
      differentiators: ['轻量、直接的创作流程'],
      audienceSignals: ['个人创作者'],
      usageConstraints: ['website', 'app-icon']
    })
    expect(result.semanticSeeds.literalMetaphorRisks).toEqual(
      expect.arrayContaining(['flower petals', 'leaves', 'lotus'])
    )
    expect(result.semanticSeeds.industryCliches).toEqual(
      expect.arrayContaining(['brains', 'circuit boards', 'robot heads', 'glowing sparkles'])
    )
  })

  test.each([
    ['数据分析', ['bar charts', 'upward arrows', 'dashboard gauges', 'network nodes']],
    ['保险安全', ['locks', 'shields', 'keyholes', 'shadow people']],
    ['全球物流', ['globes', 'location pins', 'airplanes', 'speed lines']],
    ['可持续环保', ['leaves', 'globes', 'recycling arrows']]
  ])('adds cliches for %s', (industry, exclusions) => {
    const result = normalizeLogoBrief({
      ...brief,
      brandName: 'Example',
      brandNameAlt: undefined,
      industry,
      businessDescription: 'A focused service'
    })

    expect(result.dynamicExclusions).toEqual(expect.arrayContaining(exclusions))
  })

  test('does not ban an element the user explicitly requires', () => {
    const result = normalizeLogoBrief({
      ...brief,
      referenceNote: '必须使用一片叶子，但要避免普通环保图库感'
    })

    expect(result.explicitlyRequestedElements).toContain('leaves')
    expect(result.dynamicExclusions).not.toContain('leaves')
    expect(result.semanticSeeds.literalMetaphorRisks).not.toContain('leaves')
    expect(result.semanticSeeds.industryCliches).not.toContain('leaves')
  })

  test('recognizes explicit elements in the business description', () => {
    const result = normalizeLogoBrief({
      ...brief,
      businessDescription: 'The symbol is required to include a robot head'
    })

    expect(result.explicitlyRequestedElements).toContain('robot heads')
    expect(result.dynamicExclusions).not.toContain('robot heads')
  })

  test('keeps negated elements excluded when another element is explicitly required', () => {
    const result = normalizeLogoBrief({
      ...brief,
      brandName: 'Example',
      brandNameAlt: undefined,
      industry: '可持续品牌',
      referenceNote: 'must use a globe, but do not include leaves'
    })

    expect(result.explicitlyRequestedElements).toContain('globes')
    expect(result.explicitlyRequestedElements).not.toContain('leaves')
    expect(result.dynamicExclusions).not.toContain('globes')
    expect(result.dynamicExclusions).toContain('leaves')
  })

  test.each([
    '不需要叶子，也非必须使用花瓣',
    '无需明确使用叶子，也不是必须使用花瓣',
    '明确不使用叶子',
    '明确不包含叶子',
    '必须不使用叶子',
    '需要不包含叶子',
    '明确不能包含叶子',
    '明确不可包含叶子',
    '明确排除叶子',
    '明确去掉叶子'
  ])('does not treat Chinese negated requirements as explicit requests: %s', (referenceNote) => {
    const result = normalizeLogoBrief({
      ...brief,
      referenceNote
    })

    expect(result.explicitlyRequestedElements).not.toContain('leaves')
    expect(result.explicitlyRequestedElements).not.toContain('flower petals')
    expect(result.dynamicExclusions).toContain('leaves')
    expect(result.dynamicExclusions).toContain('flower petals')
  })

  test.each([
    ["don't include leaves", 'leaves'],
    ['never include flower petals', 'flower petals']
  ])(
    'does not treat English negated requirements as explicit requests: %s',
    (referenceNote, element) => {
      const result = normalizeLogoBrief({
        ...brief,
        referenceNote
      })

      expect(result.explicitlyRequestedElements).not.toContain(element)
      expect(result.dynamicExclusions).toContain(element)
    }
  )

  test.each([
    '不要叶子同时必须使用地球仪',
    '不需要叶子并且需要地球仪',
    'do not include leaves and must include a globe'
  ])('uses the nearest directive for each element: %s', (referenceNote) => {
    const result = normalizeLogoBrief({
      ...brief,
      brandName: 'Example',
      brandNameAlt: undefined,
      industry: '可持续品牌',
      referenceNote
    })

    expect(result.explicitlyRequestedElements).toContain('globes')
    expect(result.explicitlyRequestedElements).not.toContain('leaves')
    expect(result.dynamicExclusions).not.toContain('globes')
    expect(result.dynamicExclusions).toContain('leaves')
  })

  test('recognizes multiple elements under one positive directive', () => {
    const result = normalizeLogoBrief({
      ...brief,
      referenceNote: 'must include leaves and globes'
    })

    expect(result.explicitlyRequestedElements).toEqual(expect.arrayContaining(['leaves', 'globes']))
    expect(result.dynamicExclusions).not.toContain('leaves')
    expect(result.dynamicExclusions).not.toContain('globes')
  })

  test.each([
    ['Mustard Leaf is a neighborhood restaurant', 'leaves', 'AI 绘图软件'],
    ['must include a leaflet', 'leaves', 'AI 绘图软件'],
    ['must include blockchain links', 'locks', 'security software']
  ])(
    'requires English markers and aliases to be whole words: %s',
    (referenceNote, element, industry) => {
      const result = normalizeLogoBrief({
        ...brief,
        industry,
        referenceNote
      })

      expect(result.explicitlyRequestedElements).not.toContain(element)
      expect(result.dynamicExclusions).toContain(element)
    }
  )

  test.each([
    'not required to include leaves',
    "isn't required to include leaves",
    'isn’t required to include leaves',
    'do not require the logo to include leaves',
    '不要求必须使用叶子',
    '不需要明确使用叶子'
  ])('keeps nested negated requirements excluded: %s', (referenceNote) => {
    const result = normalizeLogoBrief({
      ...brief,
      referenceNote
    })

    expect(result.explicitlyRequestedElements).not.toContain('leaves')
    expect(result.dynamicExclusions).toContain('leaves')
  })

  test.each([
    ['include no leaves', ['leaves']],
    ['must use no leaves', ['leaves']],
    ['must omit leaves', ['leaves']],
    ['must remove leaves', ['leaves']],
    ['include neither leaves nor globes', ['leaves', 'globes']]
  ])('keeps explicitly negated elements excluded: %s', (referenceNote, elements) => {
    const result = normalizeLogoBrief({
      ...brief,
      industry: '可持续 AI 绘图软件',
      referenceNote
    })

    for (const element of elements) {
      expect(result.explicitlyRequestedElements).not.toContain(element)
      expect(result.dynamicExclusions).toContain(element)
    }
  })
})

describe('logo brief fingerprints', () => {
  test('uses a stable fingerprint independent of array order and whitespace', () => {
    expect(createBriefFingerprint(brief)).toBe(
      createBriefFingerprint({
        ...brief,
        brandKeywords: ['创造力', '清晰'],
        preferredColors: [' 蓝色 ']
      })
    )
  })

  test('tracks color changes only in the prompt fingerprint', () => {
    const recolored = { ...brief, preferredColors: ['紫色'] }

    expect(createBriefFingerprint(recolored)).toBe(createBriefFingerprint(brief))
    expect(createPromptFingerprint(recolored)).not.toBe(createPromptFingerprint(brief))
  })

  test('tracks reference note changes in both fingerprints', () => {
    const annotated = { ...brief, referenceNote: '必须使用一片叶子' }

    expect(createBriefFingerprint(annotated)).not.toBe(createBriefFingerprint(brief))
    expect(createPromptFingerprint(annotated)).not.toBe(createPromptFingerprint(brief))
  })

  test('sorts and deduplicates every array before fingerprinting', () => {
    const changedOrder: LogoBrandBriefV2 = {
      ...brief,
      brandKeywords: ['创造力', '清晰', '创造力'],
      avoidedElements: ['robot', 'flower'],
      preferredColors: ['cyan', 'blue'],
      avoidedColors: ['orange', 'red'],
      usageScenarios: ['website', 'app-icon']
    }
    const reversed: LogoBrandBriefV2 = {
      ...changedOrder,
      brandKeywords: [' 清晰 ', '创造力'],
      avoidedElements: ['flower', 'robot'],
      preferredColors: ['blue', 'cyan'],
      avoidedColors: ['red', 'orange'],
      usageScenarios: ['app-icon', 'website']
    }

    expect(createBriefFingerprint(changedOrder)).toBe(createBriefFingerprint(reversed))
    expect(createPromptFingerprint(changedOrder)).toBe(createPromptFingerprint(reversed))
  })
})
