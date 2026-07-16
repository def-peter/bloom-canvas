import { z } from 'zod'
import { getImageSizeError } from './imageSize'
import type { GenerationSize } from './imageSize'

const generationSizeSchema = z
  .string()
  .superRefine((size, context) => {
    const error = getImageSizeError(size)
    if (error) {
      context.addIssue({ code: 'custom', message: error })
    }
  })
  .transform((size): GenerationSize => size as GenerationSize)

export const generationParametersSchema = z.object({
  size: generationSizeSchema,
  count: z.number().int().min(1).max(4),
  quality: z.enum(['standard', 'hd']),
  outputFormat: z.enum(['png', 'jpeg', 'webp'])
})

export const logoTypeSchema = z.enum([
  'symbol-mark',
  'wordmark',
  'combination-mark',
  'lettermark',
  'emblem'
])

export const logoGrammarIdSchema = z.enum([
  'negative-space-fusion',
  'monogram-synthesis',
  'semantic-hybrid',
  'continuous-path',
  'modular-grid',
  'interlocking-units',
  'frame-threshold',
  'fold-unfold',
  'radial-core',
  'signal-rhythm',
  'custom-wordmark',
  'symbol-as-system',
  'simplified-character',
  'dynamic-aperture'
])

export const logoRenderStyleSchema = z.enum([
  'flat-monochrome',
  'flat-duotone',
  'restrained-gradient',
  'bold-outline',
  'soft-2.5d',
  'soft-volume',
  'embossed',
  'skeuomorphic'
])

export const logoStyleDirectionSchema = z.enum([
  'modern-minimal',
  'symbolic-mark',
  'wordmark',
  'lettermark',
  'emblem',
  'tech',
  'friendly-rounded',
  'eastern-modern',
  'premium-restraint'
])

export const logoUsageScenarioSchema = z.enum([
  'app-icon',
  'website',
  'ecommerce',
  'packaging',
  'storefront',
  'social-avatar'
])

export const avoidedElementsSchema = z
  .array(z.string().trim().min(1).max(120))
  .max(12)
  .refine((elements) => elements.join('，').length <= 600, {
    message:
      'Logo exclusion validation failed: total serialized length must not exceed 600 characters'
  })

const logoSemanticListSchema = z.array(z.string().trim().min(1).max(240)).max(12)

export const logoBrandBriefV2Schema = z.object({
  brandName: z.string().trim().min(1).max(120),
  brandNameAlt: z.string().trim().max(120).optional(),
  shortName: z.string().trim().max(40).optional(),
  industry: z.string().trim().min(1).max(120),
  businessDescription: z.string().trim().min(1).max(1200),
  targetAudience: z.string().trim().max(400).optional(),
  brandKeywords: z.array(z.string().trim().min(1).max(40)).min(1).max(6),
  differentiator: z.string().trim().max(600).optional(),
  avoidedElements: avoidedElementsSchema,
  preferredColors: z.array(z.string().trim().min(1).max(40)).max(8),
  avoidedColors: z.array(z.string().trim().min(1).max(40)).max(8),
  logoType: logoTypeSchema,
  usageScenarios: z.array(logoUsageScenarioSchema).min(1).max(6),
  referenceNote: z.string().trim().max(600).optional()
})

export const logoBrandSemanticsSchema = z.object({
  functionalTruths: logoSemanticListSchema,
  emotionalQualities: logoSemanticListSchema,
  differentiators: logoSemanticListSchema,
  audienceSignals: logoSemanticListSchema,
  usableMetaphors: logoSemanticListSchema,
  literalMetaphorRisks: logoSemanticListSchema,
  industryCliches: logoSemanticListSchema,
  usageConstraints: logoSemanticListSchema
})

export const logoGrammarCardSchema = z.object({
  id: logoGrammarIdSchema,
  nameZh: z.string().trim().min(1).max(40),
  mechanism: z.string().trim().min(1).max(400),
  fitSignals: z.array(z.string().trim().min(1).max(240)).max(12),
  conflictSignals: z.array(z.string().trim().min(1).max(240)).max(12),
  allowedLogoTypes: z.array(logoTypeSchema).min(1).max(5),
  constructionRules: z.array(z.string().trim().min(1).max(400)).max(12),
  antiPatterns: z.array(z.string().trim().min(1).max(400)).max(12),
  promptFragments: z.array(z.string().trim().min(1).max(1200)).max(12),
  reviewRules: z.array(z.string().trim().min(1).max(400)).max(12),
  sourceRefs: z.array(z.string().trim().min(1).max(240)).max(12)
})

