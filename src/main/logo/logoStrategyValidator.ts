import type { LogoBrandSemantics, LogoDesignStrategy } from '../../shared/logoDesign'
import type { NormalizedLogoBrief } from './logoBriefNormalizer'
import { logoGrammarCards } from './logoGrammarLibrary'

export type LogoStrategyValidationResult =
  | { ok: true; strategies: LogoDesignStrategy[] }
  | { ok: false; issues: string[]; duplicateStrategyIds: string[] }

export function validateLogoStrategies(input: {
  brief: NormalizedLogoBrief
  semantics: LogoBrandSemantics
  strategies: LogoDesignStrategy[]
}): LogoStrategyValidationResult {
  const issues: string[] = []
  const duplicateStrategyIndexes = new Map<string, number>()
  const markDuplicate = (strategyId: string, strategyIndex: number): void => {
    const currentIndex = duplicateStrategyIndexes.get(strategyId)
    if (currentIndex === undefined || strategyIndex < currentIndex) {
      duplicateStrategyIndexes.set(strategyId, strategyIndex)
    }
  }

  if (input.strategies.length !== 3) {
    issues.push(`strategies must contain exactly 3 entries; received ${input.strategies.length}`)
  }

  const firstById = new Map<string, LogoDesignStrategy>()
  for (const [strategyIndex, strategy] of input.strategies.entries()) {
    const first = firstById.get(strategy.id)
    if (first) {
      issues.push(
        `strategy "${strategy.id}" duplicates id "${strategy.id}" first used by strategy "${first.id}"`
      )
      markDuplicate(strategy.id, strategyIndex)
    } else {
      firstById.set(strategy.id, strategy)
    }
  }

  const firstByGrammarId = new Map<string, LogoDesignStrategy>()
  for (const [strategyIndex, strategy] of input.strategies.entries()) {
    const first = firstByGrammarId.get(strategy.grammarId)
    if (first) {
      issues.push(
        `strategy "${strategy.id}" duplicates grammarId "${strategy.grammarId}" first used by strategy "${first.id}"`
      )
      markDuplicate(strategy.id, strategyIndex)
    } else {
      firstByGrammarId.set(strategy.grammarId, strategy)
    }
  }

  for (const strategy of input.strategies) {
    const grammar = logoGrammarCards.find((card) => card.id === strategy.grammarId)
    if (!grammar) {
      issues.push(`strategy "${strategy.id}" has unknown grammarId "${strategy.grammarId}"`)
    } else if (!grammar.allowedLogoTypes.includes(input.brief.brief.logoType)) {
      issues.push(
        `strategy "${strategy.id}" grammarId "${strategy.grammarId}" does not allow logoType "${input.brief.brief.logoType}"`
      )
    }
  }

  const allowedBrandEvidence = new Set([
    ...input.semantics.functionalTruths,
    ...input.semantics.differentiators
  ])
  for (const strategy of input.strategies) {
    for (const evidence of strategy.brandEvidence) {
      if (!allowedBrandEvidence.has(evidence)) {
        issues.push(
          `strategy "${strategy.id}" brandEvidence "${evidence}" is not an exact functionalTruths or differentiators value`
        )
      }
    }
  }

  for (let earlierIndex = 0; earlierIndex < input.strategies.length; earlierIndex += 1) {
    const earlier = input.strategies[earlierIndex]
    for (let laterIndex = earlierIndex + 1; laterIndex < input.strategies.length; laterIndex += 1) {
      const later = input.strategies[laterIndex]
      const coreMetaphorSimilarity = bigramJaccard(
        normalizeComparableText(earlier.coreMetaphor),
        normalizeComparableText(later.coreMetaphor)
      )
      if (coreMetaphorSimilarity > 0.72) {
        issues.push(
          `strategies "${earlier.id}" and "${later.id}" have coreMetaphor similarity ${coreMetaphorSimilarity.toFixed(3)} above 0.72`
        )
        markDuplicate(later.id, laterIndex)
      }

      const constructionSimilarity = bigramJaccard(
        normalizeComparableText(earlier.construction),
        normalizeComparableText(later.construction)
      )
      if (constructionSimilarity > 0.72) {
        issues.push(
          `strategies "${earlier.id}" and "${later.id}" have construction similarity ${constructionSimilarity.toFixed(3)} above 0.72`
        )
        markDuplicate(later.id, laterIndex)
      }
    }
  }

  if (input.brief.minimumNonLiteralStrategyCount > 0) {
    const literalRisks = uniqueNonEmpty([
      ...input.semantics.literalMetaphorRisks,
      ...input.brief.semanticSeeds.literalMetaphorRisks,
      ...input.brief.brief.avoidedElements
    ]).map(normalizeComparableText)
    const literalStrategyIds = input.strategies
      .filter((strategy) => {
        const coreMetaphor = normalizeComparableText(strategy.coreMetaphor)
        return literalRisks.some((risk) => risk.length > 0 && coreMetaphor.includes(risk))
      })
      .map((strategy) => strategy.id)
    const nonLiteralStrategyCount = input.strategies.length - literalStrategyIds.length

    if (nonLiteralStrategyCount < input.brief.minimumNonLiteralStrategyCount) {
      issues.push(
        `brief.minimumNonLiteralStrategyCount requires at least ${input.brief.minimumNonLiteralStrategyCount} strategies without literal risks; received ${nonLiteralStrategyCount}; literal-risk strategy IDs: ${literalStrategyIds.join(', ')}`
      )
    }
  }

  if (input.strategies.length === 3) {
    for (const cliche of input.semantics.industryCliches) {
      const normalizedCliche = normalizeComparableText(cliche)
      if (normalizedCliche.length === 0) continue

      const usedByEveryStrategy = input.strategies.every((strategy) => {
        const coreMetaphor = normalizeComparableText(strategy.coreMetaphor)
        const construction = normalizeComparableText(strategy.construction)
        return coreMetaphor.includes(normalizedCliche) || construction.includes(normalizedCliche)
      })
      if (usedByEveryStrategy) {
        issues.push(
          `semantics.industryCliches "${cliche}" is used by every strategy in coreMetaphor or construction: ${input.strategies.map((strategy) => strategy.id).join(', ')}`
        )
      }
    }
  }

  if (issues.length === 0) return { ok: true, strategies: input.strategies }
  const duplicateStrategyIds = [...duplicateStrategyIndexes.entries()]
    .sort((left, right) => left[1] - right[1])
    .map(([strategyId]) => strategyId)
  return { ok: false, issues, duplicateStrategyIds }
}

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '')
}

function bigramJaccard(left: string, right: string): number {
  if (left === right) return 1

  const leftBigrams = bigrams(left)
  const rightBigrams = bigrams(right)
  if (leftBigrams.size === 0 || rightBigrams.size === 0) return 0

  let intersectionSize = 0
  for (const bigram of leftBigrams) {
    if (rightBigrams.has(bigram)) intersectionSize += 1
  }

  const unionSize = new Set([...leftBigrams, ...rightBigrams]).size
  return intersectionSize / unionSize
}

function bigrams(value: string): Set<string> {
  const characters = Array.from(value)
  const result = new Set<string>()
  for (let index = 0; index < characters.length - 1; index += 1) {
    result.add(`${characters[index]}${characters[index + 1]}`)
  }
  return result
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))]
}
