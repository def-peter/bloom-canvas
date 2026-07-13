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
  { value: 'flower petals', pattern: /花瓣|flower petals?|petals?/i },
  { value: 'leaves', pattern: /叶子|叶片|leaves|leaf/i },
  { value: 'lotus', pattern: /莲花|lotus/i },
  { value: 'bar charts', pattern: /柱状图|条形图|bar charts?/i },
  { value: 'upward arrows', pattern: /上升箭头|upward arrows?/i },
  { value: 'dashboard gauges', pattern: /仪表盘|dashboard gauges?/i },
  { value: 'network nodes', pattern: /网络节点|network nodes?/i },
  { value: 'locks', pattern: /锁|locks?/i },
  { value: 'shields', pattern: /盾牌|shields?/i },
  { value: 'keyholes', pattern: /钥匙孔|keyholes?/i },
  { value: 'shadow people', pattern: /人物剪影|shadow people/i },
  { value: 'brains', pattern: /大脑|brains?/i },
  { value: 'circuit boards', pattern: /电路板|circuit boards?/i },
  { value: 'robot heads', pattern: /机器人头(?:像)?|robot heads?/i },
  { value: 'glowing sparkles', pattern: /发光闪烁|glowing sparkles?/i },
  { value: 'globes', pattern: /地球仪|globes?/i },
  { value: 'location pins', pattern: /定位图钉|location pins?/i },
  { value: 'airplanes', pattern: /飞机|airplanes?/i },
  { value: 'speed lines', pattern: /速度线|speed lines?/i },
  { value: 'recycling arrows', pattern: /回收箭头|recycling arrows?/i }
]

const requirementMarker =
  /(?:必须|需要|明确(?:要求)?(?:使用|包含)?|must|include(?:s|d)?|require(?:s|d)?|required)/i
const negativeRequirementMarker =
  /(?:\b(?:not|no|never|cannot|avoid|exclude|without|(?:don|doesn|didn|isn|aren|wasn|weren|can|couldn|wouldn|shouldn|mustn|needn|won|shan|haven|hasn|hadn)['’]t)\b|不需要|无需|无须|不必|非必须|不是必须|并非必须|不要求|不要|避免|禁止|不能使用|不可使用|不(?:推荐|建议)(?:使用)?)/i
const clauseBoundary = /[\n。；;.!?！？，,]|\bbut\b|但/i

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
      clauses.some((clause) => {
        const elementMatch = clause.match(pattern)
        if (elementMatch?.index === undefined) return false

        const requirementContext = clause.slice(0, elementMatch.index)
        return (
          requirementMarker.test(requirementContext) &&
          !negativeRequirementMarker.test(requirementContext)
        )
      })
    )
    .map(({ value }) => value)
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
