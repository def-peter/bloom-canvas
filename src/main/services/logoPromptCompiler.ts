import type {
  BuildLogoPromptPackInput,
  LogoPromptPack,
  LogoStyleDirectionId,
  LogoType,
  LogoUsageScenario
} from '../../shared/types'
import type {
  BuildLogoStrategyPromptPackInput,
  LogoBrandBriefV2,
  LogoRenderStyle,
  LogoStrategyPromptPack
} from '../../shared/logoDesign'
import { logoGrammarCards } from '../logo/logoGrammarLibrary'
import { normalizeLogoBrief } from '../logo/logoBriefNormalizer'

export const LOGO_QUALITY_RULES_VERSION = 2 as const

const renderStyleInstructions: Record<LogoRenderStyle, string> = {
  'flat-monochrome':
    'Use a flat monochrome treatment with bold solid shapes and no shading or material effects.',
  'flat-duotone':
    'Use two flat solid colors with crisp boundaries, strong contrast, and no gradients.',
  'restrained-gradient':
    'Use one restrained gradient within a simple silhouette, with no glow or atmospheric effects.',
  'bold-outline':
    'Use bold, uniform outlines with broad internal gaps and no fragile decorative strokes.',
  'soft-2.5d':
    'Use restrained soft 2.5D depth with simple planes; preserve a flat monochrome master structure; not only a material mockup.',
  'soft-volume':
    'Use soft volumetric shading on a simple solid form; preserve a flat monochrome master structure; not only a material mockup.',
  embossed:
    'Use a restrained embossed treatment with shallow relief; preserve a flat monochrome master structure; not only a material mockup.',
  skeuomorphic:
    'Use restrained skeuomorphic material cues without scene props; preserve a flat monochrome master structure; not only a material mockup.'
}

const executionRequirements = [
  'exactly one standalone logo mark',
  'at most two main visual elements',
  'use broad/wide gaps that remain open at small sizes',
  'no fragile thin lines or tiny decorative details',
  'center the mark on a clean/plain background',
  'not a logo sheet or multiple options',
  'no mockup, poster, or scene',
  'works in flat monochrome and at 32px'
] as const

const MAX_FINAL_PROMPT_LENGTH = 12_000

const promptSectionLabels = {
  brandFacts: 'Brand facts:',
  selectedStrategy: 'Selected strategy:',
  grammarRules: 'Grammar construction rules:',
  renderStyle: 'Render style:',
  textRules: 'Logo type text rules:',
  executionRequirements: 'Execution requirements:',
  dynamicExclusions: 'Dynamic exclusions:'
} as const

const styleDirectionLabels: Record<LogoStyleDirectionId, { name: string; instruction: string }> = {
  'modern-minimal': {
    name: '现代极简',
    instruction: 'Use clean geometry, strong whitespace, and a restrained symbol.'
  },
  'symbolic-mark': {
    name: '图形符号',
    instruction: 'Create an abstract or semi-abstract symbol with a clear silhouette.'
  },
  wordmark: {
    name: '文字方向：品牌全名',
    instruction:
      'Full brand-name lettering direction: make the complete brand name the main visual element; use custom, simple, readable lettering; do not make a separate icon the main focus.'
  },
  lettermark: {
    name: '字母方向：首字母/缩写',
    instruction:
      'Initials or abbreviation direction: use the short name or initials as the main mark; build a simple, memorable letterform; avoid tiny decorative cuts.'
  },
  emblem: {
    name: '徽章式',
    instruction: 'Use a simplified badge structure without ornate decoration.'
  },
  tech: {
    name: '科技感',
    instruction: 'Use geometric technology cues, avoid complex lines and circuit details.'
  },
  'friendly-rounded': {
    name: '亲和圆润',
    instruction: 'Use soft rounded shapes and a friendly visual tone.'
  },
  'eastern-modern': {
    name: '东方现代',
    instruction:
      'Blend modern geometry with subtle eastern cues, avoid complex traditional patterns.'
  },
  'premium-restraint': {
    name: '高端克制',
    instruction: 'Use restrained luxury, quiet spacing, avoid metallic effects and heavy gradients.'
  }
}

