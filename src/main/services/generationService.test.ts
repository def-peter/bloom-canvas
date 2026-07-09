import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppPaths } from './appPaths'
import { AssetService } from './assetService'
import { CredentialService } from './credentialService'
import { GenerationService } from './generationService'
import { OpenAICompatibleProvider } from './openAICompatibleProvider'
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
  override async generateImages(): Promise<Array<{ buffer: Buffer; revisedPrompt?: string }>> {
    return [
      {
        buffer: await sharp({
          create: { width: 16, height: 16, channels: 3, background: '#2f7d68' }
        })
          .png()
          .toBuffer()
      }
    ]
  }
}

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  }
})

describe('GenerationService', () => {
  it('creates a text-to-image generation with output asset and variant', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-generation-'))
    const paths = createPaths(tempRoot)
    const storage = new StorageService(paths)
    const credentials = new CredentialService(paths)
    const providers = new ProviderConfigService(storage, credentials)
    const assets = new AssetService(paths, storage)
    const generations = new GenerationService(storage, providers, new FakeImageProvider(), assets)

    const provider = await providers.save({
      name: 'OpenAI',
      baseUrl: 'https://api.example.test/v1',
      imageModel: 'gpt-image-2',
      promptModel: 'gpt-5.5',
      apiKey: 'sk-test'
    })

    const record = await generations.create({
      providerId: provider.id,
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
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-generation-'))
    const paths = createPaths(tempRoot)
    const sourceImage = join(tempRoot, 'reference.png')
    await writeFile(
      sourceImage,
      await sharp({ create: { width: 12, height: 12, channels: 3, background: '#ffffff' } })
        .png()
        .toBuffer()
    )
    const storage = new StorageService(paths)
    const credentials = new CredentialService(paths)
    const providers = new ProviderConfigService(storage, credentials)
    const assets = new AssetService(paths, storage)
    const generations = new GenerationService(storage, providers, new FakeImageProvider(), assets)
    const provider = await providers.save({
      name: 'OpenAI',
      baseUrl: 'https://api.example.test/v1',
      imageModel: 'gpt-image-2',
      promptModel: 'gpt-5.5',
      apiKey: 'sk-test'
    })
    const reference = await assets.importReference(sourceImage)

    const record = await generations.create({
      providerId: provider.id,
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
})
