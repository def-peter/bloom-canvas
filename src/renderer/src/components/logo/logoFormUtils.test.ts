import { describe, expect, test } from 'vitest'
import {
  logoTestPromptPack,
  logoTestRevision
} from '../../../../shared/logoDesign.testFixtures'
import type { LogoProject } from '../../../../shared/types'
import {
  isDesignRevisionCurrent,
  mergeRecompiledPromptPack,
  projectToBriefValues,
  splitLogoTags
} from './logoFormUtils'

function project(overrides: Partial<LogoProject> = {}): LogoProject {
  return {
    id: 'project-1',
    brandName: '生花',
    industry: 'AI 绘图软件',
    businessDescription: '帮助创作者生成图片',
    brandKeywords: ['清晰', '创造力'],
    avoidElements: '复杂花瓣，叶片',
    preferredColors: [],
    avoidedColors: [],
    logoTypes: ['combination-mark'],
    styleDirections: ['modern-minimal'],
    usageScenarios: ['app-icon'],
    referenceImageIds: [],
    generationIds: [],
    favoriteVariantIds: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    ...overrides
  }
}

describe('logoFormUtils', () => {
  test('splits comma, Chinese comma, enumeration comma, and newline', () => {
    expect(splitLogoTags('清晰,可靠，克制、创造力\n亲和')).toEqual([
      '清晰',
      '可靠',
      '克制',
      '创造力',
      '亲和'
    ])
  })

  test('migrates legacy avoided elements into V2 brief values', () => {
    expect(projectToBriefValues(project()).avoidedElements).toEqual(['复杂花瓣', '叶片'])
  })

  test('marks a revision stale when its brief version differs', () => {
    expect(
      isDesignRevisionCurrent({ briefVersion: 2, designRevision: logoTestRevision })
    ).toBe(false)
    expect(
      isDesignRevisionCurrent({ briefVersion: 1, designRevision: logoTestRevision })
    ).toBe(true)
  })

  test('recompiles only the changed strategy and preserves another custom prompt', () => {
    const previous = {
      ...logoTestPromptPack,
      directions: logoTestPromptPack.directions.map((direction, index) =>
        index === 1
          ? { ...direction, customized: true, finalPrompt: 'my custom prompt' }
          : direction
      )
    }
    const rebuilt = {
      ...logoTestPromptPack,
      sourceStrategyVersion: 2,
      directions: logoTestPromptPack.directions.map((direction) => ({
        ...direction,
        finalPrompt: `rebuilt ${direction.strategyId}`
      }))
    }

    const merged = mergeRecompiledPromptPack(previous, rebuilt, ['strategy-path'])
    expect(
      merged.directions.find((item) => item.strategyId === 'strategy-path')?.finalPrompt
    ).toBe('rebuilt strategy-path')
    expect(
      merged.directions.find((item) => item.strategyId === 'strategy-frame')?.finalPrompt
    ).toBe('my custom prompt')
  })
})
