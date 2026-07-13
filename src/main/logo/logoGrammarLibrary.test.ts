import { describe, expect, test } from 'vitest'
import type { LogoType } from '../../shared/logoDesign'
import { LOGO_GRAMMAR_LIBRARY_VERSION, logoGrammarCards } from './logoGrammarLibrary'

const logoTypes = [
  'symbol-mark',
  'wordmark',
  'combination-mark',
  'lettermark',
  'emblem'
] as const satisfies readonly LogoType[]

const sourceBrandTokens = new Set([
  'pentagram',
  'koto',
  'conical',
  'mon',
  'takanawa',
  'sc',
  'pgc',
  'payz',
  'uniqode',
  'pairpoint',
  'univers',
  'dataland',
  'microsoft',
  'faculty',
  'mosaic',
  'rooms',
  'coda',
  'hiut',
  'gofundme',
  'workday',
  'deezer',
  'massivemusic',
  'lyft',
  'bolt',
  'tripadvisor',
  'yazio',
  'mozilla',
  'foundation',
  'moco'
])

describe('logoGrammarCards', () => {
  test('contains 14 complete and unique grammar cards', () => {
    expect(LOGO_GRAMMAR_LIBRARY_VERSION).toBe(1)
    expect(logoGrammarCards).toHaveLength(14)
    expect(new Set(logoGrammarCards.map((card) => card.id)).size).toBe(14)
    for (const card of logoGrammarCards) {
      expect(card.allowedLogoTypes.length).toBeGreaterThan(0)
      expect(card.constructionRules.length).toBeGreaterThan(1)
      expect(card.antiPatterns.length).toBeGreaterThan(1)
      expect(card.promptFragments.length).toBeGreaterThan(0)
      expect(card.reviewRules.length).toBeGreaterThan(0)
    }
  })

  test.each(logoTypes)('contains at least three cards compatible with %s', (logoType) => {
    const compatibleCards = logoGrammarCards.filter((card) =>
      card.allowedLogoTypes.includes(logoType)
    )

    expect(compatibleCards.length).toBeGreaterThanOrEqual(3)
  })

  test('keeps text-only grammars out of first-round combination marks', () => {
    for (const grammarId of ['monogram-synthesis', 'custom-wordmark'] as const) {
      const card = logoGrammarCards.find((candidate) => candidate.id === grammarId)

      expect(card?.allowedLogoTypes).not.toContain('combination-mark')
    }
  })

  test('exports a runtime-readonly grammar card array', () => {
    expect(Object.isFrozen(logoGrammarCards)).toBe(true)
  })

  test('does not leak source brands into any production field', () => {
    const productionText = logoGrammarCards
      .flatMap((card) =>
        Object.entries(card)
          .filter(([field]) => field !== 'sourceRefs')
          .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
      )
      .join(' ')
    const uncoveredSourceTokens = new Set(
      logoGrammarCards
        .flatMap((card) => card.sourceRefs)
        .flatMap((sourceRef) => sourceRef.split('-'))
        .filter((token) => token !== '50th' && !sourceBrandTokens.has(token))
    )

    expect([...uncoveredSourceTokens]).toEqual([])
    for (const sourceBrand of sourceBrandTokens) {
      expect(productionText).not.toMatch(new RegExp(`\\b${sourceBrand}\\b`, 'i'))
    }
  })
})
