import { z } from 'zod'

export const generationParametersSchema = z.object({
  size: z.enum(['1024x1024', '1024x1536', '1536x1024', 'auto']),
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
  preferredColors: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  avoidedColors: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  logoTypes: z.array(logoTypeSchema).min(1).max(5),
  styleDirections: z.array(logoStyleDirectionSchema).min(1).max(4),
  usageScenarios: z.array(logoUsageScenarioSchema).max(6).default([]),
  referenceImageIds: z.array(z.string().min(1)).max(8),
  referenceNote: z.string().trim().max(600).optional(),
  promptPack: logoPromptPackSchema.optional()
})

export const buildLogoPromptPackSchema = saveLogoProjectSchema

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

export const logoGenerationMetadataSchema = z.object({
  logoProjectId: z.string().min(1),
  styleDirectionId: logoStyleDirectionSchema,
  styleDirectionName: z.string().trim().min(1),
  logoTypes: z.array(logoTypeSchema).min(1),
  promptPackSnapshot: logoPromptPackSchema,
  finalPrompt: z.string().trim().min(1).max(12000),
  briefSnapshot: logoBriefSnapshotSchema,
  qualityRulesVersion: z.literal(1)
})

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
