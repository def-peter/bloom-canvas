import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  logoTestBrief,
  logoTestPromptPack,
  logoTestProvider,
  logoTestRevision
} from '../../../../shared/logoDesign.testFixtures'
import type { GenerationRecord, LogoProject } from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { LogoRefinementPanel } from './LogoRefinementPanel'

vi.mock('../../api/bloomCanvasClient', () => ({
  bloomCanvasClient: {
    generations: { create: vi.fn() },
    logoPreview: { get: vi.fn() },
    logoPrompt: { buildRefinement: vi.fn() }
  }
}))

const project: LogoProject = {
  id: 'project-1',
  brandName: logoTestBrief.brandName,
  industry: logoTestBrief.industry,
  businessDescription: logoTestBrief.businessDescription,
  brandKeywords: logoTestBrief.brandKeywords,
  preferredColors: logoTestBrief.preferredColors,
  avoidedColors: logoTestBrief.avoidedColors,
  logoTypes: [logoTestBrief.logoType],
  styleDirections: [],
  usageScenarios: logoTestBrief.usageScenarios,
  referenceImageIds: [],
  generationIds: ['generation-parent'],
  favoriteVariantIds: [],
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z'
}

function generation(
  id: string,
  variantId: string,
  parentVariantId?: string,
  logoType = logoTestBrief.logoType
): GenerationRecord {
  const assetId = `asset-${variantId}`
  return {
    id,
    mode: parentVariantId ? 'image-to-image' : 'text-to-image',
    scenario: 'logo-design',
    projectId: project.id,
    scenarioMetadata: {
      version: 2,
      logoProjectId: project.id,
      strategyId: logoTestRevision.strategies[0].id,
      strategyNameZh: logoTestRevision.strategies[0].nameZh,
      grammarId: logoTestRevision.strategies[0].grammarId,
      candidateIndex: 0,
      logoType,
      designRevisionSnapshot: logoTestRevision,
      promptDirectionSnapshot: logoTestPromptPack.directions[0],
      briefSnapshot: { ...logoTestBrief, logoType },
      qualityRulesVersion: 2,
      qualityRetryAttempt: 0,
      parentVariantId,
      refinementMode: parentVariantId ? 'preserve-structure' : undefined,
      refinementOperation: parentVariantId ? 'custom' : undefined
    },
    promptOriginal: 'prompt',
    promptFinal: 'prompt',
    referenceImageIds: parentVariantId ? ['asset-variant-parent'] : [],
    parameters: { size: '1024x1024', count: 1, quality: 'hd', outputFormat: 'png' },
    outputVariantIds: [variantId],
    providerId: logoTestProvider.id,
    status: 'succeeded',
    favorite: false,
    createdAt: parentVariantId ? '2026-07-13T00:01:00.000Z' : '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    references: [],
    variants: [
      {
        id: variantId,
        generationId: id,
        assetId,
        index: 0,
        favorite: false,
        createdAt: '2026-07-13T00:00:00.000Z',
        asset: {
          id: assetId,
          type: 'output',
          filePath: `/tmp/${assetId}.png`,
          thumbnailPath: `/tmp/${assetId}-thumb.png`,
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          size: 1024,
          sha256: `hash-${variantId}`,
          createdAt: '2026-07-13T00:00:00.000Z',
          sourceGenerationId: id
        }
      }
    ]
  }
}

const parentGeneration = generation('generation-parent', 'variant-parent')
const candidate = parentGeneration.variants[0]

