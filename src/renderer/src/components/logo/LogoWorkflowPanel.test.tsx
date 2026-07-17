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
import type { CreateGenerationInput, GenerationRecord, LogoProject } from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { LogoWorkflowPanel } from './LogoWorkflowPanel'

vi.mock('../../api/bloomCanvasClient', () => ({
  bloomCanvasClient: {
    generations: {
      create: vi.fn()
    },
    logoProjects: {
      get: vi.fn(),
      save: vi.fn()
    },
    logoStrategy: {
      generate: vi.fn()
    },
    logoPrompt: {
      buildStrategy: vi.fn(),
      buildRefinement: vi.fn()
    },
    logoPreview: {
      get: vi.fn()
    },
    logoReview: {
      run: vi.fn()
    }
  }
}))

const project: LogoProject = {
  id: 'project-1',
  briefVersion: 1,
  promptVersion: 1,
  brandName: '生花',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者把想法转化为图片',
  targetAudience: '个人创作者',
  brandKeywords: ['清晰', '创造力'],
  differentiator: '轻量、直接的创作流程',
  avoidElements: '复杂花瓣',
  avoidedElements: ['复杂花瓣'],
  preferredColors: ['蓝色'],
  avoidedColors: [],
  logoTypes: ['combination-mark'],
  styleDirections: [],
  usageScenarios: ['app-icon', 'website'],
  referenceImageIds: [],
  workflowStep: 'brief',
  generationMode: 'quality-first',
  aiReviewEnabled: true,
  autoQualityRetry: true,
  generationIds: [],
  favoriteVariantIds: [],
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z'
}

const generationWithCandidate: GenerationRecord = {
  ...generationRecordFromInput(
    {
      providerId: logoTestProvider.id,
      prompt: logoTestPromptPack.directions[0].finalPrompt,
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'hd',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: project.id,
      scenarioMetadata: {
        version: 2,
        logoProjectId: project.id,
        strategyId: logoTestRevision.strategies[0].id,
        strategyNameZh: logoTestRevision.strategies[0].nameZh,
        grammarId: logoTestRevision.strategies[0].grammarId,
        candidateIndex: 0,
        logoType: 'combination-mark',
        designRevisionSnapshot: logoTestRevision,
        promptDirectionSnapshot: logoTestPromptPack.directions[0],
        briefSnapshot: logoTestBrief,
        qualityRulesVersion: 2,
        qualityRetryAttempt: 0
      }
    },
    1
  ),
  outputVariantIds: ['variant-1'],
  variants: [
    {
      id: 'variant-1',
      generationId: 'generation-1',
      assetId: 'asset-1',
      index: 0,
      favorite: false,
      createdAt: '2026-07-13T00:00:00.000Z',
      asset: {
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
    }
  ]
}

function generationRecordFromInput(input: CreateGenerationInput, index: number): GenerationRecord {
  const generationId = `generation-${index}`
  const variantId = `variant-${index}`
  const assetId = `asset-${index}`
  return {
    id: generationId,
    mode: 'text-to-image',
    scenario: input.scenario,
    projectId: input.projectId,
    scenarioMetadata: input.scenarioMetadata,
    promptOriginal: input.prompt,
    promptFinal: input.prompt,
    referenceImageIds: input.referenceAssetIds,
    parameters: input.parameters,
    outputVariantIds: [variantId],
    providerId: input.providerId,
    status: 'succeeded',
    favorite: false,
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    references: [],
    variants: [
      {
        id: variantId,
        generationId,
        assetId,
        index: input.scenarioMetadata?.version === 2 ? input.scenarioMetadata.candidateIndex : 0,
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
          sha256: `hash-${index}`,
          createdAt: '2026-07-13T00:00:00.000Z',
          sourceGenerationId: generationId
        }
      }
    ]
  }
}

function renderWorkflow(overrides: Partial<ComponentProps<typeof LogoWorkflowPanel>> = {}): void {
  render(
    <App>
      <LogoWorkflowPanel
        activeProvider={logoTestProvider}
        generations={[]}
        project={project}
        settings={null}
        onCreated={vi.fn()}
        onDelete={vi.fn()}
        onDeleteVariants={vi.fn()}
        onError={vi.fn()}
        onExport={vi.fn()}
        onGeneratingChange={vi.fn()}
        onNeedProvider={vi.fn()}
        onProjectSaved={vi.fn()}
        onRetry={vi.fn()}
        {...overrides}
      />
    </App>
  )
}

