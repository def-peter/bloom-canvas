import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { AppPaths } from './appPaths'
import { LogoProjectService } from './logoProjectService'
import { StorageService } from './storageService'

let rootDir: string
let service: LogoProjectService

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

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'bloom-logo-project-'))
  service = new LogoProjectService(new StorageService(pathsFor(rootDir)))
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

describe('LogoProjectService', () => {
  test('creates a logo project with defaults and a prompt pack', async () => {
    const project = await service.save({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者生成图片',
      brandKeywords: ['清晰'],
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal'],
      referenceImageIds: []
    })

    expect(project.id).toBeTruthy()
    expect(project.preferredColors).toEqual([])
    expect(project.generationIds).toEqual([])
    expect(project.promptPack?.directions[0].id).toBe('modern-minimal')
  })

  test('updates an existing project without losing generation ids', async () => {
    const created = await service.save({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者生成图片',
      brandKeywords: ['清晰'],
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal'],
      referenceImageIds: []
    })
    await service.appendGeneration(created.id, 'generation-1')

    const updated = await service.save({
      ...created,
      brandKeywords: ['清晰', '克制'],
      styleDirections: ['modern-minimal', 'symbolic-mark'],
      referenceImageIds: []
    })

    expect(updated.generationIds).toEqual(['generation-1'])
    expect(updated.promptPack?.directions).toHaveLength(2)
  })
})
