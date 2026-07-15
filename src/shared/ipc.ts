import type {
  BuildLogoStrategyPromptPackInput,
  GenerateLogoStrategiesInput,
  LogoDesignRevision,
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
  logoPromptBuildStrategy: 'logoPrompt:buildStrategy'
} as const

export interface BloomCanvasApi {
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
  logoPrompt: {
    build: (input: BuildLogoPromptPackInput) => Promise<AppResult<LogoPromptPack>>
    buildStrategy: (
      input: BuildLogoStrategyPromptPackInput
    ) => Promise<AppResult<LogoStrategyPromptPack>>
  }
}
