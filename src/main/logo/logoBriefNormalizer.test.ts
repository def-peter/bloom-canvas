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
    expect(result.dynamicExclusions.join(' ')).toMatch(/flower petals|leaves|robot heads|circuit/i)
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
