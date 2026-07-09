import { z } from 'zod'

export const generationParametersSchema = z.object({
  size: z.enum(['1024x1024', '1024x1536', '1536x1024', 'auto']),
  count: z.number().int().min(1).max(4),
  quality: z.enum(['standard', 'hd']),
  outputFormat: z.enum(['png', 'jpeg', 'webp'])
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
  prompt: z.string().trim().min(1).max(8000),
  useOptimizedPrompt: z.boolean(),
  optimizedPrompt: z.string().trim().max(8000).optional(),
  referenceAssetIds: z.array(z.string().min(1)).max(8),
  parameters: generationParametersSchema,
  providerId: z.string().min(1)
})

export const promptOptimizeSchema = z.object({
  providerId: z.string().min(1),
  prompt: z.string().trim().min(1).max(8000)
})
