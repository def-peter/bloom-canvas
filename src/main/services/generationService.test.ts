import { access, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppPaths } from './appPaths'
import { AssetService } from './assetService'
import { CredentialService } from './credentialService'
import { GenerationService } from './generationService'
import { OpenAICompatibleProvider, type GenerateImageRequest } from './openAICompatibleProvider'
import { ProviderConfigService } from './providerConfigService'
import { StorageService } from './storageService'

let tempRoot: string | null = null

function createPaths(root: string): AppPaths {
  return {
    dataDir: root,
    metadataPath: join(root, 'bloom-canvas.json'),
    referencesDir: join(root, 'assets', 'references'),
    outputsDir: join(root, 'assets', 'outputs'),
    thumbnailsDir: join(root, 'thumbnails'),
    tempDir: join(root, 'temp')
  }
}

class FakeImageProvider extends OpenAICompatibleProvider {
  requests: GenerateImageRequest[] = []

  override async generateImages(
    request: GenerateImageRequest
  ): Promise<Array<{ buffer: Buffer; revisedPrompt?: string }>> {
    this.requests.push(request)
    return Promise.all(
      Array.from({ length: request.parameters.count }, async () => ({
        buffer: await sharp({
          create: { width: 16, height: 16, channels: 3, background: '#2f7d68' }
        })
          .png()
          .toBuffer()
      }))
    )
  }
}

async function createGenerationHarness(): Promise<{
  assets: AssetService
  generations: GenerationService
  imageProvider: FakeImageProvider
  providerId: string
  storage: StorageService
}> {
  tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-generation-'))
  const paths = createPaths(tempRoot)
  const storage = new StorageService(paths)
  const credentials = new CredentialService(paths)
  const providers = new ProviderConfigService(storage, credentials)
  const assets = new AssetService(paths, storage)
  const imageProvider = new FakeImageProvider()
  const generations = new GenerationService(storage, providers, imageProvider, assets)
  const provider = await providers.save({
    name: 'OpenAI',
    baseUrl: 'https://api.example.test/v1',
    imageModel: 'gpt-image-2',
    promptModel: 'gpt-5.5',
    apiKey: 'sk-test'
  })

  return { assets, generations, imageProvider, providerId: provider.id, storage }
}

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  }
})