const logoTypeInstructions: Record<LogoType, string> = {
  'symbol-mark':
    'symbol-only logo: create a simple standalone icon or abstract mark; do not make brand text the main element',
  wordmark:
    'full brand-name text logo: design the complete brand name as custom lettering; no separate icon as the main element',
  'combination-mark':
    'icon plus brand-name lockup: create a simple symbol and place it with the full brand name as a balanced logo system',
  lettermark:
    'initials or abbreviation logo: use the short name or initials as the main mark; keep the letter construction simple and readable',
  emblem:
    'simple badge logo: place text or symbol inside a very simple enclosing shape; avoid ornate badge details'
}

const usageLabels: Record<LogoUsageScenario, string> = {
  'app-icon': 'App 图标',
  website: '网站',
  ecommerce: '电商',
  packaging: '包装',
  storefront: '门店招牌',
  'social-avatar': '社媒头像'
}

function joinList(values: string[] | undefined): string {
  return values?.filter(Boolean).join(', ') || '未指定'
}

function formatPreferredColors(values: string[] | undefined): string {
  const text = joinList(values)
  if (text === '未指定') return text

  const normalized = text.toLowerCase()
  if (
    text.includes('双色') ||
    normalized.includes('two color') ||
    normalized.includes('two-color') ||
    normalized.includes('duotone')
  ) {
    return `${text}; use two solid colors, no gradients unless explicitly requested`
  }

  return `${text}; solid colors preferred, no gradients unless explicitly requested`
}

function formatValues(values: readonly string[]): string {
  return values.length > 0 ? values.map(formatPromptValue).join(', ') : 'none specified'
}

function optionalPromptLine(label: string, value: string | undefined): string | null {
  return value ? `- ${label}: ${formatPromptValue(value)}` : null
}

function formatPromptValue(value: string): string {
  const singleLineValue = value.replace(/\s+/g, ' ').trim()

  return Object.values(promptSectionLabels).reduce(
    (safeValue, sectionLabel) =>
      safeValue.replaceAll(sectionLabel, `${sectionLabel.slice(0, -1)} -`),
    singleLineValue
  )
}

function dedupePromptValues(values: readonly string[]): string[] {
  const seen = new Set<string>()

  return values.flatMap((value) => {
    const normalized = value.trim()
    const key = normalized.toLocaleLowerCase()
    if (!normalized || seen.has(key)) return []

    seen.add(key)
    return [normalized]
  })
}

function buildLogoTypeTextRules(brief: LogoBrandBriefV2): string {
  switch (brief.logoType) {
    case 'symbol-mark':
    case 'combination-mark':
      return 'First generation is symbol-only: no brand name, letters, slogan, caption, or pseudo-text.'
    case 'wordmark':
      return `Use exactly the full brand name: ${brief.brandName}; preserve exact spelling and readability; no other text or pseudo-text.`
    case 'emblem':
      return 'Keep the first emblem symbol-led with no circular or ring text, small text, slogan, or pseudo-text.'
    case 'lettermark':
      return buildLettermarkTextRules(brief)
  }
}

function buildLettermarkTextRules(brief: LogoBrandBriefV2): string {
  if (brief.shortName === undefined) {
    throw new Error(
      'lettermark shortName is missing; provide 1-3 Latin letters or 1-2 Chinese characters from brandName'
    )
  }

  const shortName = brief.shortName.trim()
  if (!shortName) {
    throw new Error(
      'lettermark shortName is empty; provide 1-3 Latin letters or 1-2 Chinese characters from brandName'
    )
  }

  if (/^[A-Za-z]{1,3}$/.test(shortName)) {
    return `Use exactly these letters: ${shortName}; no other letters or pseudo-text; preserve exact letter identity and readability.`
  }

  if (/^[\p{Script=Han}]{1,2}$/u.test(shortName)) {
    const availableBrandCharacters = [...brief.brandName]
    const containsEveryCharacter = [...shortName].every((character) => {
      const characterIndex = availableBrandCharacters.indexOf(character)
      if (characterIndex < 0) return false

      availableBrandCharacters.splice(characterIndex, 1)
      return true
    })
    if (!containsEveryCharacter) {
      throw new Error(
        `lettermark shortName "${shortName}" is invalid: every Chinese character must appear in brandName "${brief.brandName}"`
      )
    }

    return `Use exactly these Chinese characters: ${shortName}; no other characters or pseudo-text; preserve exact character identity and readability.`
  }

  throw new Error(
    `lettermark shortName "${shortName}" is invalid; use 1-3 Latin letters or 1-2 Chinese characters from brandName without spaces, digits, or mixed scripts`
  )
}

