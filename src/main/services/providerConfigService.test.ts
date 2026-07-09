import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppPaths } from './appPaths'
import { CredentialService } from './credentialService'
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

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  }
})

describe('ProviderConfigService', () => {
  it('stores api keys outside metadata', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-provider-'))
    const paths = createPaths(tempRoot)
    const storage = new StorageService(paths)
    const credentials = new CredentialService(paths)
    const providers = new ProviderConfigService(storage, credentials)

    const provider = await providers.save({
      name: 'Local Relay',
      baseUrl: 'https://example.test/v1/',
      imageModel: 'gpt-image-2',
      promptModel: 'gpt-5.5',
      apiKey: 'sk-local-secret'
    })

    const metadata = await readFile(paths.metadataPath, 'utf8')
    expect(provider.baseUrl).toBe('https://example.test/v1')
    expect(provider.hasApiKey).toBe(true)
    expect(metadata).not.toContain('sk-local-secret')
    await expect(providers.getApiKey(provider.id)).resolves.toBe('sk-local-secret')
  })
})