export const logoDesignStrategySchema = z.object({
  id: z.string().trim().min(1).max(80),
  version: z.number().int().positive(),
  nameZh: z.string().trim().min(1).max(40),
  summaryZh: z.string().trim().min(1).max(240),
  grammarId: logoGrammarIdSchema,
  brandEvidence: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
  coreMetaphor: z.string().trim().min(1).max(240),
  construction: z.string().trim().min(1).max(400),
  silhouette: z.string().trim().min(1).max(240),
  composition: z.string().trim().min(1).max(240),
  colorPlan: z.string().trim().min(1).max(240),
  recommendedRenderStyles: z.array(logoRenderStyleSchema).min(1).max(4),
  exclusions: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  rationaleZh: z.string().trim().min(1).max(400),
  imagePromptEn: z.string().trim().min(1).max(12000)
})

export const logoDesignRevisionSchema = z.object({
  briefVersion: z.number().int().positive(),
  strategyVersion: z.number().int().positive(),
  grammarLibraryVersion: z.literal(1),
  semantics: logoBrandSemanticsSchema,
  strategies: z.array(logoDesignStrategySchema).length(3),
  selectedStrategyIds: z.array(z.string().trim().min(1).max(80)).length(3),
  createdAt: z.string().datetime()
})

export const logoStrategyPromptDirectionSchema = z.object({
  strategyId: z.string().trim().min(1).max(80),
  strategyNameZh: z.string().trim().min(1).max(40),
  grammarId: logoGrammarIdSchema,
  sourceBriefVersion: z.number().int().positive(),
  sourceStrategyVersion: z.number().int().positive(),
  sourcePromptVersion: z.number().int().positive(),
  renderStyle: logoRenderStyleSchema,
  finalPrompt: z.string().trim().min(1).max(12000),
  customized: z.boolean()
})

export const logoStrategyPromptPackSchema = z.object({
  sourceBriefVersion: z.number().int().positive(),
  sourceStrategyVersion: z.number().int().positive(),
  sourcePromptVersion: z.number().int().positive(),
  grammarLibraryVersion: z.literal(1),
  directions: z.array(logoStrategyPromptDirectionSchema).length(3)
})

export const generateLogoStrategiesSchema = z.object({
  providerId: z.string().min(1),
  briefVersion: z.number().int().positive(),
  brief: logoBrandBriefV2Schema,
  existingRevision: logoDesignRevisionSchema.optional(),
  replaceStrategyId: z.string().min(1).optional()
})

export const buildLogoStrategyPromptPackSchema = z.object({
  brief: logoBrandBriefV2Schema,
  revision: logoDesignRevisionSchema,
  promptVersion: z.number().int().positive(),
  renderStyles: z.record(z.string().min(1), logoRenderStyleSchema).optional()
})

export const logoPromptDirectionSchema = z.object({
  id: logoStyleDirectionSchema,
  name: z.string().trim().min(1),
  prompt: z.string().trim().min(1).max(8000),
  finalPrompt: z.string().trim().min(1).max(12000)
})

export const logoPromptPackSchema = z.object({
  basePrompt: z.string().trim().min(1).max(12000),
  directions: z.array(logoPromptDirectionSchema).min(1).max(4)
})

export const saveLogoProjectSchema = z.object({
  id: z.string().min(1).optional(),
  briefVersion: z.number().int().positive().optional(),
  briefFingerprint: z.string().min(1).optional(),
  promptVersion: z.number().int().positive().optional(),
  promptFingerprint: z.string().min(1).optional(),
  brandName: z.string().trim().min(1).max(120),
  brandNameAlt: z.string().trim().max(120).optional(),
  shortName: z.string().trim().max(40).optional(),
  slogan: z.string().trim().max(160).optional(),
  industry: z.string().trim().min(1).max(120),
  businessDescription: z.string().trim().min(1).max(1200),
  targetAudience: z.string().trim().max(400).optional(),
  brandKeywords: z.array(z.string().trim().min(1).max(40)).min(1).max(6),
  differentiator: z.string().trim().max(600).optional(),
  avoidElements: z.string().trim().max(600).optional(),
  avoidedElements: avoidedElementsSchema.optional(),
  preferredColors: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  avoidedColors: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  logoTypes: z.array(logoTypeSchema).min(1).max(1),
  styleDirections: z.array(logoStyleDirectionSchema).max(3).optional(),
  usageScenarios: z.array(logoUsageScenarioSchema).max(6).default([]),
  referenceImageIds: z.array(z.string().min(1)).max(8),
  referenceNote: z.string().trim().max(600).optional(),
  promptPack: logoPromptPackSchema.optional(),
  designRevision: logoDesignRevisionSchema.optional(),
  strategyPromptPack: logoStrategyPromptPackSchema.optional(),
  workflowStep: z.enum(['brief', 'strategy', 'generation', 'refinement']).optional(),
  generationMode: z.enum(['quality-first', 'economy']).optional(),
  aiReviewEnabled: z.boolean().optional(),
  autoQualityRetry: z.boolean().optional(),
  selectedCandidateId: z.string().min(1).optional()
})

