export type LogoType = 'symbol-mark' | 'wordmark' | 'combination-mark' | 'lettermark' | 'emblem'

export type LogoUsageScenario =
  'app-icon' | 'website' | 'ecommerce' | 'packaging' | 'storefront' | 'social-avatar'

export type LogoGrammarId =
  | 'negative-space-fusion'
  | 'monogram-synthesis'
  | 'semantic-hybrid'
  | 'continuous-path'
  | 'modular-grid'
  | 'interlocking-units'
  | 'frame-threshold'
  | 'fold-unfold'
  | 'radial-core'
  | 'signal-rhythm'
  | 'custom-wordmark'
  | 'symbol-as-system'
  | 'simplified-character'
  | 'dynamic-aperture'

export type LogoRenderStyle =
  | 'flat-monochrome'
  | 'flat-duotone'
  | 'restrained-gradient'
  | 'bold-outline'
  | 'soft-2.5d'
  | 'soft-volume'
  | 'embossed'
  | 'skeuomorphic'

export interface LogoBrandBriefV2 {
  brandName: string
  brandNameAlt?: string
  shortName?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidedElements: string[]
  preferredColors: string[]
  avoidedColors: string[]
  logoType: LogoType
  usageScenarios: LogoUsageScenario[]
  referenceNote?: string
}

export interface LogoBrandSemantics {
  functionalTruths: string[]
  emotionalQualities: string[]
  differentiators: string[]
  audienceSignals: string[]
  usableMetaphors: string[]
  literalMetaphorRisks: string[]
  industryCliches: string[]
  usageConstraints: string[]
}

export interface LogoGrammarCard {
  id: LogoGrammarId
  nameZh: string
  mechanism: string
  fitSignals: string[]
  conflictSignals: string[]
  allowedLogoTypes: LogoType[]
  constructionRules: string[]
  antiPatterns: string[]
  promptFragments: string[]
  reviewRules: string[]
  sourceRefs: string[]
}

export interface LogoDesignStrategy {
  id: string
  version: number
  nameZh: string
  summaryZh: string
  grammarId: LogoGrammarId
  brandEvidence: string[]
  coreMetaphor: string
  construction: string
  silhouette: string
  composition: string
  colorPlan: string
  recommendedRenderStyles: LogoRenderStyle[]
  exclusions: string[]
  rationaleZh: string
  imagePromptEn: string
}

export interface LogoDesignRevision {
  briefVersion: number
  strategyVersion: number
  grammarLibraryVersion: number
  semantics: LogoBrandSemantics
  strategies: LogoDesignStrategy[]
  selectedStrategyIds: string[]
  createdAt: string
}

export interface LogoStrategyPromptDirection {
  strategyId: string
  strategyNameZh: string
  grammarId: LogoGrammarId
  sourceBriefVersion: number
  sourceStrategyVersion: number
  sourcePromptVersion: number
  renderStyle: LogoRenderStyle
  finalPrompt: string
  customized: boolean
}

export interface LogoStrategyPromptPack {
  sourceBriefVersion: number
  sourceStrategyVersion: number
  sourcePromptVersion: number
  grammarLibraryVersion: number
  directions: LogoStrategyPromptDirection[]
}

export interface GenerateLogoStrategiesInput {
  providerId: string
  briefVersion: number
  brief: LogoBrandBriefV2
  existingRevision?: LogoDesignRevision
  replaceStrategyId?: string
}

export interface BuildLogoStrategyPromptPackInput {
  brief: LogoBrandBriefV2
  revision: LogoDesignRevision
  promptVersion: number
  renderStyles?: Partial<Record<string, LogoRenderStyle>>
}
