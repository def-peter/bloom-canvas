import type {
  LogoBrandBriefV2,
  LogoDesignRevision,
  LogoGenerationMode,
  LogoGrammarId,
  LogoStrategyPromptDirection,
  LogoStrategyPromptPack,
  LogoType,
  LogoUsageScenario,
  LogoWorkflowStep
} from './logoDesign'
import type { GenerationSize } from './imageSize'

export type * from './logoDesign'
export type { GenerationSize } from './imageSize'

export type ProviderId = string
export type GenerationId = string
export type AssetId = string
export type VariantId = string
export type LogoProjectId = string

export type GenerationScenario = 'general' | 'logo-design'
export type GenerationMode = 'text-to-image' | 'image-to-image'
export type GenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed'
export type AssetType = 'reference' | 'output'
export type ImageQuality = 'standard' | 'hd'
export type OutputFormat = 'png' | 'jpeg' | 'webp'
export type LogoStyleDirectionId =
  | 'modern-minimal'
  | 'symbolic-mark'
  | 'wordmark'
  | 'lettermark'
  | 'emblem'
  | 'tech'
  | 'friendly-rounded'
  | 'eastern-modern'
  | 'premium-restraint'
export interface GenerationParameters {
  size: GenerationSize
  count: number
  quality: ImageQuality
  outputFormat: OutputFormat
}

export interface ProviderConfig {
  id: ProviderId
  name: string
  baseUrl: string
  imageModel: string
  promptModel: string
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  defaultProviderId: ProviderId | null
  defaultSize: GenerationParameters['size']
  defaultQuality: ImageQuality
  defaultCount: number
  defaultOutputFormat: OutputFormat
  outputDirectory: string | null
  theme: 'light' | 'dark' | 'system'
}

export interface Asset {
  id: AssetId
  type: AssetType
  filePath: string
  thumbnailPath: string
  mimeType: string
  width: number
  height: number
  size: number
  sha256: string
  createdAt: string
  sourceGenerationId?: GenerationId
}

export interface Variant {
  id: VariantId
  generationId: GenerationId
  assetId: AssetId
  index: number
  revisedPrompt?: string
  favorite: boolean
  createdAt: string
}

export interface LogoPromptDirection {
  id: LogoStyleDirectionId
  name: string
  prompt: string
  finalPrompt: string
}

export interface LogoPromptPack {
  basePrompt: string
  directions: LogoPromptDirection[]
}

export interface LogoProject {
  id: LogoProjectId
  briefVersion?: number
  briefFingerprint?: string
  promptVersion?: number
  promptFingerprint?: string
  brandName: string
  brandNameAlt?: string
  shortName?: string
  slogan?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidElements?: string
  avoidedElements?: string[]
  preferredColors: string[]
  avoidedColors: string[]
  logoTypes: LogoType[]
  styleDirections: LogoStyleDirectionId[]
  usageScenarios: LogoUsageScenario[]
  referenceImageIds: AssetId[]
  referenceNote?: string
  promptPack?: LogoPromptPack
  designRevision?: LogoDesignRevision
  strategyPromptPack?: LogoStrategyPromptPack
  workflowStep?: LogoWorkflowStep
  generationMode?: LogoGenerationMode
  aiReviewEnabled?: boolean
  autoQualityRetry?: boolean
  selectedCandidateId?: VariantId
  generationIds: GenerationId[]
  favoriteVariantIds: VariantId[]
  createdAt: string
  updatedAt: string
}

export interface LogoBriefSnapshot {
  brandName: string
  brandNameAlt?: string
  shortName?: string
  slogan?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidElements?: string
  preferredColors?: string[]
  avoidedColors?: string[]
  usageScenarios?: LogoUsageScenario[]
  referenceNote?: string
}

export interface LogoGenerationMetadataV1 {
  version?: 1
  logoProjectId: LogoProjectId
  styleDirectionId: LogoStyleDirectionId
  styleDirectionName: string
  logoTypes: LogoType[]
  promptPackSnapshot: LogoPromptPack
  finalPrompt: string
  briefSnapshot: LogoBriefSnapshot
  qualityRulesVersion: 1
}

export interface LogoGenerationMetadataV2 {
  version: 2
  logoProjectId: LogoProjectId
  strategyId: string
  strategyNameZh: string
  grammarId: LogoGrammarId
  candidateIndex: number
  logoType: LogoType
  designRevisionSnapshot: LogoDesignRevision
  promptDirectionSnapshot: LogoStrategyPromptDirection
  briefSnapshot: LogoBrandBriefV2
  qualityRulesVersion: 2
  qualityRetryAttempt: 0 | 1
  parentVariantId?: VariantId
}

export type LogoGenerationMetadata = LogoGenerationMetadataV1 | LogoGenerationMetadataV2

export interface Generation {
  id: GenerationId
  mode: GenerationMode
  scenario?: GenerationScenario
  projectId?: LogoProjectId
  scenarioMetadata?: LogoGenerationMetadata
  promptOriginal: string
  promptOptimized?: string
  promptFinal: string
  referenceImageIds: AssetId[]
  parameters: GenerationParameters
  outputVariantIds: VariantId[]
  providerId: ProviderId
  status: GenerationStatus
  favorite: boolean
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface GenerationRecord extends Generation {
  references: Asset[]
  variants: Array<Variant & { asset: Asset }>
}

export interface CreateGenerationInput {
  prompt: string
  useOptimizedPrompt: boolean
  optimizedPrompt?: string
  referenceAssetIds: AssetId[]
  parameters: GenerationParameters
  providerId: ProviderId
  scenario?: GenerationScenario
  projectId?: LogoProjectId
  scenarioMetadata?: LogoGenerationMetadata
}

export interface SaveProviderInput {
  id?: ProviderId
  name: string
  baseUrl: string
  imageModel: string
  promptModel: string
  apiKey?: string
}

export interface ImportAssetInput {
  filePath: string
}

export interface ExportAssetInput {
  assetId: AssetId
  targetDirectory?: string
}

export interface PromptOptimizeInput {
  providerId: ProviderId
  prompt: string
}

export interface SaveLogoProjectInput {
  id?: LogoProjectId
  briefVersion?: number
  briefFingerprint?: string
  promptVersion?: number
  promptFingerprint?: string
  brandName: string
  brandNameAlt?: string
  shortName?: string
  slogan?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidElements?: string
  avoidedElements?: string[]
  preferredColors?: string[]
  avoidedColors?: string[]
  logoTypes: LogoType[]
  styleDirections?: LogoStyleDirectionId[]
  usageScenarios?: LogoUsageScenario[]
  referenceImageIds: AssetId[]
  referenceNote?: string
  promptPack?: LogoPromptPack
  designRevision?: LogoDesignRevision
  strategyPromptPack?: LogoStrategyPromptPack
  workflowStep?: LogoWorkflowStep
  generationMode?: LogoGenerationMode
  aiReviewEnabled?: boolean
  autoQualityRetry?: boolean
  selectedCandidateId?: VariantId
}

export interface BuildLogoPromptPackInput extends SaveLogoProjectInput {
  id?: LogoProjectId
  styleDirections: LogoStyleDirectionId[]
}

export interface AppErrorPayload {
  code:
    | 'provider_missing'
    | 'api_key_missing'
    | 'network_error'
    | 'provider_error'
    | 'file_error'
    | 'validation_error'
    | 'unknown_error'
  message: string
  detail?: string
}

export interface ResultOk<T> {
  ok: true
  data: T
}

export interface ResultErr {
  ok: false
  error: AppErrorPayload
}

export type AppResult<T> = ResultOk<T> | ResultErr
