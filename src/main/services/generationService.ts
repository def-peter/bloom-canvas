import { rm } from 'fs/promises'
import { nanoid } from 'nanoid'
import type {
  Asset,
  CreateGenerationInput,
  Generation,
  GenerationRecord,
  Variant
} from '../../shared/types'
import type { AssetService } from './assetService'
import type { OpenAICompatibleProvider } from './openAICompatibleProvider'
import type { ProviderConfigService } from './providerConfigService'
import type { StorageService } from './storageService'

export class GenerationService {
  constructor(
    private readonly storage: StorageService,
    private readonly providers: ProviderConfigService,
    private readonly imageProvider: OpenAICompatibleProvider,
    private readonly assets: AssetService
  ) {}

  async list(): Promise<GenerationRecord[]> {
    const state = await this.storage.read()
    return state.generations
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((generation) => this.hydrateGeneration(generation, state.assets, state.variants))
  }

  async create(input: CreateGenerationInput): Promise<GenerationRecord> {
    const state = await this.storage.read()
    const provider = state.providers.find((item) => item.id === input.providerId)
    if (!provider) {
      throw new Error('Provider is not configured')
    }

    const apiKey = await this.providers.getApiKey(provider.id)
    if (!apiKey) {
      throw new Error('Provider API key is missing')
    }

    const now = new Date().toISOString()
    const generationId = nanoid()
    const promptFinal =
      input.useOptimizedPrompt && input.optimizedPrompt ? input.optimizedPrompt : input.prompt
    const referenceAssets = state.assets.filter((asset) =>
      input.referenceAssetIds.includes(asset.id)
    )
    const generation: Generation = {
      id: generationId,
      mode: referenceAssets.length > 0 ? 'image-to-image' : 'text-to-image',
      scenario: input.scenario ?? 'general',
      projectId: input.projectId,
      scenarioMetadata: input.scenarioMetadata,
      promptOriginal: input.prompt,
      promptOptimized: input.optimizedPrompt,
      promptFinal,
      referenceImageIds: input.referenceAssetIds,
      parameters: input.parameters,
      outputVariantIds: [],
      providerId: provider.id,
      status: 'running',
      favorite: false,
      createdAt: now,
      updatedAt: now
    }

    await this.storage.update((current) => ({
      ...current,
      generations: [...current.generations, generation]
    }))

    try {
      const generatedImages = await this.imageProvider.generateImages({
        provider,
        apiKey,
        prompt: promptFinal,
        references: referenceAssets,
        parameters: input.parameters
      })

      const variants: Variant[] = []
      for (let index = 0; index < generatedImages.length; index += 1) {
        const image = generatedImages[index]
        const extension =
          input.parameters.outputFormat === 'jpeg' ? '.jpg' : `.${input.parameters.outputFormat}`
        const asset = await this.assets.saveOutputFromBuffer(
          image.buffer,
          extension as '.png' | '.jpg' | '.webp',
          generationId
        )
        variants.push({
          id: nanoid(),
          generationId,
          assetId: asset.id,
          index,
          revisedPrompt: image.revisedPrompt,
          favorite: false,
          createdAt: new Date().toISOString()
        })
      }

      const updatedState = await this.storage.update((current) => ({
        ...current,
        variants: [...current.variants, ...variants],
        generations: current.generations.map((item) =>
          item.id === generationId
            ? {
                ...item,
                status: 'succeeded',
                outputVariantIds: variants.map((variant) => variant.id),
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }))
      const saved = updatedState.generations.find((item) => item.id === generationId)!
      return this.hydrateGeneration(saved, updatedState.assets, updatedState.variants)
    } catch (error) {
      const updatedState = await this.storage.update((current) => ({
        ...current,
        generations: current.generations.map((item) =>
          item.id === generationId
            ? {
                ...item,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Generation failed',
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }))
      const failed = updatedState.generations.find((item) => item.id === generationId)!
      return this.hydrateGeneration(failed, updatedState.assets, updatedState.variants)
    }
  }

  async favorite(generationId: string, favorite: boolean): Promise<GenerationRecord> {
    const state = await this.storage.update((current) => ({
      ...current,
      generations: current.generations.map((generation) =>
        generation.id === generationId
          ? { ...generation, favorite, updatedAt: new Date().toISOString() }
          : generation
      )
    }))
    const generation = state.generations.find((item) => item.id === generationId)
    if (!generation) {
      throw new Error('Generation not found')
    }
    return this.hydrateGeneration(generation, state.assets, state.variants)
  }

  async retry(generationId: string): Promise<GenerationRecord> {
    const state = await this.storage.read()
    const generation = state.generations.find((item) => item.id === generationId)
    if (!generation) {
      throw new Error('Generation not found')
    }

    return this.create({
      prompt: generation.promptFinal,
      useOptimizedPrompt: false,
      optimizedPrompt: undefined,
      referenceAssetIds: generation.referenceImageIds,
      parameters: generation.parameters,
      providerId: generation.providerId,
      scenario: generation.scenario,
      projectId: generation.projectId,
      scenarioMetadata: generation.scenarioMetadata
    })
  }

  async remove(generationId: string): Promise<void> {
    let removedAssets: Asset[] = []
    await this.storage.update((current) => {
      const generation = current.generations.find((item) => item.id === generationId)
      if (!generation) throw new Error('Generation not found')

      const removedVariants = current.variants.filter(
        (variant) => variant.generationId === generationId
      )
      const removedVariantIds = new Set(removedVariants.map((variant) => variant.id))
      const removedAssetIds = new Set(removedVariants.map((variant) => variant.assetId))
      const now = new Date().toISOString()
      const nextGenerations = current.generations.filter((item) => item.id !== generationId)
      const nextVariants = current.variants.filter(
        (variant) => variant.generationId !== generationId
      )
      const nextLogoProjects = current.logoProjects.map((project) => {
        const favoriteVariantIds = project.favoriteVariantIds.filter(
          (id) => !removedVariantIds.has(id)
        )
        const generationIds = project.generationIds.filter((id) => id !== generationId)
        const changed =
          favoriteVariantIds.length !== project.favoriteVariantIds.length ||
          generationIds.length !== project.generationIds.length

        return changed ? { ...project, favoriteVariantIds, generationIds, updatedAt: now } : project
      })
      const retainedAssetIds = this.collectRetainedAssetIds(
        nextGenerations,
        nextVariants,
        nextLogoProjects
      )
      const deletedAssetIds = new Set(
        [...removedAssetIds].filter((assetId) => !retainedAssetIds.has(assetId))
      )
      removedAssets = current.assets.filter(
        (asset) => asset.type === 'output' && deletedAssetIds.has(asset.id)
      )

      return {
        ...current,
        assets: current.assets.filter(
          (asset) => asset.type !== 'output' || !deletedAssetIds.has(asset.id)
        ),
        generations: nextGenerations,
        variants: nextVariants,
        logoProjects: nextLogoProjects
      }
    })

    await this.removeAssetFiles(removedAssets)
  }

  async removeVariants(variantIds: string[]): Promise<void> {
    const requestedVariantIds = new Set(variantIds)
    if (requestedVariantIds.size === 0) return

    let removedAssets: Asset[] = []
    await this.storage.update((current) => {
      const removedVariants = current.variants.filter((variant) =>
        requestedVariantIds.has(variant.id)
      )
      if (removedVariants.length !== requestedVariantIds.size) {
        throw new Error('Variant not found')
      }

      const removedAssetIds = new Set(removedVariants.map((variant) => variant.assetId))
      const affectedGenerationIds = new Set(removedVariants.map((variant) => variant.generationId))
      const nextVariants = current.variants.filter(
        (variant) => !requestedVariantIds.has(variant.id)
      )
      const generationsWithUpdatedOutputs = current.generations.map((generation) =>
        affectedGenerationIds.has(generation.id)
          ? {
              ...generation,
              outputVariantIds: generation.outputVariantIds.filter(
                (variantId) => !requestedVariantIds.has(variantId)
              ),
              updatedAt: new Date().toISOString()
            }
          : generation
      )
      const removedGenerationIds = new Set(
        generationsWithUpdatedOutputs
          .filter(
            (generation) =>
              affectedGenerationIds.has(generation.id) && generation.outputVariantIds.length === 0
          )
          .map((generation) => generation.id)
      )
      const nextGenerations = generationsWithUpdatedOutputs.filter(
        (generation) => !removedGenerationIds.has(generation.id)
      )
      const now = new Date().toISOString()
      const nextLogoProjects = current.logoProjects.map((project) => {
        const favoriteVariantIds = project.favoriteVariantIds.filter(
          (id) => !requestedVariantIds.has(id)
        )
        const generationIds = project.generationIds.filter((id) => !removedGenerationIds.has(id))
        const changed =
          favoriteVariantIds.length !== project.favoriteVariantIds.length ||
          generationIds.length !== project.generationIds.length

        return changed ? { ...project, favoriteVariantIds, generationIds, updatedAt: now } : project
      })
      const retainedAssetIds = this.collectRetainedAssetIds(
        nextGenerations,
        nextVariants,
        nextLogoProjects
      )
      const deletedAssetIds = new Set(
        [...removedAssetIds].filter((assetId) => !retainedAssetIds.has(assetId))
      )
      removedAssets = current.assets.filter(
        (asset) => asset.type === 'output' && deletedAssetIds.has(asset.id)
      )

      return {
        ...current,
        assets: current.assets.filter(
          (asset) => asset.type !== 'output' || !deletedAssetIds.has(asset.id)
        ),
        generations: nextGenerations,
        variants: nextVariants,
        logoProjects: nextLogoProjects
      }
    })

    await this.removeAssetFiles(removedAssets)
  }

  private collectRetainedAssetIds(
    generations: Generation[],
    variants: Variant[],
    logoProjects: Array<{ referenceImageIds: string[] }>
  ): Set<string> {
    return new Set([
      ...variants.map((variant) => variant.assetId),
      ...generations.flatMap((generation) => generation.referenceImageIds),
      ...logoProjects.flatMap((project) => project.referenceImageIds)
    ])
  }

  private async removeAssetFiles(assets: Asset[]): Promise<void> {
    await Promise.all(
      assets.flatMap((asset) => [
        rm(asset.filePath, { force: true }),
        rm(asset.thumbnailPath, { force: true })
      ])
    )
  }

  private hydrateGeneration(
    generation: Generation,
    assets: Asset[],
    variants: Variant[]
  ): GenerationRecord {
    const variantRecords = generation.outputVariantIds
      .map((variantId) => variants.find((variant) => variant.id === variantId))
      .filter((variant): variant is Variant => Boolean(variant))
      .map((variant) => {
        const asset = assets.find((item) => item.id === variant.assetId)
        return asset ? { ...variant, asset } : null
      })
      .filter((variant): variant is Variant & { asset: Asset } => Boolean(variant))

    return {
      ...generation,
      references: assets.filter((asset) => generation.referenceImageIds.includes(asset.id)),
      variants: variantRecords
    }
  }
}
