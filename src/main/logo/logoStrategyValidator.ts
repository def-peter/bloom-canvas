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
  const duplicateStrategyIndexes = new Set<number>()
  const markDuplicate = (strategyIndex: number): void => {
    duplicateStrategyIndexes.add(strategyIndex)
  }

  if (input.strategies.length !== 3) {
    issues.push(`strategies must contain exactly 3 entries; received ${input.strategies.length}`)
  }

  const strategyIdCounts = new Map<string, number>()
  const firstIndexById = new Map<string, number>()
  for (const [strategyIndex, strategy] of input.strategies.entries()) {
    strategyIdCounts.set(strategy.id, (strategyIdCounts.get(strategy.id) ?? 0) + 1)
    const firstIndex = firstIndexById.get(strategy.id)
    if (firstIndex !== undefined) {
      issues.push(
        `strategy at input index ${strategyIndex} duplicates id "${strategy.id}" first used at input index ${firstIndex}; duplicate id is ambiguous and requires full strategy-set repair`
      )
      markDuplicate(strategyIndex)
    } else {
      firstIndexById.set(strategy.id, strategyIndex)
    }
  }

  const firstByGrammarId = new Map<string, LogoDesignStrategy>()
  for (const [strategyIndex, strategy] of input.strategies.entries()) {
    const first = firstByGrammarId.get(strategy.grammarId)
    if (first) {
      issues.push(
        `strategy "${strategy.id}" duplicates grammarId "${strategy.grammarId}" first used by strategy "${first.id}"`
      )
      markDuplicate(strategyIndex)
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
        markDuplicate(laterIndex)
      }

      const constructionSimilarity = bigramJaccard(
        normalizeComparableText(earlier.construction),
        normalizeComparableText(later.construction)
      )
      if (constructionSimilarity > 0.72) {
        issues.push(
          `strategies "${earlier.id}" and "${later.id}" have construction similarity ${constructionSimilarity.toFixed(3)} above 0.72`
        )
        markDuplicate(laterIndex)
      }
    }
  }

  if (input.brief.minimumNonLiteralStrategyCount > 0) {
    const literalRisks = uniqueNonEmpty([
      ...input.semantics.literalMetaphorRisks,
      ...input.brief.semanticSeeds.literalMetaphorRisks,
      ...input.brief.brief.avoidedElements
    ])
    const literalStrategyIds = input.strategies
      .filter((strategy) => {
        return literalRisks.some((risk) => containsForbiddenSemantic(strategy.coreMetaphor, risk))
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
      if (normalizeSemanticText(cliche).length === 0) continue

      const usedByEveryStrategy = input.strategies.every((strategy) => {
        return (
          containsForbiddenSemantic(strategy.coreMetaphor, cliche) ||
          containsForbiddenSemantic(strategy.construction, cliche)
        )
      })
      if (usedByEveryStrategy) {
        issues.push(
          `semantics.industryCliches "${cliche}" is used by every strategy in coreMetaphor or construction: ${input.strategies.map((strategy) => strategy.id).join(', ')}`
        )
      }
    }
  }

  if (issues.length === 0) return { ok: true, strategies: input.strategies }
  const seenDuplicateStrategyIds = new Set<string>()
  const duplicateStrategyIds = [...duplicateStrategyIndexes]
    .sort((left, right) => left - right)
    .flatMap((strategyIndex) => {
      const strategyId = input.strategies[strategyIndex]?.id
      if (
        strategyId === undefined ||
        strategyIdCounts.get(strategyId) !== 1 ||
        seenDuplicateStrategyIds.has(strategyId)
      ) {
        return []
      }

      seenDuplicateStrategyIds.add(strategyId)
      return [strategyId]
    })
  return { ok: false, issues, duplicateStrategyIds }
}

const cjkCharacterPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const semanticWordPattern = /[\p{L}\p{N}]+/gu
const irregularSingulars = new Map([
  ['children', 'child'],
  ['feet', 'foot'],
  ['geese', 'goose'],
  ['leaves', 'leaf'],
  ['men', 'man'],
  ['mice', 'mouse'],
  ['people', 'person'],
  ['teeth', 'tooth'],
  ['women', 'woman']
])

function containsForbiddenSemantic(text: string, forbiddenSemantic: string): boolean {
  const normalizedText = normalizeSemanticText(text)
  const normalizedForbiddenSemantic = normalizeSemanticText(forbiddenSemantic)
  if (normalizedForbiddenSemantic.length === 0) return false

  if (cjkCharacterPattern.test(normalizedForbiddenSemantic)) {
    return normalizedText.includes(normalizedForbiddenSemantic)
  }

  const textTokens = semanticTokens(normalizedText)
  const forbiddenTokens = semanticTokens(normalizedForbiddenSemantic)
  if (forbiddenTokens.length === 0 || forbiddenTokens.length > textTokens.length) return false

  return textTokens.some((_, startIndex) =>
    forbiddenTokens.every((token, offset) => textTokens[startIndex + offset] === token)
  )
}

function normalizeSemanticText(value: string): string {
  return value.normalize('NFKC').toLowerCase()
}

function semanticTokens(value: string): string[] {
  return [...value.matchAll(semanticWordPattern)].map(([token]) => singularizeSemanticToken(token))
}

function singularizeSemanticToken(token: string): string {
  const irregular = irregularSingulars.get(token)
  if (irregular !== undefined) return irregular
  if (!/^\p{Script=Latin}+$/u.test(token)) return token

  if (token.length > 3 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (/(?:sses|ches|shes|xes|zes)$/.test(token)) return token.slice(0, -2)
  if (
    token.length > 3 &&
    token.endsWith('s') &&
    !token.endsWith('ss') &&
    !token.endsWith('us') &&
    !token.endsWith('is')
  ) {
    return token.slice(0, -1)
  }

  return token
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
