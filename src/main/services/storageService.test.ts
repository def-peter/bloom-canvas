import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppPaths } from './appPaths'
import { defaultSettings, StorageService } from './storageService'

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

describe('StorageService', () => {
  it('creates default metadata on first read', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    const storage = new StorageService(createPaths(tempRoot))

    const state = await storage.read()

    expect(state.settings).toEqual(defaultSettings)
    expect(state.providers).toEqual([])
    expect(state.assets).toEqual([])
    expect(state.generations).toEqual([])
    expect(state.variants).toEqual([])
  })

  it('persists updates through an atomic write', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    const storage = new StorageService(createPaths(tempRoot))

    await storage.update((state) => ({
      ...state,
      settings: { ...state.settings, defaultCount: 3 }
    }))

    const file = await readFile(join(tempRoot, 'bloom-canvas.json'), 'utf8')
    expect(JSON.parse(file).settings.defaultCount).toBe(3)
    await expect(storage.read()).resolves.toMatchObject({
      settings: { defaultCount: 3 }
    })
  })

  it('recovers to defaults when metadata is corrupt', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    await writeFile(join(tempRoot, 'bloom-canvas.json'), '{broken json', 'utf8')
    const storage = new StorageService(createPaths(tempRoot))

    await expect(storage.read()).resolves.toMatchObject({
      settings: defaultSettings,
      providers: []
    })
  })
})