export function buildLogoStrategyPromptPack(
  input: BuildLogoStrategyPromptPackInput
): LogoStrategyPromptPack {
  if (input.revision.strategies.length !== 3) {
    throw new Error(
      `Logo strategy prompt pack requires exactly 3 strategies; received ${input.revision.strategies.length}`
    )
  }

  const normalizedBrief = normalizeLogoBrief(input.brief)
  const textRules = buildLogoTypeTextRules(normalizedBrief.brief)
  const dynamicExclusions = dedupePromptValues([
    ...normalizedBrief.dynamicExclusions,
    ...normalizedBrief.brief.avoidedElements
  ])

  const directions = input.revision.strategies.map((strategy) => {
    const grammarCard = logoGrammarCards.find((card) => card.id === strategy.grammarId)
    if (!grammarCard) {
      throw new Error(
        `Logo strategy "${strategy.id}" references missing grammar card "${strategy.grammarId}"`
      )
    }

    const renderStyleOverride = input.renderStyles?.[strategy.id]
    const renderStyle = renderStyleOverride ?? strategy.recommendedRenderStyles[0]
    if (!renderStyle) {
      throw new Error(`Logo strategy "${strategy.id}" has no default render style`)
    }

    const finalPrompt = [
      promptSectionLabels.brandFacts,
      `- Brand name: ${formatPromptValue(normalizedBrief.brief.brandName)}`,
      optionalPromptLine('Alternate name', normalizedBrief.brief.brandNameAlt),
      `- Industry: ${formatPromptValue(normalizedBrief.brief.industry)}`,
      `- Business description: ${formatPromptValue(normalizedBrief.brief.businessDescription)}`,
      optionalPromptLine('Target audience', normalizedBrief.brief.targetAudience),
      `- Brand keywords: ${formatValues(normalizedBrief.brief.brandKeywords)}`,
      optionalPromptLine('Differentiator', normalizedBrief.brief.differentiator),
      `- Preferred colors: ${formatValues(normalizedBrief.brief.preferredColors)}`,
      `- Avoided colors: ${formatValues(normalizedBrief.brief.avoidedColors)}`,
      `- Usage scenarios: ${formatValues(normalizedBrief.brief.usageScenarios)}`,
      `- Functional truths: ${formatValues(input.revision.semantics.functionalTruths)}`,
      `- Emotional qualities: ${formatValues(input.revision.semantics.emotionalQualities)}`,
      `- Audience signals: ${formatValues(input.revision.semantics.audienceSignals)}`,
      '',
      promptSectionLabels.selectedStrategy,
      `- Strategy: ${formatPromptValue(strategy.nameZh)} (${formatPromptValue(strategy.id)})`,
      `- Summary: ${formatPromptValue(strategy.summaryZh)}`,
      `- Brand evidence: ${formatValues(strategy.brandEvidence)}`,
      `- Core metaphor: ${formatPromptValue(strategy.coreMetaphor)}`,
      `- Construction: ${formatPromptValue(strategy.construction)}`,
      `- Silhouette: ${formatPromptValue(strategy.silhouette)}`,
      `- Composition: ${formatPromptValue(strategy.composition)}`,
      `- Color plan: ${formatPromptValue(strategy.colorPlan)}`,
      `- Image prompt: ${formatPromptValue(strategy.imagePromptEn)}`,
      `- Strategy exclusions: ${formatValues(strategy.exclusions)}`,
      `- Rationale: ${formatPromptValue(strategy.rationaleZh)}`,
      '',
      promptSectionLabels.grammarRules,
      `- Grammar: ${grammarCard.nameZh} (${grammarCard.id})`,
      `- Mechanism: ${grammarCard.mechanism}`,
      ...grammarCard.constructionRules.map((rule) => `- ${rule}`),
      ...grammarCard.promptFragments.map((fragment) => `- ${fragment}`),
      '',
      promptSectionLabels.renderStyle,
      `- ${renderStyle}: ${renderStyleInstructions[renderStyle]}`,
      '',
      promptSectionLabels.textRules,
      `- ${formatPromptValue(textRules)}`,
      '',
      promptSectionLabels.executionRequirements,
      ...executionRequirements.map((requirement) => `- ${requirement}`),
      '',
      promptSectionLabels.dynamicExclusions,
      `- Avoid: ${formatValues(dynamicExclusions)}`
    ]
      .filter((line): line is string => line !== null)
      .join('\n')
    if (finalPrompt.length > MAX_FINAL_PROMPT_LENGTH) {
      throw new Error(
        `Logo strategy "${strategy.id}" final prompt is ${finalPrompt.length} characters; maximum is ${MAX_FINAL_PROMPT_LENGTH}`
      )
    }

    return {
      strategyId: strategy.id,
      strategyNameZh: strategy.nameZh,
      grammarId: strategy.grammarId,
      sourceBriefVersion: input.revision.briefVersion,
      sourceStrategyVersion: strategy.version,
      sourcePromptVersion: input.promptVersion,
      renderStyle,
      finalPrompt,
      customized: renderStyleOverride !== undefined
    }
  })

  return {
    sourceBriefVersion: input.revision.briefVersion,
    sourceStrategyVersion: input.revision.strategyVersion,
    sourcePromptVersion: input.promptVersion,
    grammarLibraryVersion: input.revision.grammarLibraryVersion,
    directions
  }
}

