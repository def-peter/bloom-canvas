import { describe, expect, test } from 'vitest'
import { LOGO_GRAMMAR_LIBRARY_VERSION, logoGrammarCards } from './logoGrammarLibrary'

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

  test('does not leak source brands into production prompt fragments', () => {
    const productionText = logoGrammarCards
      .flatMap((card) => [card.mechanism, ...card.promptFragments, ...card.constructionRules])
      .join(' ')
    expect(productionText).not.toMatch(/Pentagram|Koto|Conical|Moco|Takanawa/i)
  })
})
