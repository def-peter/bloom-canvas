import { nanoid } from 'nanoid'
import type {
  GenerationId,
  LogoProject,
  LogoProjectId,
  LogoPromptPack,
  SaveLogoProjectInput
} from '../../shared/types'
import { avoidedElementsSchema } from '../../shared/schemas'
import { buildLogoPromptPack } from './logoPromptCompiler'
import type { StorageService } from './storageService'

function promptPackMatchesDirections(
  promptPack: LogoPromptPack | undefined,
  styleDirections: NonNullable<SaveLogoProjectInput['styleDirections']>
): promptPack is LogoPromptPack {
  if (!promptPack) return false
  const promptDirectionIds = promptPack.directions.map((direction) => direction.id)
  return (
    promptDirectionIds.length === styleDirections.length &&
    promptDirectionIds.every((id, index) => id === styleDirections[index])
  )
}

function migrateAvoidedElements(avoidElements: string | undefined): string[] {
  const migrated = (avoidElements ?? '')
    .split(/[,，、\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const result = avoidedElementsSchema.safeParse(migrated)
  if (!result.success) {
    throw new Error(`Logo avoided elements validation failed: ${result.error.message}`)
  }
  return result.data
}

function resolveAvoidedElements(
  input: SaveLogoProjectInput,
  existing: LogoProject | undefined,
  briefVersion: number | undefined
): string[] | undefined {
  if (input.avoidedElements !== undefined) return input.avoidedElements

  const usesV2AvoidedElements =
    briefVersion !== undefined || existing?.avoidedElements !== undefined
  if (input.avoidElements !== undefined) {
    return usesV2AvoidedElements ? migrateAvoidedElements(input.avoidElements) : undefined
  }

  if (existing?.avoidedElements !== undefined) return existing.avoidedElements
  return briefVersion === undefined ? undefined : migrateAvoidedElements(existing?.avoidElements)
}

export class LogoProjectService {
  constructor(private readonly storage: StorageService) {}

  async list(): Promise<LogoProject[]> {
    const state = await this.storage.read()
    return state.logoProjects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: LogoProjectId): Promise<LogoProject> {
    const state = await this.storage.read()
    const project = state.logoProjects.find((item) => item.id === id)
    if (!project) throw new Error('Logo project not found')
    return project
  }

  async save(input: SaveLogoProjectInput): Promise<LogoProject> {
    const now = new Date().toISOString()
    const state = await this.storage.read()
    const existing = input.id
      ? state.logoProjects.find((project) => project.id === input.id)
      : undefined
    const styleDirections = input.styleDirections ?? existing?.styleDirections ?? []
    const promptPackCandidate =
      input.promptPack ?? (input.styleDirections === undefined ? existing?.promptPack : undefined)
    const promptPack = promptPackMatchesDirections(promptPackCandidate, styleDirections)
      ? promptPackCandidate
      : styleDirections.length > 0
        ? buildLogoPromptPack({ ...input, styleDirections })
        : undefined
    const briefVersion = input.briefVersion ?? existing?.briefVersion
    const avoidedElements = resolveAvoidedElements(input, existing, briefVersion)
    const nextProject: LogoProject = {
      id: existing?.id ?? input.id ?? nanoid(),
      briefVersion,
      briefFingerprint: input.briefFingerprint ?? existing?.briefFingerprint,
      promptVersion: input.promptVersion ?? existing?.promptVersion,
      promptFingerprint: input.promptFingerprint ?? existing?.promptFingerprint,
      brandName: input.brandName,
      brandNameAlt: input.brandNameAlt,
      shortName: input.shortName,
      slogan: input.slogan,
      industry: input.industry,
      businessDescription: input.businessDescription,
      targetAudience: input.targetAudience,
      brandKeywords: input.brandKeywords,
      differentiator: input.differentiator,
      avoidElements: input.avoidElements ?? existing?.avoidElements,
      avoidedElements,
      preferredColors: input.preferredColors ?? [],
      avoidedColors: input.avoidedColors ?? [],
      logoTypes: input.logoTypes,
      styleDirections,
      usageScenarios: input.usageScenarios ?? [],
      referenceImageIds: input.referenceImageIds,
      referenceNote: input.referenceNote,
      promptPack,
      designRevision: input.designRevision ?? existing?.designRevision,
      strategyPromptPack: input.strategyPromptPack ?? existing?.strategyPromptPack,
      generationIds: existing?.generationIds ?? [],
      favoriteVariantIds: existing?.favoriteVariantIds ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }

    await this.storage.update((current) => ({
      ...current,
      logoProjects: existing
        ? current.logoProjects.map((project) =>
            project.id === nextProject.id ? nextProject : project
          )
        : [...current.logoProjects, nextProject]
    }))

    return nextProject
  }

  async appendGeneration(
    projectId: LogoProjectId,
    generationId: GenerationId
  ): Promise<LogoProject> {
    const state = await this.storage.update((current) => ({
      ...current,
      logoProjects: current.logoProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              generationIds: project.generationIds.includes(generationId)
                ? project.generationIds
                : [...project.generationIds, generationId],
              updatedAt: new Date().toISOString()
            }
          : project
      )
    }))
    const project = state.logoProjects.find((item) => item.id === projectId)
    if (!project) throw new Error('Logo project not found')
    return project
  }
}
