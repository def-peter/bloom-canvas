import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { logoTestPromptPack, logoTestRevision } from '../../shared/logoDesign.testFixtures'
import { saveLogoProjectSchema } from '../../shared/schemas'
import type { LogoProject, SaveLogoProjectInput } from '../../shared/types'
import type { AppPaths } from './appPaths'
import { LogoProjectService } from './logoProjectService'
import { defaultSettings, StorageService } from './storageService'

let rootDir: string
let paths: AppPaths
let storage: StorageService
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

function legacyProject(overrides: Partial<LogoProject> = {}): LogoProject {
  return {
    id: 'project-1',
    brandName: '生花',
    industry: 'AI 绘图软件',
    businessDescription: '帮助创作者生成图片',
    brandKeywords: ['清晰'],
    avoidElements: '复杂花瓣, 叶片，AI sparkle、robot head\n齿轮',
    preferredColors: [],
    avoidedColors: [],
    logoTypes: ['combination-mark'],
    styleDirections: ['modern-minimal'],
    usageScenarios: [],
    referenceImageIds: [],
    promptPack: {
      basePrompt: 'legacy base prompt',
      directions: [
        {
          id: 'modern-minimal',
          name: '现代极简',
          prompt: 'legacy direction prompt',
          finalPrompt: 'legacy final prompt'
        }
      ]
    },
    generationIds: [],
    favoriteVariantIds: [],
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    ...overrides
  }
}

async function seedProject(project: LogoProject): Promise<void> {
  await storage.write({
    providers: [],
    settings: defaultSettings,
    assets: [],
    generations: [],
    variants: [],
    logoProjects: [project]
  })
}

function parseProjectUpdate(
  project: LogoProject,
  overrides: Record<string, unknown> = {}
): SaveLogoProjectInput {
  return saveLogoProjectSchema.parse({
    id: project.id,
    brandName: project.brandName,
    industry: project.industry,
    businessDescription: project.businessDescription,
    brandKeywords: project.brandKeywords,
    logoTypes: project.logoTypes,
    referenceImageIds: project.referenceImageIds,
    ...overrides
  })
}

async function readPersistedProject(projectId: string): Promise<LogoProject> {
  const state = await new StorageService(paths).read()
  const project = state.logoProjects.find((item) => item.id === projectId)
  if (!project) throw new Error('Persisted logo project not found')
  return project
}

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'bloom-logo-project-'))
  paths = pathsFor(rootDir)
  storage = new StorageService(paths)
  service = new LogoProjectService(storage)
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

