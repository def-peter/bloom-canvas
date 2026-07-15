import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
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

  it('defaults missing logoProjects to an empty list', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    await mkdir(tempRoot, { recursive: true })
    await writeFile(
      join(tempRoot, 'bloom-canvas.json'),
      JSON.stringify({
        providers: [],
        settings: defaultSettings,
        assets: [],
        generations: [],
        variants: []
      }),
      'utf8'
    )
    const storage = new StorageService(createPaths(tempRoot))

    const state = await storage.read()

    expect(state.logoProjects).toEqual([])
  })

  it('persists logo projects', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    const storage = new StorageService(createPaths(tempRoot))

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
          generationIds: [],
          favoriteVariantIds: [],
          createdAt: '2026-07-09T00:00:00.000Z',
          updatedAt: '2026-07-09T00:00:00.000Z'
        }
      ]
    }))

    const state = await storage.read()

    expect(state.logoProjects).toHaveLength(1)
    expect(state.logoProjects[0].brandName).toBe('生花')
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

  it('serializes concurrent updates so later mutations keep earlier changes', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    const storage = new StorageService(createPaths(tempRoot))
    let releaseFirst!: () => void
    let markFirstStarted!: () => void
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve
    })
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const firstUpdate = storage.update(async (state) => {
      markFirstStarted()
      await firstCanFinish
      return { ...state, settings: { ...state.settings, defaultCount: 2 } }
    })
    await firstStarted
    const secondUpdate = storage.update((state) => ({
      ...state,
      settings: { ...state.settings, theme: 'dark' }
    }))
    releaseFirst()
    await Promise.all([firstUpdate, secondUpdate])

    const state = await storage.read()
    expect(state.settings.defaultCount).toBe(2)
    expect(state.settings.theme).toBe('dark')
  })
})
