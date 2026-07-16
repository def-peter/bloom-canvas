import { nanoid } from 'nanoid'
import type { LogoBrandBriefV2 } from '../../shared/logoDesign'
import type {
  GenerationId,
  LogoProject,
  LogoProjectId,
  LogoPromptPack,
  SaveLogoProjectInput
} from '../../shared/types'
import { avoidedElementsSchema } from '../../shared/schemas'
import { createBriefFingerprint, createPromptFingerprint } from '../logo/logoBriefNormalizer'
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
  existing: LogoProject | undefined
): string[] {
  if (input.avoidedElements !== undefined) return input.avoidedElements

  if (input.avoidElements !== undefined) {
    return migrateAvoidedElements(input.avoidElements)
  }

  if (existing?.avoidedElements !== undefined) return existing.avoidedElements
  return migrateAvoidedElements(existing?.avoidElements)
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

  async remove(id: LogoProjectId): Promise<void> {
    await this.storage.update((state) => {
      const project = state.logoProjects.find((item) => item.id === id)
      if (!project) throw new Error('Logo project not found')

      const projectGenerations = state.generations.filter(
        (generation) => generation.projectId === id
      )
      if (
        projectGenerations.some((generation) => ['pending', 'running'].includes(generation.status))
      ) {
        throw new Error('Logo project generation is running')
      }
      const projectGenerationIds = new Set(projectGenerations.map((generation) => generation.id))
      const hasImages = state.variants.some((variant) =>
        projectGenerationIds.has(variant.generationId)
      )
      if (hasImages) throw new Error('Logo project still has images')

      return {
        ...state,
        generations: state.generations.filter(
          (generation) => !projectGenerationIds.has(generation.id)
        ),
        logoProjects: state.logoProjects.filter((item) => item.id !== id)
      }
    })
  }

  async save(input: SaveLogoProjectInput): Promise<LogoProject> {
    const logoType = input.logoTypes[0]
    if (!logoType) throw new Error('Logo project requires a logo type')

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
    const avoidedElements = resolveAvoidedElements(input, existing)
    const avoidElements =
      input.avoidedElements !== undefined
        ? input.avoidedElements.join('，')
        : (input.avoidElements ?? existing?.avoidElements)
    const preferredColors = input.preferredColors ?? []
    const avoidedColors = input.avoidedColors ?? []
    const usageScenarios = input.usageScenarios ?? []
    const nextBrief: LogoBrandBriefV2 = {
      brandName: input.brandName,
      brandNameAlt: input.brandNameAlt,
      shortName: input.shortName,
      industry: input.industry,
      businessDescription: input.businessDescription,
      targetAudience: input.targetAudience,
      brandKeywords: input.brandKeywords,
      differentiator: input.differentiator,
      avoidedElements,
      preferredColors,
      avoidedColors,
      logoType,
      usageScenarios,
      referenceNote: input.referenceNote
    }
    // Reference guidance changes prompts, but does not invalidate approved strategies.
    const nextFingerprint = createBriefFingerprint({
      ...nextBrief,
      referenceNote: undefined
    })
    const nextPromptFingerprint = createPromptFingerprint(nextBrief)
    const briefChanged = Boolean(existing && existing.briefFingerprint !== nextFingerprint)
    const briefVersion = existing ? (existing.briefVersion ?? 1) + (briefChanged ? 1 : 0) : 1
    const promptChanged = Boolean(existing && existing.promptFingerprint !== nextPromptFingerprint)
    const promptVersion = existing ? (existing.promptVersion ?? 1) + (promptChanged ? 1 : 0) : 1
    const designRevision = input.designRevision ?? existing?.designRevision
    const strategyPromptPack =
      briefChanged || promptChanged
        ? existing?.strategyPromptPack
        : (input.strategyPromptPack ?? existing?.strategyPromptPack)
    const nextProject: LogoProject = {
      id: existing?.id ?? input.id ?? nanoid(),
      briefVersion,
      briefFingerprint: nextFingerprint,
      promptVersion,
      promptFingerprint: nextPromptFingerprint,
      brandName: input.brandName,
      brandNameAlt: input.brandNameAlt,
      shortName: input.shortName,
      slogan: input.slogan,
      industry: input.industry,
      businessDescription: input.businessDescription,
      targetAudience: input.targetAudience,
      brandKeywords: input.brandKeywords,
      differentiator: input.differentiator,
      avoidElements,
      avoidedElements,
      preferredColors,
      avoidedColors,
      logoTypes: input.logoTypes,
      styleDirections,
      usageScenarios,
      referenceImageIds: input.referenceImageIds,
      referenceNote: input.referenceNote,
      promptPack,
      designRevision,
      strategyPromptPack,
      workflowStep: input.workflowStep ?? existing?.workflowStep ?? 'brief',
      generationMode: input.generationMode ?? existing?.generationMode ?? 'quality-first',
      aiReviewEnabled: input.aiReviewEnabled ?? existing?.aiReviewEnabled ?? true,
      autoQualityRetry: input.autoQualityRetry ?? existing?.autoQualityRetry ?? true,
      selectedCandidateId: input.selectedCandidateId ?? existing?.selectedCandidateId,
      candidateReviews: input.candidateReviews ?? existing?.candidateReviews ?? {},
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