describe('GenerationService', () => {
  it('creates a text-to-image generation with output asset and variant', async () => {
    const { generations, providerId } = await createGenerationHarness()

    const record = await generations.create({
      providerId,
      prompt: '一朵发光的花',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      }
    })

    expect(record.status).toBe('succeeded')
    expect(record.mode).toBe('text-to-image')
    expect(record.variants).toHaveLength(1)
    expect(record.variants[0].asset.type).toBe('output')
  })

  it('creates an image-to-image generation when references are present', async () => {
    const { assets, generations, providerId } = await createGenerationHarness()
    const sourceImage = join(tempRoot!, 'reference.png')
    await writeFile(
      sourceImage,
      await sharp({ create: { width: 12, height: 12, channels: 3, background: '#ffffff' } })
        .png()
        .toBuffer()
    )
    const reference = await assets.importReference(sourceImage)

    const record = await generations.create({
      providerId,
      prompt: '保留参考图构图，改成水彩质感',
      useOptimizedPrompt: false,
      referenceAssetIds: [reference.id],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      }
    })

    expect(record.status).toBe('succeeded')
    expect(record.mode).toBe('image-to-image')
    expect(record.references[0].id).toBe(reference.id)
  })

  it('stores logo scenario metadata on generated records', async () => {
    const { generations, providerId } = await createGenerationHarness()

    const record = await generations.create({
      providerId,
      prompt: 'final logo prompt',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: 'project-1',
      scenarioMetadata: {
        logoProjectId: 'project-1',
        styleDirectionId: 'modern-minimal',
        styleDirectionName: '现代极简',
        logoTypes: ['combination-mark'],
        promptPackSnapshot: {
          basePrompt: 'base prompt',
          directions: [
            {
              id: 'modern-minimal',
              name: '现代极简',
              prompt: 'direction prompt',
              finalPrompt: 'final logo prompt'
            }
          ]
        },
        finalPrompt: 'final logo prompt',
        briefSnapshot: {
          brandName: '生花',
          industry: 'AI 绘图软件',
          businessDescription: '帮助创作者生成图片',
          brandKeywords: ['清晰']
        },
        qualityRulesVersion: 1
      }
    })

    expect(record.scenario).toBe('logo-design')
    expect(record.projectId).toBe('project-1')
    expect(record.scenarioMetadata?.version).not.toBe(2)
    if (record.scenarioMetadata?.version !== 2) {
      expect(record.scenarioMetadata?.styleDirectionId).toBe('modern-minimal')
    }
    expect(record.promptFinal).toBe('final logo prompt')
  })

  it('retries with the stored final prompt and scenario metadata', async () => {
    const { generations, imageProvider, providerId } = await createGenerationHarness()

    const record = await generations.create({
      providerId,
      prompt: 'original prompt',
      optimizedPrompt: 'final logo prompt',
      useOptimizedPrompt: true,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: 'project-1',
      scenarioMetadata: {
        logoProjectId: 'project-1',
        styleDirectionId: 'modern-minimal',
        styleDirectionName: '现代极简',
        logoTypes: ['combination-mark'],
        promptPackSnapshot: {
          basePrompt: 'base prompt',
          directions: [
            {
              id: 'modern-minimal',
              name: '现代极简',
              prompt: 'direction prompt',
              finalPrompt: 'final logo prompt'
            }
          ]
        },
        finalPrompt: 'final logo prompt',
        briefSnapshot: {
          brandName: '生花',
          industry: 'AI 绘图软件',
          businessDescription: '帮助创作者生成图片',
          brandKeywords: ['清晰']
        },
        qualityRulesVersion: 1
      }
    })

    const retryRecord = await generations.retry(record.id)

    expect(imageProvider.requests.at(-1)?.prompt).toBe('final logo prompt')
    expect(retryRecord.scenario).toBe('logo-design')
    expect(retryRecord.scenarioMetadata?.version).not.toBe(2)
    if (retryRecord.scenarioMetadata?.version !== 2) {
      expect(retryRecord.scenarioMetadata?.styleDirectionId).toBe('modern-minimal')
    }
  })

  it('removes a generation, output assets, variants, and logo project references', async () => {
    const { generations, providerId, storage } = await createGenerationHarness()

    const record = await generations.create({
      providerId,
      prompt: 'final logo prompt',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: 'project-1',
      scenarioMetadata: {
        logoProjectId: 'project-1',
        styleDirectionId: 'modern-minimal',
        styleDirectionName: '现代极简',
        logoTypes: ['combination-mark'],
        promptPackSnapshot: {
          basePrompt: 'base prompt',
          directions: [
            {
              id: 'modern-minimal',
              name: '现代极简',
              prompt: 'direction prompt',
              finalPrompt: 'final logo prompt'
            }
          ]
        },
        finalPrompt: 'final logo prompt',
        briefSnapshot: {
          brandName: '生花',
          industry: 'AI 绘图软件',
          businessDescription: '帮助创作者生成图片',
          brandKeywords: ['清晰']
        },
        qualityRulesVersion: 1
      }
    })
    const assetPath = record.variants[0].asset.filePath
    const thumbnailPath = record.variants[0].asset.thumbnailPath
    await storage.update((state) => ({
      ...state,
      logoProjects: [
        {
          id: 'project-1',
          brandName: '生花',
          industry: 'AI 绘图软件',
          businessDescription: '帮助创作者生成图片',
          brandKeywords: ['清晰'],
          preferredColors: [],
          avoidedColors: [],
          logoTypes: ['combination-mark'],
          styleDirections: ['modern-minimal'],
          usageScenarios: [],
          referenceImageIds: [],
          generationIds: [record.id],
          favoriteVariantIds: [record.variants[0].id],
          createdAt: '2026-07-09T00:00:00.000Z',
          updatedAt: '2026-07-09T00:00:00.000Z'
        }
      ]
    }))

    await generations.remove(record.id)
    const state = await storage.read()

    expect(state.generations).toHaveLength(0)
    expect(state.variants).toHaveLength(0)
    expect(state.assets).toHaveLength(0)
    expect(state.logoProjects[0].generationIds).toEqual([])
    expect(state.logoProjects[0].favoriteVariantIds).toEqual([])
    await expect(access(assetPath)).rejects.toThrow()
    await expect(access(thumbnailPath)).rejects.toThrow()
  })

  it('keeps reference assets when removing an image-to-image generation', async () => {
    const { assets, generations, providerId, storage } = await createGenerationHarness()
    const sourceImage = join(tempRoot!, 'reference.png')
    await writeFile(
      sourceImage,
      await sharp({ create: { width: 12, height: 12, channels: 3, background: '#ffffff' } })
        .png()
        .toBuffer()
    )
    const reference = await assets.importReference(sourceImage)
    const record = await generations.create({
      providerId,
      prompt: '保留参考图主体，改成极简图标',
      useOptimizedPrompt: false,
      referenceAssetIds: [reference.id],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      }
    })
    const outputPath = record.variants[0].asset.filePath

    await generations.remove(record.id)
    const state = await storage.read()

    expect(state.generations).toHaveLength(0)
    expect(state.assets.map((asset) => asset.id)).toEqual([reference.id])
    await expect(access(reference.filePath)).resolves.toBeUndefined()
    await expect(access(outputPath)).rejects.toThrow()
  })

  it('removes only selected variants and keeps the remaining generation output', async () => {
    const { generations, providerId, storage } = await createGenerationHarness()
    const record = await generations.create({
      providerId,
      prompt: '生成两个方向',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 2,
        quality: 'standard',
        outputFormat: 'png'
      }
    })
    const removed = record.variants[0]
    const kept = record.variants[1]

    await generations.removeVariants([removed.id])
    const state = await storage.read()

    expect(state.generations).toHaveLength(1)
    expect(state.generations[0].outputVariantIds).toEqual([kept.id])
    expect(state.variants.map((variant) => variant.id)).toEqual([kept.id])
    expect(state.assets.map((asset) => asset.id)).toEqual([kept.asset.id])
    await expect(access(removed.asset.filePath)).rejects.toThrow()
    await expect(access(kept.asset.filePath)).resolves.toBeUndefined()
  })

  it('removes an empty generation and its logo project references after its last variant', async () => {
    const { generations, providerId, storage } = await createGenerationHarness()
    const record = await generations.create({
      providerId,
      prompt: 'Logo output',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: 'project-1'
    })
    await storage.update((state) => ({
      ...state,
      logoProjects: [
        {
          id: 'project-1',
          brandName: '生花',
          industry: 'AI 绘图软件',
          businessDescription: '帮助创作者生成图片',
          brandKeywords: ['清晰'],
          preferredColors: [],
          avoidedColors: [],
          logoTypes: ['combination-mark'],
          styleDirections: ['modern-minimal'],
          usageScenarios: [],
          referenceImageIds: [],
          generationIds: [record.id],
          favoriteVariantIds: [record.variants[0].id],
          createdAt: '2026-07-09T00:00:00.000Z',
          updatedAt: '2026-07-09T00:00:00.000Z'
        }
      ]
    }))

    await generations.removeVariants([record.variants[0].id])
    const state = await storage.read()

    expect(state.generations).toHaveLength(0)
    expect(state.variants).toHaveLength(0)
    expect(state.logoProjects[0].generationIds).toEqual([])
    expect(state.logoProjects[0].favoriteVariantIds).toEqual([])
  })

  it('keeps a removed output asset while another generation references it', async () => {
    const { generations, providerId, storage } = await createGenerationHarness()
    const source = await generations.create({
      providerId,
      prompt: 'Source image',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      }
    })
    const sourceVariant = source.variants[0]
    const dependent = await generations.create({
      providerId,
      prompt: 'Edit source image',
      useOptimizedPrompt: false,
      referenceAssetIds: [sourceVariant.asset.id],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      }
    })

    await generations.removeVariants([sourceVariant.id])
    const state = await storage.read()

    expect(state.generations.map((generation) => generation.id)).toEqual([dependent.id])
    expect(state.assets.some((asset) => asset.id === sourceVariant.asset.id)).toBe(true)
    await expect(access(sourceVariant.asset.filePath)).resolves.toBeUndefined()
  })
})
