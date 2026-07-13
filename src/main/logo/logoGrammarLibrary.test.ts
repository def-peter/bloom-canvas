import { describe, expect, expectTypeOf, test } from 'vitest'
import type { LogoGrammarCard, LogoType } from '../../shared/logoDesign'
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

const wordmarkGrammarIds = ['custom-wordmark', 'modular-grid', 'symbol-as-system'] as const

const grammarArrayFields = [
  'fitSignals',
  'conflictSignals',
  'allowedLogoTypes',
  'constructionRules',
  'antiPatterns',
  'promptFragments',
  'reviewRules',
  'sourceRefs'
] as const satisfies readonly (keyof LogoGrammarCard)[]

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

  test('uses three distinct and executable wordmark grammars', () => {
    const wordmarkCards = logoGrammarCards.filter((card) =>
      card.allowedLogoTypes.includes('wordmark')
    )

    expect(wordmarkCards.map((card) => card.id).sort()).toEqual([...wordmarkGrammarIds].sort())
    expect(new Set(wordmarkCards.map((card) => card.mechanism)).size).toBe(3)
  })

  test('gives every wordmark grammar exact full-name and per-character rules', () => {
    const wordmarkCards = logoGrammarCards.filter((card) =>
      card.allowedLogoTypes.includes('wordmark')
    )

    for (const card of wordmarkCards) {
      const promptText = card.promptFragments.join(' ')
      const constructionText = card.constructionRules.join(' ')
      const reviewText = card.reviewRules.join(' ')

      expect(promptText).toMatch(/exact full brand name/i)
      expect(promptText).toMatch(/every character/i)
      expect(constructionText).toMatch(/exact full brand name/i)
      expect(constructionText).toMatch(/every character/i)
      expect(reviewText).toMatch(/every character/i)
      expect(reviewText).toMatch(/correct/i)
      expect(reviewText).toMatch(/readable/i)
    }
  })

  test('types every grammar card collection as readonly', () => {
    expectTypeOf<LogoGrammarCard['fitSignals']>().toEqualTypeOf<readonly string[]>()
    expectTypeOf<LogoGrammarCard['conflictSignals']>().toEqualTypeOf<readonly string[]>()
    expectTypeOf<LogoGrammarCard['allowedLogoTypes']>().toEqualTypeOf<readonly LogoType[]>()
    expectTypeOf<LogoGrammarCard['constructionRules']>().toEqualTypeOf<readonly string[]>()
    expectTypeOf<LogoGrammarCard['antiPatterns']>().toEqualTypeOf<readonly string[]>()
    expectTypeOf<LogoGrammarCard['promptFragments']>().toEqualTypeOf<readonly string[]>()
    expectTypeOf<LogoGrammarCard['reviewRules']>().toEqualTypeOf<readonly string[]>()
    expectTypeOf<LogoGrammarCard['sourceRefs']>().toEqualTypeOf<readonly string[]>()
  })

  test('deep-freezes the grammar library', () => {
    expect(Object.isFrozen(logoGrammarCards)).toBe(true)
    for (const card of logoGrammarCards) {
      expect(Object.isFrozen(card)).toBe(true)
      for (const field of grammarArrayFields) {
        expect(Object.isFrozen(card[field])).toBe(true)
      }
    }
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
