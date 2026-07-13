import { describe, expect, test } from 'vitest'
import type { LogoDesignStrategy } from '../../shared/logoDesign'
import {
  logoTestBrief,
  logoTestSemantics,
  logoTestStrategy
} from '../../shared/logoDesign.testFixtures'
import { normalizeLogoBrief } from './logoBriefNormalizer'
import { validateLogoStrategies } from './logoStrategyValidator'

const brief = normalizeLogoBrief(logoTestBrief)

function validStrategies(): LogoDesignStrategy[] {
  return [
    logoTestStrategy(),
    logoTestStrategy({
      id: 'strategy-frame',
      nameZh: '开放画布入口',
      grammarId: 'frame-threshold',
      coreMetaphor: 'an open canvas threshold',
      construction: 'one bold open frame with an offset inner plane'
    }),
    logoTestStrategy({
      id: 'strategy-grid',
      nameZh: '生成模块',
      grammarId: 'modular-grid',
      coreMetaphor: 'small inputs becoming one visual system',
      construction: 'three solid modules aligned into one compact boundary'
    })
  ]
}

function validate(strategies: LogoDesignStrategy[]): ReturnType<typeof validateLogoStrategies> {
  return validateLogoStrategies({ brief, semantics: logoTestSemantics, strategies })
}