describe('LogoProjectService', () => {
  test('migrates a legacy metadata project through a parsed V2 save', async () => {
    const existing = legacyProject()
    await seedProject(existing)

    const input = parseProjectUpdate(existing, {
      briefVersion: 1,
      briefFingerprint: 'brief-fingerprint',
      promptVersion: 1,
      promptFingerprint: 'prompt-fingerprint',
      designRevision: logoTestRevision,
      strategyPromptPack: logoTestPromptPack
    })

    await service.save(input)

    const persisted = await readPersistedProject(existing.id)
    expect(persisted.styleDirections).toEqual(existing.styleDirections)
    expect(persisted.promptPack).toEqual(existing.promptPack)
    expect(persisted.avoidElements).toBe(existing.avoidElements)
    expect(persisted.avoidedElements).toEqual([
      '复杂花瓣',
      '叶片',
      'AI sparkle',
      'robot head',
      '齿轮'
    ])
    expect(persisted.designRevision).toEqual(logoTestRevision)
    expect(persisted.strategyPromptPack).toEqual(logoTestPromptPack)
  })

  test('clears legacy directions and prompt pack only when an update explicitly requests it', async () => {
    const existing = legacyProject()
    await seedProject(existing)

    const input = parseProjectUpdate(existing, { styleDirections: [] })
    await service.save(input)

    const persisted = await readPersistedProject(existing.id)
    expect(persisted.styleDirections).toEqual([])
    expect(persisted.promptPack).toBeUndefined()
  })

  test('defaults omitted legacy directions for a new parsed project', async () => {
    const input = parseProjectUpdate(legacyProject({ id: 'new-project' }))
    const created = await service.save({ ...input, id: undefined })

    const persisted = await readPersistedProject(created.id)
    expect(persisted.styleDirections).toEqual([])
    expect(persisted.promptPack).toBeUndefined()
  })

  test('remigrates avoided elements when the old UI changes the legacy field', async () => {
    const existing = legacyProject({
      briefVersion: 1,
      avoidElements: '旧值',
      avoidedElements: ['旧值']
    })
    await seedProject(existing)

    const input = parseProjectUpdate(existing, {
      avoidElements: '新花瓣，旧叶片、AI sparkle'
    })
    await service.save(input)

    const persisted = await readPersistedProject(existing.id)
    expect(persisted.avoidElements).toBe('新花瓣，旧叶片、AI sparkle')
    expect(persisted.avoidedElements).toEqual(['新花瓣', '旧叶片', 'AI sparkle'])
  })

  test('preserves V2 avoided elements after an equivalent legacy UI save', async () => {
    const existing = legacyProject({
      briefVersion: 1,
      avoidElements: 'old flower',
      avoidedElements: ['old flower']
    })
    await seedProject(existing)

    const v2Input = parseProjectUpdate(existing, {
      avoidedElements: ['new leaf', 'open canvas']
    })
    await service.save(v2Input)

    const afterV2Save = await readPersistedProject(existing.id)
    expect(afterV2Save.avoidElements).toBe('new leaf，open canvas')
    expect(afterV2Save.avoidedElements).toEqual(['new leaf', 'open canvas'])

    const legacyInput = parseProjectUpdate(afterV2Save, {
      avoidElements: afterV2Save.avoidElements,
      styleDirections: afterV2Save.styleDirections,
      promptPack: afterV2Save.promptPack
    })
    await service.save(legacyInput)

    const afterLegacySave = await readPersistedProject(existing.id)
    expect(afterLegacySave.avoidElements).toBe('new leaf，open canvas')
    expect(afterLegacySave.avoidedElements).toEqual(['new leaf', 'open canvas'])
  })

  test('accepts 600 serialized exclusion characters and rejects 601 before writing', async () => {
    const existing = legacyProject({
      briefVersion: 1,
      avoidElements: '保留旧值',
      avoidedElements: ['保留旧值']
    })
    await seedProject(existing)

    const exactly600 = [
      'a'.repeat(120),
      'b'.repeat(120),
      'c'.repeat(120),
      'd'.repeat(120),
      'e'.repeat(116)
    ]
    const exactly601 = [...exactly600.slice(0, -1), 'e'.repeat(117)]
    expect(exactly600.join('，')).toHaveLength(600)
    expect(exactly601.join('，')).toHaveLength(601)

    const acceptedInput = parseProjectUpdate(existing, { avoidedElements: exactly600 })
    await service.save(acceptedInput)

    const afterAcceptedSave = await readPersistedProject(existing.id)
    expect(afterAcceptedSave.avoidElements).toHaveLength(600)
    expect(afterAcceptedSave.avoidedElements).toEqual(exactly600)

    const legacyInput = parseProjectUpdate(afterAcceptedSave, {
      avoidElements: afterAcceptedSave.avoidElements
    })
    await service.save(legacyInput)

    await expect(
      (async () => {
        const rejectedInput = parseProjectUpdate(afterAcceptedSave, {
          avoidedElements: exactly601
        })
        return service.save(rejectedInput)
      })()
    ).rejects.toThrow(/validation.*total.*600/i)

    const afterRejectedSave = await readPersistedProject(existing.id)
    expect(afterRejectedSave.avoidElements).toBe(exactly600.join('，'))
    expect(afterRejectedSave.avoidedElements).toEqual(exactly600)
  })

  test.each([
    ['a 121-character item', 'x'.repeat(121)],
    ['13 items', Array.from({ length: 13 }, (_, index) => `item-${index + 1}`).join(',')]
  ])('rejects migration with %s and preserves persisted data', async (_case, avoidElements) => {
    const existing = legacyProject({
      briefVersion: 1,
      avoidElements: '保留旧值',
      avoidedElements: ['保留旧值']
    })
    await seedProject(existing)

    const input = parseProjectUpdate(existing, { avoidElements })
    await expect(service.save(input)).rejects.toThrow(/validation/i)

    const persisted = await readPersistedProject(existing.id)
    expect(persisted.avoidElements).toBe('保留旧值')
    expect(persisted.avoidedElements).toEqual(['保留旧值'])
  })

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
