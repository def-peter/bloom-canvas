import type {
  LogoBrandBriefV2,
  LogoStrategyPromptDirection,
  LogoStrategyPromptPack,
  LogoType,
  LogoUsageScenario
} from '../../../../shared/logoDesign'
import type { LogoProject, SaveLogoProjectInput } from '../../../../shared/types'

export interface LogoBriefFormValues {
  brandName: string
  brandNameAlt?: string
  shortName?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidedElements: string[]
  preferredColors: string[]
  avoidedColors: string[]
  logoType: LogoType
  usageScenarios: LogoUsageScenario[]
  referenceNote?: string
}

export function splitLogoTags(value: string): string[] {
  return [...new Set(value.split(/[,，、\n]+/).map((item) => item.trim()).filter(Boolean))]
}

function normalizeTags(values: string[] | undefined): string[] {
  return splitLogoTags((values ?? []).join('，'))
}

export function projectToBriefValues(project: LogoProject | null): LogoBriefFormValues {
  return {
    brandName: project?.brandName ?? '',
    brandNameAlt: project?.brandNameAlt,
    shortName: project?.shortName,
    industry: project?.industry ?? '',
    businessDescription: project?.businessDescription ?? '',
    targetAudience: project?.targetAudience,
    brandKeywords: project?.brandKeywords ?? [],
    differentiator: project?.differentiator,
    avoidedElements:
      project?.avoidedElements ?? splitLogoTags(project?.avoidElements ?? ''),
    preferredColors: project?.preferredColors ?? [],
    avoidedColors: project?.avoidedColors ?? [],
    logoType: project?.logoTypes[0] ?? 'combination-mark',
    usageScenarios: project?.usageScenarios.length
      ? project.usageScenarios
      : ['app-icon', 'website'],
    referenceNote: project?.referenceNote
  }
}

export function briefValuesToV2(values: LogoBriefFormValues): LogoBrandBriefV2 {
  return {
    brandName: values.brandName.trim(),
    brandNameAlt: values.brandNameAlt?.trim() || undefined,
    shortName: values.shortName?.trim() || undefined,
    industry: values.industry.trim(),
    businessDescription: values.businessDescription.trim(),
    targetAudience: values.targetAudience?.trim() || undefined,
    brandKeywords: normalizeTags(values.brandKeywords),
    differentiator: values.differentiator?.trim() || undefined,
    avoidedElements: normalizeTags(values.avoidedElements),
    preferredColors: normalizeTags(values.preferredColors),
    avoidedColors: normalizeTags(values.avoidedColors),
    logoType: values.logoType,
    usageScenarios: values.usageScenarios,
    referenceNote: values.referenceNote?.trim() || undefined
  }
}

export function briefToProjectInput(
  brief: LogoBrandBriefV2,
  project: LogoProject | null
): SaveLogoProjectInput {
  return {
    id: project?.id,
    brandName: brief.brandName,
    brandNameAlt: brief.brandNameAlt,
    shortName: brief.shortName,
    industry: brief.industry,
    businessDescription: brief.businessDescription,
    targetAudience: brief.targetAudience,
    brandKeywords: brief.brandKeywords,
    differentiator: brief.differentiator,
    avoidedElements: brief.avoidedElements,
    preferredColors: brief.preferredColors,
    avoidedColors: brief.avoidedColors,
    logoTypes: [brief.logoType],
    styleDirections: project?.styleDirections ?? [],
    usageScenarios: brief.usageScenarios,
    referenceImageIds: project?.referenceImageIds ?? [],
    referenceNote: brief.referenceNote,
    designRevision: project?.designRevision,
    strategyPromptPack: project?.strategyPromptPack,
    workflowStep: project?.workflowStep,
    generationMode: project?.generationMode,
    aiReviewEnabled: project?.aiReviewEnabled,
    autoQualityRetry: project?.autoQualityRetry,
    selectedCandidateId: project?.selectedCandidateId
  }
}

export function isDesignRevisionCurrent(
  project: Pick<LogoProject, 'briefVersion' | 'designRevision'>
): boolean {
  return Boolean(
    project.designRevision && project.designRevision.briefVersion === (project.briefVersion ?? 1)
  )
}

export function isPromptDirectionCurrent(
  project: LogoProject,
  direction: LogoStrategyPromptDirection
): boolean {
  const strategy = project.designRevision?.strategies.find(
    (item) => item.id === direction.strategyId
  )
  return Boolean(
    strategy &&
      direction.sourceBriefVersion === (project.briefVersion ?? 1) &&
      direction.sourcePromptVersion === (project.promptVersion ?? 1) &&
      direction.sourceStrategyVersion === strategy.version
  )
}

export function mergeRecompiledPromptPack(
  previous: LogoStrategyPromptPack,
  rebuilt: LogoStrategyPromptPack,
  changedStrategyIds: string[]
): LogoStrategyPromptPack {
  const changed = new Set(changedStrategyIds)
  const previousById = new Map(previous.directions.map((direction) => [direction.strategyId, direction]))
  const rebuiltById = new Map(rebuilt.directions.map((direction) => [direction.strategyId, direction]))

  for (const strategyId of changed) {
    if (!rebuiltById.has(strategyId)) {
      throw new Error(`Recompiled prompt is missing strategy "${strategyId}"`)
    }
  }

  return {
    ...rebuilt,
    directions: rebuilt.directions.map((direction) => {
      if (changed.has(direction.strategyId)) return direction
      const preserved = previousById.get(direction.strategyId)
      if (!preserved) {
        throw new Error(`Previous prompt is missing strategy "${direction.strategyId}"`)
      }
      return preserved
    })
  }
}
