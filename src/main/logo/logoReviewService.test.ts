import { describe, expect, test, vi } from 'vitest'
import {
  logoTestBrief,
  logoTestPromptPack,
  logoTestProvider,
  logoTestRevision
} from '../../shared/logoDesign.testFixtures'
import type { LogoPreviewSet } from '../../shared/logoDesign'
import type { Asset, LogoGenerationMetadataV2 } from '../../shared/types'
import type { LogoPreviewService } from './logoPreviewService'
import { LogoReviewService, type LogoReviewContext } from './logoReviewService'
import type { OpenAIResponsesClient } from '../services/openAIResponsesClient'

const asset: Asset = {
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

const metadata: LogoGenerationMetadataV2 = {
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
}

const preview: LogoPreviewSet = {
  assetId: asset.id,
  localCheck: {
    decodable: true,
    blank: false,
    lowContrast: false,
    width: 1024,
    height: 1024
  },
  whiteBackgroundDataUrl: 'data:image/png;base64,AA==',
  blackBackgroundDataUrl: 'data:image/png;base64,AQ==',
  size64DataUrl: 'data:image/png;base64,Ag==',
  size32DataUrl: 'data:image/png;base64,Aw==',
  grayscaleDataUrl: 'data:image/png;base64,BA==',
  monochromeDataUrl: 'data:image/png;base64,BQ==',
  inverseDataUrl: 'data:image/png;base64,Bg=='
}

const context: LogoReviewContext = {
  candidateId: 'variant-1',
  asset,
  metadata
}

const validVisionReview = {
  status: 'recommended',
  scores: {
    strategyFit: 86,
    distinctiveness: 78,
    simplicity: 91,
    smallSizePotential: 84,
    craft: 80
  },
  hardFailures: [],
  risksZh: ['内侧转角可以更统一'],
  suggestedRevisionZh: '统一转角半径。',
  revisionInstructionEn: 'Use one consistent corner radius.'
}

function setup(output: string | Error): {
  service: LogoReviewService
  createText: ReturnType<typeof vi.fn<OpenAIResponsesClient['createText']>>
} {
  const createText = vi.fn<OpenAIResponsesClient['createText']>()
  if (output instanceof Error) createText.mockRejectedValue(output)
  else createText.mockResolvedValue(output)
  const previews = {
    create: vi.fn<LogoPreviewService['create']>().mockResolvedValue(preview)
  }
  return {
    service: new LogoReviewService({ createText }, previews),
    createText
  }
}

describe('LogoReviewService', () => {
  test('returns a scored review from a vision-capable provider', async () => {
    const { service } = setup(JSON.stringify(validVisionReview))

    const result = await service.review(logoTestProvider, 'sk-test', context, true)

    expect(result).toMatchObject({ reviewMode: 'vision-model', status: 'recommended' })
    expect(result.reviewMode === 'vision-model' ? result.scores.strategyFit : undefined).toBe(86)
  })

  test('returns local-only without scores when image input is unsupported', async () => {
    const { service } = setup(
      new Error('Responses request failed: 400 input_image is not supported')
    )

    const result = await service.review(logoTestProvider, 'sk-test', context, true)

    expect(result).toEqual(
      expect.objectContaining({
        reviewMode: 'local-only',
        status: 'unreviewed',
        unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
      })
    )
    expect(result).not.toHaveProperty('scores')
  })

  test('skips the network when vision review is disabled', async () => {
    const { service, createText } = setup(JSON.stringify(validVisionReview))

    const result = await service.review(logoTestProvider, 'sk-test', context, false)

    expect(createText).not.toHaveBeenCalled()
    expect(result.reviewMode).toBe('local-only')
  })

  test('degrades invalid model JSON without exposing fake scores', async () => {
    const { service } = setup('not json')

    const result = await service.review(logoTestProvider, 'sk-test', context, true)

    expect(result.reviewMode).toBe('local-only')
    expect(result).not.toHaveProperty('scores')
  })
})