export function buildLogoPromptPack(input: BuildLogoPromptPackInput): LogoPromptPack {
  const basePrompt = [
    'Create a logo concept for this brand.',
    '',
    'Brand brief:',
    `- Brand name: ${input.brandName}`,
    input.brandNameAlt ? `- Alternate/English name: ${input.brandNameAlt}` : null,
    input.shortName ? `- Short name or initials: ${input.shortName}` : null,
    input.slogan ? `- Slogan: ${input.slogan}` : null,
    `- Industry: ${input.industry}`,
    `- Business description: ${input.businessDescription}`,
    input.targetAudience ? `- Target audience: ${input.targetAudience}` : null,
    `- Brand keywords: ${input.brandKeywords.join(', ')}`,
    input.differentiator ? `- Differentiator: ${input.differentiator}` : null,
    '',
    'Logo constraints:',
    '- Logo type requirements:',
    ...input.logoTypes.map((item) => `  - ${logoTypeInstructions[item]}`),
    `- Preferred colors: ${formatPreferredColors(input.preferredColors)}`,
    `- Avoided colors: ${joinList(input.avoidedColors)}`,
    input.avoidElements ? `- Avoid elements or feelings: ${input.avoidElements}` : null,
    `- Usage scenarios: ${
      input.usageScenarios?.length
        ? input.usageScenarios.map((item) => usageLabels[item]).join(', ')
        : 'website and general brand identity'
    }`,
    input.referenceNote ? `- Reference note: ${input.referenceNote}` : null,
    '',
    'Hard logo quality rules:',
    '- simple, scalable, clean vector-like logo',
    '- one core visual idea, at most one or two main elements',
    '- clear silhouette, minimal details',
    '- works at 64px and 32px',
    '- no complex texture, no tiny decorative elements',
    '- no photorealistic scene, no poster background, no mockup',
    '- no generic upward arrows, no bar charts, no rockets, no gears',
    '- no dense network-node diagrams, no circuit-board details',
    '- no stock-logo swooshes, no generic speed lines',
    '- no gradients unless explicitly requested',
    '- no tiny text, no slogan, no decorative micro-details',
    '- no excessive shadows, metallic effects, or 3D rendering',
    '- centered composition on a clean plain background'
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const directions = input.styleDirections.map((id) => {
    const direction = styleDirectionLabels[id]
    const prompt = [
      `Style direction: ${direction.name}`,
      direction.instruction,
      'Keep the result simple enough for small-size logo usage.'
    ].join('\n')

    return {
      id,
      name: direction.name,
      prompt,
      finalPrompt: `${basePrompt}\n\n${prompt}`
    }
  })

  return { basePrompt, directions }
}
