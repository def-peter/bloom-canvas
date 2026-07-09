import { nanoid } from 'nanoid'
import type { ProviderConfig, SaveProviderInput } from '../../shared/types'
import type { CredentialService } from './credentialService'
import type { StorageService } from './storageService'

export class ProviderConfigService {
  constructor(
    private readonly storage: StorageService,
    private readonly credentials: CredentialService
  ) {}

  async list(): Promise<ProviderConfig[]> {
    const state = await this.storage.read()
    return state.providers
  }

  async getActive(): Promise<ProviderConfig | null> {
    const state = await this.storage.read()
    const activeId = state.settings.defaultProviderId
    return (
      state.providers.find((provider) => provider.id === activeId) ?? state.providers[0] ?? null
    )
  }

  async save(input: SaveProviderInput): Promise<ProviderConfig> {
    const now = new Date().toISOString()
    const providerId = input.id ?? nanoid()

    if (input.apiKey) {
      await this.credentials.saveApiKey(providerId, input.apiKey)
    }

    let savedProvider: ProviderConfig | null = null

    await this.storage.update((state) => {
      const existing = state.providers.find((provider) => provider.id === providerId)
      const nextProvider: ProviderConfig = {
        id: providerId,
        name: input.name,
        baseUrl: input.baseUrl.replace(/\/+$/, ''),
        imageModel: input.imageModel,
        promptModel: input.promptModel,
        hasApiKey: input.apiKey ? true : (existing?.hasApiKey ?? false),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      }

      savedProvider = nextProvider

      const providers = existing
        ? state.providers.map((provider) => (provider.id === providerId ? nextProvider : provider))
        : [...state.providers, nextProvider]

      return {
        ...state,
        providers,
        settings: {
          ...state.settings,
          defaultProviderId: state.settings.defaultProviderId ?? providerId
        }
      }
    })

    return savedProvider!
  }

  async getApiKey(providerId: string): Promise<string | null> {
    return this.credentials.getApiKey(providerId)
  }
}