describe('validateLogoStrategies', () => {
  test('accepts three distinct compatible strategies and preserves their array', () => {
    const strategies = validStrategies()
    const result = validate(strategies)

    expect(result).toEqual({ ok: true, strategies })
    if (result.ok) expect(result.strategies).toBe(strategies)
  })

  test('requires exactly three strategies', () => {
    const result = validate(validStrategies().slice(0, 2))

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(result.issues[0]).toContain('strategies')
      expect(result.issues[0]).toContain('exactly 3')
    }
  })

  test('marks only the later strategy when an id is repeated', () => {
    const strategies = validStrategies()
    strategies[1] = { ...strategies[1], id: strategies[0].id }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.includes('id') && issue.includes('strategy-path'))
      ).toBe(true)
      expect(result.duplicateStrategyIds).toEqual(['strategy-path'])
    }
  })

  test('marks only the later strategy when a grammarId is repeated', () => {
    const strategies = validStrategies()
    strategies[1] = { ...strategies[1], grammarId: strategies[0].grammarId }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) => issue.includes('grammarId') && issue.includes('strategy-frame')
        )
      ).toBe(true)
      expect(result.duplicateStrategyIds).toEqual(['strategy-frame'])
    }
  })

  test('rejects a grammar that does not support the requested logoType', () => {
    const strategies = validStrategies()
    strategies[1] = { ...strategies[1], grammarId: 'monogram-synthesis' }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      const issue = result.issues.find((candidate) => candidate.includes('grammarId'))
      expect(issue).toContain('strategy-frame')
      expect(issue).toContain('grammarId')
      expect(issue).toContain('logoType')
    }
  })

  test('accepts exact brand evidence and rejects invented or merely trimmed matches', () => {
    const strategies = validStrategies()
    strategies[1] = {
      ...strategies[1],
      brandEvidence: ['轻量、直接的创作流程', '帮助创作者把想法转化为图片 ']
    }
    strategies[2] = { ...strategies[2], brandEvidence: ['看起来很高级'] }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(result.issues.filter((issue) => issue.includes('brandEvidence'))).toEqual([
        expect.stringContaining('strategy-frame'),
        expect.stringContaining('strategy-grid')
      ])
      expect(result.issues.join('\n')).toContain('看起来很高级')
      expect(result.issues.join('\n')).not.toContain('brandEvidence "轻量、直接的创作流程"')
    }
  })

  test('rejects coreMetaphors whose normalized bigram Jaccard similarity is above 0.72', () => {
    const strategies = validStrategies()
    strategies[1] = { ...strategies[1], coreMetaphor: 'AN, UNFOLDING CREATIVE PATH!' }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(result.issues.join('\n')).toContain('coreMetaphor')
      expect(result.issues.join('\n')).toContain('strategy-frame')
      expect(result.duplicateStrategyIds).toEqual(['strategy-frame'])
    }
  })

  test('rejects constructions whose normalized bigram Jaccard similarity is above 0.72', () => {
    const strategies = validStrategies()
    strategies[1] = {
      ...strategies[1],
      construction: 'ONE BROAD, CONTINUOUS RIBBON WITH TWO TURNS!'
    }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(result.issues.join('\n')).toContain('construction')
      expect(result.issues.join('\n')).toContain('strategy-frame')
      expect(result.duplicateStrategyIds).toEqual(['strategy-frame'])
    }
  })

  test('handles empty and single-character similarity without an indeterminate score', () => {
    const emptyStrategies = validStrategies()
    emptyStrategies[0] = { ...emptyStrategies[0], coreMetaphor: '' }
    emptyStrategies[1] = { ...emptyStrategies[1], coreMetaphor: '' }

    const emptyResult = validate(emptyStrategies)

    expect(emptyResult).toMatchObject({ ok: false })
    if (!emptyResult.ok) {
      expect(emptyResult.issues.join('\n')).toContain('coreMetaphor')
      expect(emptyResult.issues.join('\n')).not.toContain('NaN')
    }

    const singleStrategies = validStrategies()
    singleStrategies[0] = { ...singleStrategies[0], coreMetaphor: '甲' }
    singleStrategies[1] = { ...singleStrategies[1], coreMetaphor: '乙' }
    singleStrategies[2] = { ...singleStrategies[2], coreMetaphor: '丙' }

    expect(validate(singleStrategies)).toMatchObject({ ok: true })
  })

  test('treats literal risks mentioned only in exclusions as forbidden, not positively used', () => {
    const result = validate(validStrategies())

    expect(brief.minimumNonLiteralStrategyCount).toBe(2)
    expect(
      validStrategies().every((strategy) => strategy.exclusions.includes('flower petals'))
    ).toBe(true)
    expect(result).toMatchObject({ ok: true })
  })

  test('does not let exclusions hide a literal risk used as the coreMetaphor', () => {
    const strategies = validStrategies()
    strategies[0] = {
      ...strategies[0],
      coreMetaphor: 'flower petals forming a circular bloom',
      exclusions: ['flower petals']
    }
    strategies[1] = {
      ...strategies[1],
      coreMetaphor: 'leaves opening around flower petals',
      exclusions: ['leaves', 'flower petals']
    }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      const issue = result.issues.find((candidate) =>
        candidate.includes('minimumNonLiteralStrategyCount')
      )
      expect(issue).toContain('strategy-path')
      expect(issue).toContain('strategy-frame')
    }
  })

  test('rejects one industry cliche used positively by all three strategies', () => {
    const strategies = validStrategies()
    strategies[0] = { ...strategies[0], coreMetaphor: 'AI sparkle traveling along a broad path' }
    strategies[1] = { ...strategies[1], coreMetaphor: 'AI sparkle held by an open threshold' }
    strategies[2] = { ...strategies[2], coreMetaphor: 'AI sparkle assembled from modular tiles' }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      const issue = result.issues.find((candidate) => candidate.includes('industryCliches'))
      expect(issue).toContain('AI sparkle')
      expect(issue).toContain('strategy-path')
      expect(issue).toContain('strategy-frame')
      expect(issue).toContain('strategy-grid')
    }
  })

  test('does not apply the all-strategy cliche rule when only one or two strategies use it', () => {
    const strategies = validStrategies()
    strategies[0] = { ...strategies[0], coreMetaphor: 'AI sparkle traveling along a broad path' }
    strategies[1] = { ...strategies[1], construction: 'AI sparkle held inside an open threshold' }

    expect(validate(strategies)).toMatchObject({ ok: true })
  })

  test('does not treat an industry cliche in exclusions as a positive hit', () => {
    const strategies = validStrategies().map((strategy) => ({
      ...strategy,
      exclusions: [...strategy.exclusions, 'AI sparkle']
    }))

    expect(validate(strategies)).toMatchObject({ ok: true })
  })

  test('collects duplicate grammar and nearly identical construction errors', () => {
    const strategies = validStrategies()
    strategies[1] = {
      ...strategies[1],
      grammarId: strategies[0].grammarId,
      construction: 'one broad continuous ribbon, with two turns'
    }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(result.issues.join('\n')).toContain('grammarId')
      expect(result.issues.join('\n')).toContain('construction')
      expect(result.duplicateStrategyIds).toEqual(['strategy-frame'])
    }
  })

  test('collects multiple issue classes in rule order and deduplicates later strategy ids', () => {
    const repeated = logoTestStrategy({ brandEvidence: ['看起来很高级'] })

    const result = validate([logoTestStrategy(), repeated])

    expect(result).toEqual({
      ok: false,
      issues: [
        'strategies must contain exactly 3 entries; received 2',
        'strategy "strategy-path" duplicates id "strategy-path" first used by strategy "strategy-path"',
        'strategy "strategy-path" duplicates grammarId "continuous-path" first used by strategy "strategy-path"',
        'strategy "strategy-path" brandEvidence "看起来很高级" is not an exact functionalTruths or differentiators value',
        'strategies "strategy-path" and "strategy-path" have coreMetaphor similarity 1.000 above 0.72',
        'strategies "strategy-path" and "strategy-path" have construction similarity 1.000 above 0.72'
      ],
      duplicateStrategyIds: ['strategy-path']
    })
  })

  test('keeps duplicateStrategyIds in strategy input order across issue classes', () => {
    const strategies = validStrategies()
    strategies[1] = { ...strategies[1], grammarId: strategies[0].grammarId }
    strategies[2] = { ...strategies[2], id: strategies[0].id }

    const result = validate(strategies)

    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(result.duplicateStrategyIds).toEqual(['strategy-frame', 'strategy-path'])
    }
  })
})