function renderPanel(
  overrides: Partial<ComponentProps<typeof LogoRefinementPanel>> = {}
): ReturnType<typeof render> {
  return render(
    <App>
      <LogoRefinementPanel
        activeProvider={logoTestProvider}
        candidate={candidate}
        generations={[parentGeneration]}
        project={project}
        settings={null}
        onCreated={vi.fn()}
        onError={vi.fn()}
        onExport={vi.fn()}
        onGeneratingChange={vi.fn()}
        onNeedProvider={vi.fn()}
        onSelectCandidate={vi.fn()}
        {...overrides}
      />
    </App>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(bloomCanvasClient.logoPrompt.buildRefinement).mockResolvedValue('refinement prompt')
  vi.mocked(bloomCanvasClient.logoPreview.get).mockResolvedValue({
    assetId: candidate.asset.id,
    localCheck: { decodable: true, blank: false, lowContrast: false, width: 1024, height: 1024 },
    whiteBackgroundDataUrl: 'data:image/png;base64,white',
    blackBackgroundDataUrl: 'data:image/png;base64,black',
    size64DataUrl: 'data:image/png;base64,64',
    size32DataUrl: 'data:image/png;base64,32',
    grayscaleDataUrl: 'data:image/png;base64,gray',
    monochromeDataUrl: 'data:image/png;base64,mono',
    inverseDataUrl: 'data:image/png;base64,inverse'
  })
  vi.mocked(bloomCanvasClient.generations.create).mockResolvedValue(
    generation('generation-child', 'variant-child', candidate.id)
  )
})

describe('LogoRefinementPanel', () => {
  test('defaults to preserving structure and creates an image-to-image branch', async () => {
    renderPanel()
    expect(screen.getByRole('switch', { name: '保持结构' })).toBeChecked()
    fireEvent.change(screen.getByLabelText('修改要求'), { target: { value: '改成蓝色' } })
    fireEvent.click(screen.getByRole('button', { name: '生成修改版本' }))

    await waitFor(() =>
      expect(bloomCanvasClient.generations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceAssetIds: [candidate.asset.id],
          scenarioMetadata: expect.objectContaining({
            candidateIndex: 1,
            parentVariantId: candidate.id,
            refinementMode: 'preserve-structure',
            refinementOperation: 'custom'
          })
        })
      )
    )
  })

  test('offers exact brand-name preview only for supported second-stage types', () => {
    const view = renderPanel()
    expect(screen.getByRole('button', { name: '增加品牌文字' })).toBeInTheDocument()

    const emblemGeneration = generation('generation-emblem', 'variant-emblem', undefined, 'emblem')
    view.rerender(
      <App>
        <LogoRefinementPanel
          activeProvider={logoTestProvider}
          candidate={emblemGeneration.variants[0]}
          generations={[emblemGeneration]}
          project={{ ...project, logoTypes: ['emblem'] }}
          settings={null}
          onCreated={vi.fn()}
          onError={vi.fn()}
          onExport={vi.fn()}
          onGeneratingChange={vi.fn()}
          onNeedProvider={vi.fn()}
          onSelectCandidate={vi.fn()}
        />
      </App>
    )
    expect(screen.getByRole('button', { name: '增加徽章文字' })).toBeInTheDocument()

    const symbolGeneration = generation(
      'generation-symbol',
      'variant-symbol',
      undefined,
      'symbol-mark'
    )
    view.rerender(
      <App>
        <LogoRefinementPanel
          activeProvider={logoTestProvider}
          candidate={symbolGeneration.variants[0]}
          generations={[symbolGeneration]}
          project={{ ...project, logoTypes: ['symbol-mark'] }}
          settings={null}
          onCreated={vi.fn()}
          onError={vi.fn()}
          onExport={vi.fn()}
          onGeneratingChange={vi.fn()}
          onNeedProvider={vi.fn()}
          onSelectCandidate={vi.fn()}
        />
      </App>
    )
    expect(screen.queryByRole('button', { name: /增加.*文字/ })).not.toBeInTheDocument()
  })

  test('keeps parent and child variants in version history', () => {
    const childGeneration = generation('generation-child', 'variant-child', candidate.id)
    renderPanel({ generations: [parentGeneration, childGeneration] })

    expect(screen.getByText('原始候选')).toBeInTheDocument()
    expect(screen.getByText('修改版本 1')).toBeInTheDocument()
  })
})