export const buildLogoPromptPackSchema = saveLogoProjectSchema.extend({
  styleDirections: z.array(logoStyleDirectionSchema).min(1).max(3)
})

export const logoBriefSnapshotSchema = z.object({
  brandName: z.string().trim().min(1),
  brandNameAlt: z.string().trim().optional(),
  shortName: z.string().trim().optional(),
  slogan: z.string().trim().optional(),
  industry: z.string().trim().min(1),
  businessDescription: z.string().trim().min(1),
  targetAudience: z.string().trim().optional(),
  brandKeywords: z.array(z.string().trim().min(1)),
  differentiator: z.string().trim().optional(),
  avoidElements: z.string().trim().optional(),
  preferredColors: z.array(z.string()).optional(),
  avoidedColors: z.array(z.string()).optional(),
  usageScenarios: z.array(logoUsageScenarioSchema).optional(),
  referenceNote: z.string().trim().optional()
})

export const logoGenerationMetadataV1Schema = z.object({
  version: z.literal(1).optional(),
  logoProjectId: z.string().min(1),
  styleDirectionId: logoStyleDirectionSchema,
  styleDirectionName: z.string().trim().min(1),
  logoTypes: z.array(logoTypeSchema).min(1).max(1),
  promptPackSnapshot: logoPromptPackSchema,
  finalPrompt: z.string().trim().min(1).max(12000),
  briefSnapshot: logoBriefSnapshotSchema,
  qualityRulesVersion: z.literal(1)
})

export const logoGenerationMetadataV2Schema = z.object({
  version: z.literal(2),
  logoProjectId: z.string().min(1),
  strategyId: z.string().trim().min(1).max(80),
  strategyNameZh: z.string().trim().min(1).max(40),
  grammarId: logoGrammarIdSchema,
  candidateIndex: z.number().int().min(0).max(1),
  logoType: logoTypeSchema,
  designRevisionSnapshot: logoDesignRevisionSchema,
  promptDirectionSnapshot: logoStrategyPromptDirectionSchema,
  briefSnapshot: logoBrandBriefV2Schema,
  qualityRulesVersion: z.literal(2),
  qualityRetryAttempt: z.union([z.literal(0), z.literal(1)]),
  parentVariantId: z.string().min(1).optional()
})

export const logoGenerationMetadataSchema = z.union([
  logoGenerationMetadataV1Schema,
  logoGenerationMetadataV2Schema
])

export const saveProviderSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(80),
  baseUrl: z.string().trim().url(),
  imageModel: z.string().trim().min(1).max(120),
  promptModel: z.string().trim().max(120),
  apiKey: z.string().trim().min(1).optional()
})

export const importAssetSchema = z.object({
  filePath: z.string().min(1)
})

export const exportAssetSchema = z.object({
  assetId: z.string().min(1),
  targetDirectory: z.string().min(1).optional()
})

export const createGenerationSchema = z.object({
  prompt: z.string().trim().min(1).max(12000),
  useOptimizedPrompt: z.boolean(),
  optimizedPrompt: z.string().trim().max(12000).optional(),
  referenceAssetIds: z.array(z.string().min(1)).max(8),
  parameters: generationParametersSchema,
  providerId: z.string().min(1),
  scenario: z.enum(['general', 'logo-design']).optional(),
  projectId: z.string().min(1).optional(),
  scenarioMetadata: logoGenerationMetadataSchema.optional()
})

export const promptOptimizeSchema = z.object({
  providerId: z.string().min(1),
  prompt: z.string().trim().min(1).max(8000)
})
