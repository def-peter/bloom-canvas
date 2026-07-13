import { createHash } from 'node:crypto'
import type { LogoBrandBriefV2, LogoBrandSemantics } from '../../shared/logoDesign'

type SemanticSeeds = Pick<
  LogoBrandSemantics,
  | 'functionalTruths'
  | 'emotionalQualities'
  | 'differentiators'
  | 'audienceSignals'
  | 'literalMetaphorRisks'
  | 'industryCliches'
  | 'usageConstraints'
>

export interface NormalizedLogoBrief {
  brief: LogoBrandBriefV2
  semanticSeeds: SemanticSeeds
  dynamicExclusions: string[]
  explicitlyRequestedElements: string[]
  minimumNonLiteralStrategyCount: number
}

interface ClicheRule {
  pattern: RegExp
  exclusions: string[]
  nonLiteral?: number
}

const clicheRules: ClicheRule[] = [
  {
    pattern: /花|绽放|生长|bloom|flower|grow/i,
    exclusions: ['flower petals', 'leaves', 'lotus'],
    nonLiteral: 2
  },
  {
    pattern: /\bBI\b|数据|分析|analytics|intelligence/i,
    exclusions: ['bar charts', 'upward arrows', 'dashboard gauges', 'network nodes']
  },
  {
    pattern: /安全|保险|security|insurance/i,
    exclusions: ['locks', 'shields', 'keyholes', 'shadow people']
  },
  {
    pattern: /\bAI\b|人工智能|科技|technology/i,
    exclusions: ['brains', 'circuit boards', 'robot heads', 'glowing sparkles']
  },
  {
    pattern: /物流|全球|logistics|global/i,
    exclusions: ['globes', 'location pins', 'airplanes', 'speed lines']
  },
  {
    pattern: /环保|可持续|sustainab|eco/i,
    exclusions: ['leaves', 'globes', 'recycling arrows']
  }
]

const elementAliases: ReadonlyArray<{ value: string; pattern: RegExp }> = [
  { value: 'flower petals', pattern: /(?:花瓣|\b(?:flower petals?|petals?)\b)/i },
  { value: 'leaves', pattern: /(?:叶子|叶片|\b(?:leaves|leaf)\b)/i },
  { value: 'lotus', pattern: /(?:莲花|\blotus\b)/i },
  { value: 'bar charts', pattern: /(?:柱状图|条形图|\bbar charts?\b)/i },
  { value: 'upward arrows', pattern: /(?:上升箭头|\bupward arrows?\b)/i },
  { value: 'dashboard gauges', pattern: /(?:仪表盘|\bdashboard gauges?\b)/i },
  { value: 'network nodes', pattern: /(?:网络节点|\bnetwork nodes?\b)/i },
  { value: 'locks', pattern: /(?:锁|\blocks?\b)/i },
  { value: 'shields', pattern: /(?:盾牌|\bshields?\b)/i },
  { value: 'keyholes', pattern: /(?:钥匙孔|\bkeyholes?\b)/i },
  { value: 'shadow people', pattern: /(?:人物剪影|\bshadow people\b)/i },
  { value: 'brains', pattern: /(?:大脑|\bbrains?\b)/i },
  { value: 'circuit boards', pattern: /(?:电路板|\bcircuit boards?\b)/i },
  { value: 'robot heads', pattern: /(?:机器人头(?:像)?|\brobot heads?\b)/i },
  { value: 'glowing sparkles', pattern: /(?:发光闪烁|\bglowing sparkles?\b)/i },
  { value: 'globes', pattern: /(?:地球仪|\bglobes?\b)/i },
  { value: 'location pins', pattern: /(?:定位图钉|\blocation pins?\b)/i },
  { value: 'airplanes', pattern: /(?:飞机|\bairplanes?\b)/i },
  { value: 'speed lines', pattern: /(?:速度线|\bspeed lines?\b)/i },
  { value: 'recycling arrows', pattern: /(?:回收箭头|\brecycling arrows?\b)/i }
]

const positiveDirectivePattern =
  /(?:必须(?:使用|包含)?|需要(?:使用|包含)?|明确(?:要求)?(?:使用|包含)|\bmust(?:\s+(?:use|include))?\b|\binclude(?:s|d)?\b|\brequire(?:s|d)?(?:\s+to\s+(?:use|include))?\b)/gi