describe('LogoWorkflowPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(bloomCanvasClient.logoProjects.save).mockImplementation(async (input) => ({
      ...project,
      ...input,
      id: input.id ?? project.id,
      briefVersion: project.briefVersion,
      promptVersion: project.promptVersion,
      styleDirections: input.styleDirections ?? [],
      usageScenarios: input.usageScenarios ?? [],
      preferredColors: input.preferredColors ?? [],
      avoidedColors: input.avoidedColors ?? [],
      selectedCandidateId:
        input.selectedCandidateId === null
          ? undefined
          : (input.selectedCandidateId ?? project.selectedCandidateId),
      generationIds: project.generationIds,
      favoriteVariantIds: project.favoriteVariantIds,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }))
    vi.mocked(bloomCanvasClient.logoStrategy.generate).mockResolvedValue(logoTestRevision)
    vi.mocked(bloomCanvasClient.logoPrompt.buildStrategy).mockResolvedValue(logoTestPromptPack)
    vi.mocked(bloomCanvasClient.logoReview.run).mockImplementation(async (input) => ({
      candidateId: input.variantId,
      status: 'unreviewed',
      reviewMode: 'local-only',
      hardFailures: [],
      risksZh: [],
      unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
    }))
    vi.mocked(bloomCanvasClient.logoProjects.get).mockResolvedValue(project)
    vi.mocked(bloomCanvasClient.logoPreview.get).mockResolvedValue({
      assetId: 'asset-1',
      localCheck: {
        decodable: true,
        blank: false,
        lowContrast: false,
        width: 1024,
        height: 1024
      },
      whiteBackgroundDataUrl: 'data:image/png;base64,white',
      blackBackgroundDataUrl: 'data:image/png;base64,black',
      size64DataUrl: 'data:image/png;base64,64',
      size32DataUrl: 'data:image/png;base64,32',
      grayscaleDataUrl: 'data:image/png;base64,gray',
      monochromeDataUrl: 'data:image/png;base64,mono',
      inverseDataUrl: 'data:image/png;base64,inverse'
    })
    vi.mocked(bloomCanvasClient.generations.create).mockImplementation(async (input) =>
      generationRecordFromInput(
        input,
        vi.mocked(bloomCanvasClient.generations.create).mock.calls.length
      )
    )
  })

  test('moves from brief to strategies and generates six independent requests', async () => {
    renderWorkflow()

    fireEvent.click(screen.getByRole('button', { name: '生成创意策略' }))
    expect(await screen.findByText('连续创作路径')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '生成 Logo 初稿' }))

    await waitFor(() => expect(bloomCanvasClient.generations.create).toHaveBeenCalledTimes(6))
    for (const [input] of vi.mocked(bloomCanvasClient.generations.create).mock.calls) {
      expect(input.parameters.count).toBe(1)
      expect(input.scenarioMetadata?.version).toBe(2)
    }
    expect(bloomCanvasClient.logoReview.run).toHaveBeenCalledTimes(6)
  })

  test('does not use a stale revision after the brief changes', () => {
    renderWorkflow({
      project: {
        ...project,
        briefVersion: 2,
        workflowStep: 'strategy',
        designRevision: logoTestRevision,
        strategyPromptPack: logoTestPromptPack
      }
    })

    expect(screen.getByText('上游信息已变化，请重新确认提示词')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成 Logo 初稿' })).toBeDisabled()
  })

  test('opens the in-workflow refinement controls for the selected candidate', async () => {
    renderWorkflow({
      generations: [generationWithCandidate],
      project: {
        ...project,
        selectedCandidateId: 'variant-1',
        workflowStep: 'refinement'
      }
    })

    expect(await screen.findByLabelText('修改要求')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: '保持结构' })).toBeChecked()
  })

  test('falls back to generation when the selected candidate was deleted', async () => {
    renderWorkflow({
      generations: [],
      project: {
        ...project,
        selectedCandidateId: 'missing-variant',
        workflowStep: 'refinement',
        designRevision: logoTestRevision,
        strategyPromptPack: logoTestPromptPack
      }
    })

    expect(screen.getByRole('heading', { name: '生成与筛选' })).toBeInTheDocument()
    expect(await screen.findByText('已选候选不存在，请重新选择')).toBeInTheDocument()
    await waitFor(() =>
      expect(bloomCanvasClient.logoProjects.save).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedCandidateId: null,
          workflowStep: 'generation'
        })
      )
    )
  })

  test('automatically retries one full batch only once when every vision review rejects', async () => {
    vi.mocked(bloomCanvasClient.logoReview.run).mockImplementation(async (input) => ({
      candidateId: input.variantId,
      status: 'not-recommended',
      reviewMode: 'vision-model',
      scores: {
        strategyFit: 40,
        distinctiveness: 35,
        simplicity: 48,
        smallSizePotential: 42,
        craft: 55
      },
      hardFailures: ['出现未要求的伪文字'],
      risksZh: [],
      revisionInstructionEn: 'Remove all pseudo-text.'
    }))
    renderWorkflow({
      project: {
        ...project,
        workflowStep: 'strategy',
        designRevision: logoTestRevision,
        strategyPromptPack: logoTestPromptPack
      }
    })

    fireEvent.click(screen.getByRole('button', { name: '生成 Logo 初稿' }))

    await waitFor(() => expect(bloomCanvasClient.generations.create).toHaveBeenCalledTimes(12))
    const retryInputs = vi
      .mocked(bloomCanvasClient.generations.create)
      .mock.calls.map(([input]) => input)
      .filter(
        (input) =>
          input.scenarioMetadata?.version === 2 && input.scenarioMetadata.qualityRetryAttempt === 1
      )
    expect(retryInputs).toHaveLength(6)
  })
})
