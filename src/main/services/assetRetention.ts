import { rm } from 'fs/promises'
import type { Asset, Generation, Variant } from '../../shared/types'

export function collectRetainedAssetIds(
  generations: Generation[],
  variants: Variant[],
  logoProjects: Array<{ referenceImageIds: string[] }>
): Set<string> {
  return new Set([
    ...variants.map((variant) => variant.assetId),
    ...generations.flatMap((generation) => generation.referenceImageIds),
    ...logoProjects.flatMap((project) => project.referenceImageIds)
  ])
}

export async function removeAssetFiles(assets: Asset[]): Promise<void> {
  await Promise.all(
    assets.flatMap((asset) => [
      rm(asset.filePath, { force: true }),
      rm(asset.thumbnailPath, { force: true })
    ])
  )
}
