import { describe, expect, test } from 'vitest'
import {
  logoTestBrief,
  logoTestPromptPack,
  logoTestRevision
} from '../../shared/logoDesign.testFixtures'
import type { MetadataState } from '../services/storageService'
import { defaultSettings } from '../services/storageService'
import { resolveLogoReviewContext } from './logoReviewContext'

function state(): MetadataState {
  return {
    providers: [],
    settings: defaultSettings,
    logoProjects: [],
    assets: [
      {
        id: 'asset-1',
        type: 'output',
        filePath: '/tmp/logo.png',
        thumbnailPath: '/tmp/logo-thumb.png',
        mimeType: 'image/png',
        width: 1024,
        height: 1024,
        size: 1024,
        sha256: 'hash',
        createdAt: '2026-07-13T00:00:00.000Z',
        sourceGenerationId: 'generation-1'
      }
    ],
    generations: [
      {
        id: 'generation-1',
        mode: 'text-to-image',
        scenario: 'logo-design',
        projectId: 'project-1',
        scenarioMetadata: {
          version: 2,
          logoProjectId: 'project-1',
          strategyId: logoTestRevision.strategies[0].id,
          strategyNameZh: logoTestRevision.strategies[0].nameZh,
          grammarId: logoTestRevision.strategies[0].grammarId,
          candidateIndex: 0,
          logoType: logoTestBrief.logoType,
          designRevisionSnapshot: logoTestRevision,
          promptDirectionSnapshot: logoTestPromptPack.directions[0],
          briefSnapshot: logoTestBrief,
          qualityRulesVersion: 2,
          qualityRetryAttempt: 0
        },
        promptOriginal: 'prompt',
        promptFinal: 'prompt',
        referenceImageIds: [],
        parameters: { size: '1024x1024', count: 1, quality: 'hd', outputFormat: 'png' },
        outputVariantIds: ['variant-1'],
        providerId: 'provider-1',
        status: 'succeeded',
        favorite: false,
        createdAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z'
      }
    ],
    variants: [
      {
        id: 'variant-1',
        generationId: 'generation-1',
        assetId: 'asset-1',
        index: 0,
        favorite: false,
        createdAt: '2026-07-13T00:00:00.000Z'
      }
    ]
  }
}

describe('resolveLogoReviewContext', () => {
  test('resolves only a stored V2 output belonging to the requested project', () => {
    const context = resolveLogoReviewContext(state(), 'project-1', 'variant-1')

    expect(context).toMatchObject({ candidateId: 'variant-1', asset: { id: 'asset-1' } })
    expect(context.metadata.version).toBe(2)
  })

  test('rejects a variant from another project', () => {
    expect(() => resolveLogoReviewContext(state(), 'project-2', 'variant-1')).toThrow(
      /does not belong to project/
    )
  })
})
