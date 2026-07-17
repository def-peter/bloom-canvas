import type { LogoGenerationMetadataV2, LogoProjectId, VariantId } from '../../shared/types'
import type { MetadataState } from '../services/storageService'
import type { LogoReviewContext } from './logoReviewService'

export function resolveLogoReviewContext(
  state: MetadataState,
  projectId: LogoProjectId,
  variantId: VariantId
): LogoReviewContext {
  const variant = state.variants.find((item) => item.id === variantId)
  if (!variant) throw new Error('Logo variant not found')
  const generation = state.generations.find((item) => item.id === variant.generationId)
  if (!generation) throw new Error('Logo generation not found')
  if (generation.projectId !== projectId) {
    throw new Error('Logo variant does not belong to project')
  }
  const asset = state.assets.find((item) => item.id === variant.assetId)
  if (
    !asset ||
    asset.type !== 'output' ||
    asset.sourceGenerationId !== generation.id ||
    !generation.outputVariantIds.includes(variant.id)
  ) {
    throw new Error('Logo variant output asset is invalid')
  }
  const metadata = generation.scenarioMetadata
  if (!metadata || metadata.version !== 2 || metadata.logoProjectId !== projectId) {
    throw new Error('Logo generation requires V2 metadata')
  }

  return {
    candidateId: variant.id,
    asset,
    metadata: metadata as LogoGenerationMetadataV2
  }
}
