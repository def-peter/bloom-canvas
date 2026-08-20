import type {
  BuildLogoRefinementPromptInput,
  BuildLogoStrategyPromptPackInput,
  GenerateLogoStrategiesInput,
  LogoDesignRevision,
  LogoCandidateReview,
  LogoPreviewSet,
  ReviewLogoCandidateInput,
  LogoStrategyPromptPack
} from './logoDesign'
import type {
  AppResult,
  AppSettings,
  Asset,
  BuildLogoPromptPackInput,
  CreateGenerationInput,
  ExportAssetInput,
  GenerationRecord,
  ImportAssetInput,
  LogoProject,
  LogoProjectId,
  LogoPromptPack,
  PromptOptimizeInput,
  ProviderConfig,
  SaveLogoProjectInput,
  SaveProviderInput
} from './types'

export const IPC_CHANNELS = {
  providerList: 'provider:list',
  providerSave: 'provider:save',
  providerGetActive: 'provider:getActive',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  assetImport: 'asset:import',
  assetExport: 'asset:export',
  assetGetMany: 'asset:getMany',
  generationCreate: 'generation:create',
  generationList: 'generation:list',
  generationFavorite: 'generation:favorite',
  generationRemove: 'generation:remove',
  generationRemoveVariants: 'generation:removeVariants',
  generationRetry: 'generation:retry',
  promptOptimize: 'prompt:optimize',
  logoProjectList: 'logoProject:list',
  logoProjectSave: 'logoProject:save',
  logoProjectGet: 'logoProject:get',
  logoProjectRemove: 'logoProject:remove',
  logoPromptBuild: 'logoPrompt:build',
  logoStrategyGenerate: 'logoStrategy:generate',
  logoPromptBuildStrategy: 'logoPrompt:buildStrategy',
  logoPromptBuildRefinement: 'logoPrompt:buildRefinement',
  logoPreviewGet: 'logoPreview:get',
  logoReviewRun: 'logoReview:run',
  updateGetStatus: 'update:getStatus',
  updateCheck: 'update:check',
  updateDownload: 'update:download',
  updateInstall: 'update:install',
  updateStatusChanged: 'update:statusChanged'
} as const

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unsupported'

export interface AppUpdateStatus {
  phase: UpdatePhase
  currentVersion: string
  availableVersion?: string
  releaseName?: string
  releaseNotes?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  message?: string
  checkedAt?: string
}

export interface BloomCanvasApi {
  updates: {
    getStatus: () => Promise<AppResult<AppUpdateStatus>>
    check: () => Promise<AppResult<AppUpdateStatus>>
    download: () => Promise<AppResult<AppUpdateStatus>>
    install: () => Promise<AppResult<void>>
    onStatusChanged: (listener: (status: AppUpdateStatus) => void) => () => void
  }
  providers: {
    list: () => Promise<AppResult<ProviderConfig[]>>
    save: (input: SaveProviderInput) => Promise<AppResult<ProviderConfig>>
    getActive: () => Promise<AppResult<ProviderConfig | null>>
  }
  settings: {
    get: () => Promise<AppResult<AppSettings>>
    save: (input: Partial<AppSettings>) => Promise<AppResult<AppSettings>>
  }
  assets: {
    getPathForFile: (file: unknown) => string
    import: (input: ImportAssetInput) => Promise<AppResult<Asset>>
    export: (input: ExportAssetInput) => Promise<AppResult<string>>
    getMany: (assetIds: string[]) => Promise<AppResult<Asset[]>>
  }
  generations: {
    create: (input: CreateGenerationInput) => Promise<AppResult<GenerationRecord>>
    list: () => Promise<AppResult<GenerationRecord[]>>
    favorite: (generationId: string, favorite: boolean) => Promise<AppResult<GenerationRecord>>
    remove: (generationId: string) => Promise<AppResult<void>>
    removeVariants: (variantIds: string[]) => Promise<AppResult<void>>
    retry: (generationId: string) => Promise<AppResult<GenerationRecord>>
  }
  prompt: {
    optimize: (input: PromptOptimizeInput) => Promise<AppResult<string>>
  }
  logoProjects: {
    list: () => Promise<AppResult<LogoProject[]>>
    save: (input: SaveLogoProjectInput) => Promise<AppResult<LogoProject>>
    get: (id: LogoProjectId) => Promise<AppResult<LogoProject>>
    remove: (id: LogoProjectId) => Promise<AppResult<void>>
  }
  logoStrategy: {
    generate: (input: GenerateLogoStrategiesInput) => Promise<AppResult<LogoDesignRevision>>
  }
  logoPreview: {
    get: (assetId: string) => Promise<AppResult<LogoPreviewSet>>
  }
  logoReview: {
    run: (input: ReviewLogoCandidateInput) => Promise<AppResult<LogoCandidateReview>>
  }
  logoPrompt: {
    build: (input: BuildLogoPromptPackInput) => Promise<AppResult<LogoPromptPack>>
    buildStrategy: (
      input: BuildLogoStrategyPromptPackInput
    ) => Promise<AppResult<LogoStrategyPromptPack>>
    buildRefinement: (input: BuildLogoRefinementPromptInput) => Promise<AppResult<string>>
  }
}
