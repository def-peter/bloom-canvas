import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  logoTestBrief,
  logoTestPromptPack,
  logoTestRevision
} from '../../shared/logoDesign.testFixtures'
import { saveLogoProjectSchema } from '../../shared/schemas'
import type { LogoProject, SaveLogoProjectInput } from '../../shared/types'
import { createBriefFingerprint, createPromptFingerprint } from '../logo/logoBriefNormalizer'
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

function v2ProjectInput(overrides: Partial<SaveLogoProjectInput> = {}): SaveLogoProjectInput {
  return {
    brandName: logoTestBrief.brandName,
    brandNameAlt: logoTestBrief.brandNameAlt,
    shortName: logoTestBrief.shortName,
    industry: logoTestBrief.industry,
    businessDescription: logoTestBrief.businessDescription,
    targetAudience: logoTestBrief.targetAudience,
    brandKeywords: logoTestBrief.brandKeywords,
    differentiator: logoTestBrief.differentiator,
    avoidedElements: logoTestBrief.avoidedElements,
    preferredColors: logoTestBrief.preferredColors,
    avoidedColors: logoTestBrief.avoidedColors,
    logoTypes: [logoTestBrief.logoType],
    usageScenarios: logoTestBrief.usageScenarios,
    referenceImageIds: [],
    ...overrides
  }
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
    const migratedBrief = {
      brandName: existing.brandName,
      industry: existing.industry,
      businessDescription: existing.businessDescription,
      brandKeywords: existing.brandKeywords,
      avoidedElements: persisted.avoidedElements ?? [],
      preferredColors: existing.preferredColors,
      avoidedColors: existing.avoidedColors,
      logoType: logoTestBrief.logoType,
      usageScenarios: existing.usageScenarios
    }
    expect(persisted.briefVersion).toBe(2)
    expect(persisted.briefFingerprint).toBe(createBriefFingerprint(migratedBrief))
    expect(persisted.promptVersion).toBe(2)
    expect(persisted.promptFingerprint).toBe(createPromptFingerprint(migratedBrief))
    expect(persisted.designRevision).toEqual(logoTestRevision)
    expect(persisted.strategyPromptPack).toBeUndefined()
  })

  test('creates a V2 project with computed fingerprints, initial versions, and supplied artifacts', async () => {
    const created = await service.save(
      v2ProjectInput({
        briefVersion: 99,
        briefFingerprint: 'spoofed-brief-fingerprint',
        promptVersion: 88,
        promptFingerprint: 'spoofed-prompt-fingerprint',
        designRevision: logoTestRevision,
        strategyPromptPack: logoTestPromptPack
      })
    )

    expect(created).toMatchObject({
      briefVersion: 1,
      briefFingerprint: createBriefFingerprint(logoTestBrief),
      promptVersion: 1,
      promptFingerprint: createPromptFingerprint(logoTestBrief),
      designRevision: logoTestRevision,
      strategyPromptPack: logoTestPromptPack
    })

    const persisted = await readPersistedProject(created.id)
    expect(persisted).toEqual(created)
  })

  test('increments brief and prompt versions for business changes while retaining stale artifacts', async () => {
    const created = await service.save(
      v2ProjectInput({
        designRevision: logoTestRevision,
        strategyPromptPack: logoTestPromptPack
      })
    )
    const businessDescription = '帮助品牌团队把策略转化为独特标志'

    const updated = await service.save({
      ...created,
      businessDescription,
      briefVersion: 900,
      briefFingerprint: 'spoofed-update-brief-fingerprint',
      promptVersion: 800,
      promptFingerprint: 'spoofed-update-prompt-fingerprint',
      designRevision: undefined,
      strategyPromptPack: undefined
    })

    expect(updated.briefVersion).toBe(2)
    expect(updated.briefFingerprint).toBe(
      createBriefFingerprint({ ...logoTestBrief, businessDescription })
    )
    expect(updated.promptVersion).toBe(2)
    expect(updated.promptFingerprint).toBe(
      createPromptFingerprint({ ...logoTestBrief, businessDescription })
    )
    expect(updated.designRevision).toEqual(logoTestRevision)
    expect(updated.designRevision?.briefVersion).toBe(1)
    expect(updated.strategyPromptPack).toEqual(logoTestPromptPack)
    expect(updated.strategyPromptPack?.sourceBriefVersion).toBe(1)
    expect(updated.strategyPromptPack?.sourcePromptVersion).toBe(1)

    const persisted = await readPersistedProject(created.id)
    expect(persisted).toEqual(updated)
  })

  test('increments only prompt version for color and reference changes while retaining stale artifacts', async () => {
    const created = await service.save(
      v2ProjectInput({
        designRevision: logoTestRevision,
        strategyPromptPack: logoTestPromptPack
      })
    )

    const updated = await service.save({
      ...created,
      preferredColors: ['青色'],
      avoidedColors: ['橙色'],
      referenceNote: '保留清晰的单色轮廓',
      designRevision: undefined,
      strategyPromptPack: undefined
    })

    expect(updated.briefVersion).toBe(1)
    expect(updated.briefFingerprint).toBe(created.briefFingerprint)
    expect(updated.promptVersion).toBe(2)
    expect(updated.promptFingerprint).toBe(
      createPromptFingerprint({
        ...logoTestBrief,
        preferredColors: ['青色'],
        avoidedColors: ['橙色'],
        referenceNote: '保留清晰的单色轮廓'
      })
    )
    expect(updated.designRevision).toEqual(logoTestRevision)
    expect(updated.designRevision?.briefVersion).toBe(1)
    expect(updated.strategyPromptPack).toEqual(logoTestPromptPack)
    expect(updated.strategyPromptPack?.sourceBriefVersion).toBe(1)
    expect(updated.strategyPromptPack?.sourcePromptVersion).toBe(1)

    const persisted = await readPersistedProject(created.id)
    expect(persisted).toEqual(updated)
  })

  test('keeps versions stable for normalized equivalents and updates prompt packs only without changes', async () => {
    const created = await service.save(
      v2ProjectInput({
        designRevision: logoTestRevision,
        strategyPromptPack: logoTestPromptPack
      })
    )
    const customizedPromptPack = {
      ...logoTestPromptPack,
      directions: logoTestPromptPack.directions.map((direction) => ({
        ...direction,
        finalPrompt: `${direction.finalPrompt} Use the approved custom balance.`,
        customized: true
      }))
    }

    const normalizedEquivalent = await service.save({
      ...created,
      brandName: ` ${created.brandName} `,
      brandKeywords: ['创造力', '清晰', '清晰'],
      avoidedElements: [' 复杂花瓣 ', '复杂花瓣'],
      preferredColors: [' 蓝色 ', '蓝色'],
      avoidedColors: ['墨绿色', '墨绿色'],
      usageScenarios: ['website', 'app-icon', 'website'],
      strategyPromptPack: customizedPromptPack
    })

    expect(normalizedEquivalent.briefVersion).toBe(1)
    expect(normalizedEquivalent.briefFingerprint).toBe(created.briefFingerprint)
    expect(normalizedEquivalent.promptVersion).toBe(1)
    expect(normalizedEquivalent.promptFingerprint).toBe(created.promptFingerprint)
    expect(normalizedEquivalent.designRevision).toEqual(logoTestRevision)
    expect(normalizedEquivalent.strategyPromptPack).toEqual(customizedPromptPack)

    const unchanged = await service.save({
      ...normalizedEquivalent,
      strategyPromptPack: undefined
    })
    expect(unchanged.briefVersion).toBe(1)
    expect(unchanged.promptVersion).toBe(1)
    expect(unchanged.designRevision).toEqual(logoTestRevision)
    expect(unchanged.strategyPromptPack).toEqual(customizedPromptPack)

    const persisted = await readPersistedProject(created.id)
    expect(persisted).toEqual(unchanged)
  })

  test('rejects an empty logo type list before writing a project', async () => {
    await expect(service.save(v2ProjectInput({ logoTypes: [] }))).rejects.toThrow(/logo type/i)

    const state = await storage.read()
    expect(state.logoProjects).toEqual([])
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
    expect(project.workflowStep).toBe('brief')
    expect(project.generationMode).toBe('quality-first')
    expect(project.aiReviewEnabled).toBe(true)
    expect(project.autoQualityRetry).toBe(true)
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

  test('removes a logo project without image variants', async () => {
    const project = legacyProject({ generationIds: ['stale-generation'] })
    await seedProject(project)

    await service.remove(project.id)

    const state = await storage.read()
    expect(state.logoProjects).toEqual([])
  })

  test('rejects removal while a logo project still has an image variant', async () => {
    const project = legacyProject({ generationIds: ['generation-1'] })
    await seedProject(project)
    await storage.update((state) => ({
      ...state,
      generations: [
        {
          id: 'generation-1',
          mode: 'text-to-image',
          scenario: 'logo-design',
          projectId: project.id,
          promptOriginal: 'logo prompt',
          promptFinal: 'logo prompt',
          referenceImageIds: [],
          parameters: {
            size: '1024x1024',
            count: 1,
            quality: 'standard',
            outputFormat: 'png'
          },
          outputVariantIds: ['variant-1'],
          providerId: 'provider-1',
          status: 'succeeded',
          favorite: false,
          createdAt: '2026-07-09T00:00:00.000Z',
          updatedAt: '2026-07-09T00:00:00.000Z'
        }
      ],
      variants: [
        {
          id: 'variant-1',
          generationId: 'generation-1',
          assetId: 'asset-1',
          index: 0,
          favorite: false,
          createdAt: '2026-07-09T00:00:00.000Z'
        }
      ]
    }))

    await expect(service.remove(project.id)).rejects.toThrow(/still has images/i)

    const state = await storage.read()
    expect(state.logoProjects.map((item) => item.id)).toEqual([project.id])
  })

  test('rejects removal while the project has a running generation', async () => {
    const project = legacyProject({ generationIds: ['generation-1'] })
    await seedProject(project)
    await storage.update((state) => ({
      ...state,
      generations: [
        {
          id: 'generation-1',
          mode: 'text-to-image',
          scenario: 'logo-design',
          projectId: project.id,
          promptOriginal: 'logo prompt',
          promptFinal: 'logo prompt',
          referenceImageIds: [],
          parameters: {
            size: '1024x1024',
            count: 1,
            quality: 'standard',
            outputFormat: 'png'
          },
          outputVariantIds: [],
          providerId: 'provider-1',
          status: 'running',
          favorite: false,
          createdAt: '2026-07-09T00:00:00.000Z',
          updatedAt: '2026-07-09T00:00:00.000Z'
        }
      ]
    }))

    await expect(service.remove(project.id)).rejects.toThrow(/generation is running/i)

    const state = await storage.read()
    expect(state.logoProjects.map((item) => item.id)).toEqual([project.id])
    expect(state.generations.map((generation) => generation.id)).toEqual(['generation-1'])
  })

  test('does not delete an unrelated generation referenced by stale project data', async () => {
    const project = legacyProject({ generationIds: ['external-generation'] })
    await seedProject(project)
    await storage.update((state) => ({
      ...state,
      generations: [
        {
          id: 'external-generation',
          mode: 'text-to-image',
          scenario: 'general',
          promptOriginal: 'unrelated prompt',
          promptFinal: 'unrelated prompt',
          referenceImageIds: [],
          parameters: {
            size: '1024x1024',
            count: 1,
            quality: 'standard',
            outputFormat: 'png'
          },
          outputVariantIds: [],
          providerId: 'provider-1',
          status: 'failed',
          favorite: false,
          createdAt: '2026-07-09T00:00:00.000Z',
          updatedAt: '2026-07-09T00:00:00.000Z'
        }
      ]
    }))

    await service.remove(project.id)

    const state = await storage.read()
    expect(state.logoProjects).toEqual([])
    expect(state.generations.map((generation) => generation.id)).toEqual(['external-generation'])
  })
})
