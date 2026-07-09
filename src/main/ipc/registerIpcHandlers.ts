import { dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import {
  createGenerationSchema,
  exportAssetSchema,
  importAssetSchema,
  promptOptimizeSchema,
  saveProviderSchema
} from '../../shared/schemas'
import type { AppErrorPayload, AppResult, AppSettings } from '../../shared/types'
import { getAppPaths } from '../services/appPaths'
import { AssetService } from '../services/assetService'
import { CredentialService } from '../services/credentialService'
import { GenerationService } from '../services/generationService'
import { OpenAICompatibleProvider } from '../services/openAICompatibleProvider'
import { PromptOptimizeService } from '../services/promptOptimizeService'
import { ProviderConfigService } from '../services/providerConfigService'
import { StorageService } from '../services/storageService'

function ok<T>(data: T): AppResult<T> {
  return { ok: true, data }
}

function err(error: AppErrorPayload): AppResult<never> {
  return { ok: false, error }
}

function toErrorPayload(error: unknown): AppErrorPayload {
  const message = error instanceof Error ? error.message : 'Unknown error'
  if (message.includes('API key')) return { code: 'api_key_missing', message }
  if (message.includes('Provider')) return { code: 'provider_missing', message }
  if (message.includes('format') || message.includes('validation'))
    return { code: 'validation_error', message }
  if (message.includes('Asset') || message.includes('file')) return { code: 'file_error', message }
  if (message.includes('fetch') || message.includes('network'))
    return { code: 'network_error', message }
  if (message.includes('Provider request failed')) return { code: 'provider_error', message }
  return { code: 'unknown_error', message }
}

export function registerIpcHandlers(): void {
  const paths = getAppPaths()
  const storage = new StorageService(paths)
  const credentials = new CredentialService(paths)
  const providers = new ProviderConfigService(storage, credentials)
  const assets = new AssetService(paths, storage)
  const imageProvider = new OpenAICompatibleProvider()
  const generations = new GenerationService(storage, providers, imageProvider, assets)
  const promptOptimizer = new PromptOptimizeService()

  ipcMain.handle(IPC_CHANNELS.providerList, async () => ok(await providers.list()))
  ipcMain.handle(IPC_CHANNELS.providerGetActive, async () => ok(await providers.getActive()))

  ipcMain.handle(IPC_CHANNELS.providerSave, async (_event, input) => {
    try {
      return ok(await providers.save(saveProviderSchema.parse(input)))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.settingsGet, async () => {
    const state = await storage.read()
    return ok(state.settings)
  })

  ipcMain.handle(IPC_CHANNELS.settingsSave, async (_event, input: Partial<AppSettings>) => {
    const state = await storage.update((current) => ({
      ...current,
      settings: { ...current.settings, ...input }
    }))
    return ok(state.settings)
  })

  ipcMain.handle(IPC_CHANNELS.assetImport, async (_event, input) => {
    try {
      const parsed = importAssetSchema.parse(input)
      return ok(await assets.importReference(parsed.filePath))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.assetExport, async (_event, input) => {
    try {
      const parsed = exportAssetSchema.parse(input)
      let targetDirectory = parsed.targetDirectory
      if (!targetDirectory) {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
        targetDirectory = result.filePaths[0]
      }
      return ok(await assets.exportAsset(parsed.assetId, targetDirectory))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.generationList, async () => ok(await generations.list()))

  ipcMain.handle(IPC_CHANNELS.generationCreate, async (_event, input) => {
    try {
      return ok(await generations.create(createGenerationSchema.parse(input)))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.generationFavorite,
    async (_event, generationId: string, favorite: boolean) => {
      try {
        return ok(await generations.favorite(generationId, favorite))
      } catch (error) {
        return err(toErrorPayload(error))
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.generationRetry, async (_event, generationId: string) => {
    try {
      return ok(await generations.retry(generationId))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.promptOptimize, async (_event, input) => {
    try {
      const parsed = promptOptimizeSchema.parse(input)
      const state = await storage.read()
      const provider = state.providers.find((item) => item.id === parsed.providerId)
      if (!provider) throw new Error('Provider is not configured')
      const apiKey = await providers.getApiKey(provider.id)
      if (!apiKey) throw new Error('Provider API key is missing')
      return ok(await promptOptimizer.optimize(provider, apiKey, parsed.prompt))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })
}
