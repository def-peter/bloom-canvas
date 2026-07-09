import type {
  BuildLogoPromptPackInput,
  LogoPromptPack,
  LogoStyleDirectionId,
  LogoType,
  LogoUsageScenario
} from '../../shared/types'

export const LOGO_QUALITY_RULES_VERSION = 1 as const

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
