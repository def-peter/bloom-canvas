import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import sharp from 'sharp'
import { afterEach, describe, expect, test } from 'vitest'
import type { AppPaths } from './appPaths'
import { AssetService } from './assetService'
import { StorageService } from './storageService'

let rootDir: string | null = null

function pathsFor(dir: string): AppPaths {
  return {
    dataDir: dir,
    metadataPath: join(dir, 'metadata.json'),
    referencesDir: join(dir, 'references'),
    outputsDir: join(dir, 'outputs'),
    thumbnailsDir: join(dir, 'thumbnails'),
    tempDir: join(dir, 'temp')
  }
}

afterEach(async () => {
  if (rootDir) await rm(rootDir, { force: true, recursive: true })
  rootDir = null
})

describe('AssetService', () => {
  test('returns existing assets in requested order and ignores stale ids', async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'bloom-assets-'))
    const paths = pathsFor(rootDir)
    const service = new AssetService(paths, new StorageService(paths))
    const sourcePath = join(rootDir, 'reference.png')
    await writeFile(
      sourcePath,
      await sharp({ create: { width: 12, height: 12, channels: 3, background: '#ffffff' } })
        .png()
        .toBuffer()
    )
    const reference = await service.importReference(sourcePath)

    const assets = await service.getMany(['missing-asset', reference.id])

    expect(assets.map((asset) => asset.id)).toEqual([reference.id])
  })

  test('imports a clipboard image buffer as a reference asset', async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'bloom-assets-'))
    const paths = pathsFor(rootDir)
    const service = new AssetService(paths, new StorageService(paths))
    const imageBuffer = await sharp({
      create: { width: 24, height: 16, channels: 3, background: '#1677ff' }
    })
      .png()
      .toBuffer()

    const reference = await service.importReferenceBuffer(imageBuffer, 'image/png')

    expect(reference.type).toBe('reference')
    expect(reference.mimeType).toBe('image/png')
    expect(reference.width).toBe(24)
    expect(reference.height).toBe(16)
    expect(reference.size).toBe(imageBuffer.byteLength)
  })

  test('rejects clipboard bytes that do not match the declared image format', async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'bloom-assets-'))
    const paths = pathsFor(rootDir)
    const service = new AssetService(paths, new StorageService(paths))
    const jpegBuffer = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#ffffff' }
    })
      .jpeg()
      .toBuffer()

    await expect(service.importReferenceBuffer(jpegBuffer, 'image/png')).rejects.toThrow(
      'does not match'
    )
  })
})