const negativeDirectivePattern =
  /(?:(?:明确)?(?:不(?:使用|包含)|不能(?:使用|包含)|不可(?:使用|包含)|排除|去掉)|(?:必须|需要)不(?:使用|包含)|(?:不需要|不要求)(?:(?:必须|需要|明确)(?:使用|包含)?|使用|包含)?|(?:无需|无须)(?:明确)?(?:使用|包含)?|不必(?:使用|包含)?|非必须(?:使用|包含)?|(?:不是|并非)必须(?:使用|包含)?|不要(?:使用|包含)?|避免(?:使用|包含)?|禁止(?:使用|包含)?|不(?:推荐|建议)(?:使用|包含)?|\b(?:(?:do(?:es)?|did|must|should|need|can|could|would|will)\s+not|(?:don|doesn|didn|isn|aren|wasn|weren|can|couldn|wouldn|shouldn|mustn|needn|won|shan|haven|hasn|hadn)['’]t|not|never|cannot|no(?:\s+need\s+to)?)\s+(?:use|include|require(?:d)?(?:\s+(?:the\s+logo\s+)?to\s+(?:use|include))?)\b|\b(?:avoid|exclude|without|no|neither|nor|omit|remove)\b)/gi
const clauseBoundary = /[\n。；;.!?！？，,]|\bbut\b|但/i

type DirectiveKind = 'positive' | 'negative'

interface DirectiveMatch {
  kind: DirectiveKind
  end: number
}

export function normalizeLogoBrief(input: LogoBrandBriefV2): NormalizedLogoBrief {
  const brief = normalizeBrief(input)
  const relevantText = joinBriefText(brief)
  const matchedRules = matchingRules(relevantText)
  const explicitlyRequestedElements = findExplicitlyRequestedElements([
    brief.businessDescription,
    brief.referenceNote ?? ''
  ])
  const explicitElementSet = new Set(explicitlyRequestedElements)
  const dynamicExclusions = exclusionsForRules(matchedRules).filter(
    (element) => !explicitElementSet.has(element)
  )
  const literalRules = matchingRules(
    [brief.brandName, brief.brandNameAlt, brief.shortName, brief.referenceNote]
      .filter(isNonEmptyString)
      .join(' ')
  )
  const industryRules = matchingRules(
    [brief.industry, brief.businessDescription, brief.referenceNote]
      .filter(isNonEmptyString)
      .join(' ')
  )

  return {
    brief,
    semanticSeeds: {
      functionalTruths: valueAsArray(brief.businessDescription),
      emotionalQualities: [...brief.brandKeywords],
      differentiators: valueAsArray(brief.differentiator),
      audienceSignals: valueAsArray(brief.targetAudience),
      literalMetaphorRisks: unique([
        ...brief.avoidedElements,
        ...exclusionsForRules(literalRules)
      ]).filter((element) => !explicitElementSet.has(element)),
      industryCliches: exclusionsForRules(industryRules).filter(
        (element) => !explicitElementSet.has(element)
      ),
      usageConstraints: [...brief.usageScenarios]
    },
    dynamicExclusions,
    explicitlyRequestedElements,
    minimumNonLiteralStrategyCount: matchedRules.reduce(
      (minimum, rule) => Math.max(minimum, rule.nonLiteral ?? 0),
      0
    )
  }
}

export function createBriefFingerprint(input: LogoBrandBriefV2): string {
  const brief = normalizeBriefForFingerprint(input)
  const strategyBrief = {
    brandName: brief.brandName,
    brandNameAlt: brief.brandNameAlt,
    shortName: brief.shortName,
    industry: brief.industry,
    businessDescription: brief.businessDescription,
    targetAudience: brief.targetAudience,
    brandKeywords: brief.brandKeywords,
    differentiator: brief.differentiator,
    avoidedElements: brief.avoidedElements,
    logoType: brief.logoType,
    usageScenarios: brief.usageScenarios,
    referenceNote: brief.referenceNote
  }

  return hashStableJson(strategyBrief)
}

export function createPromptFingerprint(input: LogoBrandBriefV2): string {
  return hashStableJson(normalizeBriefForFingerprint(input))
}

function normalizeBrief(input: LogoBrandBriefV2): LogoBrandBriefV2 {
  return {
    brandName: input.brandName.trim(),
    ...(input.brandNameAlt === undefined ? {} : { brandNameAlt: input.brandNameAlt.trim() }),
    ...(input.shortName === undefined ? {} : { shortName: input.shortName.trim() }),
    industry: input.industry.trim(),
    businessDescription: input.businessDescription.trim(),
    ...(input.targetAudience === undefined ? {} : { targetAudience: input.targetAudience.trim() }),
    brandKeywords: normalizeArray(input.brandKeywords),
    ...(input.differentiator === undefined ? {} : { differentiator: input.differentiator.trim() }),
    avoidedElements: normalizeArray(input.avoidedElements),
    preferredColors: normalizeArray(input.preferredColors),
    avoidedColors: normalizeArray(input.avoidedColors),
    logoType: input.logoType,
    usageScenarios: normalizeArray(input.usageScenarios),
    ...(input.referenceNote === undefined ? {} : { referenceNote: input.referenceNote.trim() })
  }
}

function normalizeBriefForFingerprint(input: LogoBrandBriefV2): LogoBrandBriefV2 {
  const brief = normalizeBrief(input)

  return {
    ...brief,
    brandKeywords: [...brief.brandKeywords].sort(),
    avoidedElements: [...brief.avoidedElements].sort(),
    preferredColors: [...brief.preferredColors].sort(),
    avoidedColors: [...brief.avoidedColors].sort(),
    usageScenarios: [...brief.usageScenarios].sort()
  }
}

function findExplicitlyRequestedElements(texts: readonly string[]): string[] {
  const clauses = texts.flatMap((text) => text.split(clauseBoundary))

  return elementAliases
    .filter(({ pattern }) =>
      clauses.some((clause) => isExplicitlyRequestedInClause(clause, pattern))
    )
    .map(({ value }) => value)
}

function isExplicitlyRequestedInClause(clause: string, elementPattern: RegExp): boolean {
  const directives = [
    ...findPatternMatches(clause, positiveDirectivePattern).map((match) =>
      toDirectiveMatch(match, 'positive')
    ),
    ...findPatternMatches(clause, negativeDirectivePattern).map((match) =>
      toDirectiveMatch(match, 'negative')
    )
  ]

  return findPatternMatches(clause, elementPattern).some((elementMatch) => {
    const elementStart = elementMatch.index ?? -1
    const nearestDirective = directives
      .filter((directive) => directive.end <= elementStart)
      .sort(compareDirectives)[0]

    return nearestDirective?.kind === 'positive'
  })
}

function findPatternMatches(text: string, pattern: RegExp): RegExpMatchArray[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  return [...text.matchAll(new RegExp(pattern.source, flags))]
}

function toDirectiveMatch(match: RegExpMatchArray, kind: DirectiveKind): DirectiveMatch {
  return {
    kind,
    end: (match.index ?? 0) + match[0].length
  }
}

function compareDirectives(left: DirectiveMatch, right: DirectiveMatch): number {
  if (left.end !== right.end) return right.end - left.end
  if (left.kind === right.kind) return 0
  return left.kind === 'negative' ? -1 : 1
}

function matchingRules(text: string): ClicheRule[] {
  return clicheRules.filter((rule) => rule.pattern.test(text))
}

function exclusionsForRules(rules: readonly ClicheRule[]): string[] {
  return unique(rules.flatMap((rule) => rule.exclusions))
}

function joinBriefText(brief: LogoBrandBriefV2): string {
  return [
    brief.brandName,
    brief.brandNameAlt,
    brief.shortName,
    brief.industry,
    brief.businessDescription,
    brief.targetAudience,
    ...brief.brandKeywords,
    brief.differentiator,
    brief.referenceNote
  ]
    .filter(isNonEmptyString)
    .join(' ')
}

function normalizeArray<T extends string>(values: readonly T[]): T[] {
  const seen = new Set<string>()
  const normalized: T[] = []

  for (const value of values) {
    const trimmed = value.trim()
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed)
      normalized.push(trimmed as T)
    }
  }

  return normalized
}

function valueAsArray(value: string | undefined): string[] {
  return value ? [value] : []
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value)
}

function hashStableJson(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex')
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value))
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sortObjectKeys(child)])
    )
  }
  return value
}
