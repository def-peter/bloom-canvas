import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import {
  logoTestBrief,
  logoTestPromptPack,
  logoTestRevision
} from '../../../../shared/logoDesign.testFixtures'
import type { LogoCandidateReview } from '../../../../shared/logoDesign'
import type { GenerationRecord, LogoStyleDirectionId } from '../../../../shared/types'
import { LogoResultsPanel } from './LogoResultsPanel'

function logoRecord(
  directionId: LogoStyleDirectionId,
  directionName: string,
  variants: GenerationRecord['variants'] = []
): GenerationRecord {
  return {
    id: `generation-${directionId}`,
    mode: 'text-to-image',
    scenario: 'logo-design',
    projectId: 'project-1',
    scenarioMetadata: {
      logoProjectId: 'project-1',
      styleDirectionId: directionId,
      styleDirectionName: directionName,
      logoTypes: ['combination-mark'],
      promptPackSnapshot: {
        basePrompt: 'base prompt',
        directions: []
      },
      finalPrompt: 'final prompt',
      briefSnapshot: {
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者生成图片',
        brandKeywords: ['清晰']
      },
      qualityRulesVersion: 1
    },
    promptOriginal: 'final prompt',
    promptFinal: 'final prompt',
    referenceImageIds: [],
    parameters: { size: '1024x1024', count: 1, quality: 'standard', outputFormat: 'png' },
    outputVariantIds: [],
    providerId: 'provider-1',
    status: 'succeeded',
    favorite: false,
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    references: [],
    variants
  }
}

const logoAsset = {
  id: 'asset-1',
  type: 'output',
  filePath: '/tmp/logo.webp',
  thumbnailPath: '/tmp/logo-thumb.webp',
  mimeType: 'image/webp',
  width: 1024,
  height: 1024,
  size: 100,
  sha256: 'hash',
  createdAt: '2026-07-09T00:00:00.000Z'
} satisfies GenerationRecord['variants'][number]['asset']

describe('LogoResultsPanel', () => {
  test('sorts recommended candidates first and folds not-recommended results', () => {
    const rejectedAsset = { ...logoAsset, id: 'asset-rejected' }
    const recommendedAsset = { ...logoAsset, id: 'asset-recommended' }
    const v2Record = (
      id: string,
      candidateId: string,
      asset: typeof logoAsset,
      candidateIndex: number
    ): GenerationRecord => ({
      ...logoRecord('modern-minimal', '现代极简'),
      id,
      scenarioMetadata: {
        version: 2,
        logoProjectId: 'project-1',
        strategyId: logoTestRevision.strategies[0].id,
        strategyNameZh: logoTestRevision.strategies[0].nameZh,
        grammarId: logoTestRevision.strategies[0].grammarId,
        candidateIndex,
        logoType: logoTestBrief.logoType,
        designRevisionSnapshot: logoTestRevision,
        promptDirectionSnapshot: logoTestPromptPack.directions[0],
        briefSnapshot: logoTestBrief,
        qualityRulesVersion: 2,
        qualityRetryAttempt: 0
      },
      outputVariantIds: [candidateId],
      variants: [
        {
          id: candidateId,
          generationId: id,
          assetId: asset.id,
          index: candidateIndex,
          favorite: false,
          createdAt: '2026-07-09T00:00:00.000Z',
          asset
        }
      ]
    })
    const review = (
      candidateId: string,
      status: 'recommended' | 'not-recommended'
    ): LogoCandidateReview => ({
      candidateId,
      status,
      reviewMode: 'vision-model',
      scores: {
        strategyFit: status === 'recommended' ? 90 : 40,
        distinctiveness: 80,
        simplicity: 85,
        smallSizePotential: 82,
        craft: 84
      },
      hardFailures: status === 'not-recommended' ? ['出现未要求的伪文字'] : [],
      risksZh: []
    })

    render(
      <LogoResultsPanel
        candidateReviews={{
          rejected: review('rejected', 'not-recommended'),
          recommended: review('recommended', 'recommended')
        }}
        generating={false}
        generations={[
          v2Record('generation-rejected', 'rejected', rejectedAsset, 0),
          v2Record('generation-recommended', 'recommended', recommendedAsset, 1)
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByRole('img', { name: '连续创作路径 方案 2' })).toHaveAttribute(
      'src',
      'bloom-canvas://asset/asset-recommended'
    )
    expect(screen.queryByRole('img', { name: '连续创作路径 方案 1' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('查看不建议继续的结果（1）'))
    expect(screen.getByRole('img', { name: '连续创作路径 方案 1' })).toHaveAttribute(
      'src',
      'bloom-canvas://asset/asset-rejected'
    )
  })

  test('groups logo generations by style direction', () => {
    render(
      <LogoResultsPanel
        generating={false}
        generations={[
          logoRecord('modern-minimal', '现代极简', [
            {
              id: 'variant-modern',
              generationId: 'generation-modern-minimal',
              assetId: logoAsset.id,
              index: 0,
              favorite: false,
              createdAt: '2026-07-09T00:00:00.000Z',
              asset: logoAsset
            }
          ]),
          logoRecord('symbolic-mark', '图形符号', [
            {
              id: 'variant-symbolic',
              generationId: 'generation-symbolic-mark',
              assetId: 'asset-symbolic',
              index: 0,
              favorite: false,
              createdAt: '2026-07-09T00:00:00.000Z',
              asset: { ...logoAsset, id: 'asset-symbolic' }
            }
          ])
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText('现代极简')).toBeInTheDocument()
    expect(screen.getByText('图形符号')).toBeInTheDocument()
  })

  test('shows feedback while retrying a logo generation', async () => {
    let resolveRetry: (() => void) | undefined
    const retry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve
        })
    )

    render(
      <LogoResultsPanel
        generating={false}
        generations={[
          logoRecord('modern-minimal', '现代极简', [
            {
              id: 'variant-1',
              generationId: 'generation-modern-minimal',
              assetId: logoAsset.id,
              index: 0,
              favorite: false,
              createdAt: '2026-07-09T00:00:00.000Z',
              asset: logoAsset
            }
          ])
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onRetry={retry}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '重新生成' }))

    expect(retry).toHaveBeenCalledWith('generation-modern-minimal')
    expect(screen.getByRole('button', { name: '重新生成中' })).toBeDisabled()

    resolveRetry?.()
    await waitFor(() => expect(screen.getByRole('button', { name: '重新生成' })).not.toBeDisabled())
  })

  test('confirms before deleting a logo generation', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(
      <LogoResultsPanel
        generating={false}
        generations={[
          logoRecord('modern-minimal', '现代极简', [
            {
              id: 'variant-1',
              generationId: 'generation-modern-minimal',
              assetId: logoAsset.id,
              index: 0,
              favorite: false,
              createdAt: '2026-07-09T00:00:00.000Z',
              asset: logoAsset
            }
          ])
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onDelete={onDelete}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }))
    const deleteDialog = await screen.findByRole('dialog', { name: '删除这次 Logo 生成？' })

    fireEvent.click(within(deleteDialog).getByRole('button', { name: /删\s*除/ }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('generation-modern-minimal'))
  })

  test('selects all project images and confirms batch deletion', async () => {
    const onDeleteVariants = vi.fn().mockResolvedValue(undefined)
    const secondAsset = { ...logoAsset, id: 'asset-2' }

    render(
      <LogoResultsPanel
        generating={false}
        generations={[
          logoRecord('modern-minimal', '现代极简', [
            {
              id: 'variant-1',
              generationId: 'generation-modern-minimal',
              assetId: logoAsset.id,
              index: 0,
              favorite: false,
              createdAt: '2026-07-09T00:00:00.000Z',
              asset: logoAsset
            },
            {
              id: 'variant-2',
              generationId: 'generation-modern-minimal',
              assetId: secondAsset.id,
              index: 1,
              favorite: false,
              createdAt: '2026-07-09T00:00:00.000Z',
              asset: secondAsset
            }
          ])
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteVariants={onDeleteVariants}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '选择图片' }))
    fireEvent.click(screen.getByRole('button', { name: '全选' }))
    fireEvent.click(screen.getByRole('button', { name: '删除所选（2）' }))
    const dialog = await screen.findByRole('dialog', { name: '删除所选图片？' })
    fireEvent.click(within(dialog).getByRole('button', { name: '删除' }))

    await waitFor(() => expect(onDeleteVariants).toHaveBeenCalledWith(['variant-1', 'variant-2']))
  })

  test('disables result deletion controls while generating', () => {
    render(
      <LogoResultsPanel
        generating
        generations={[
          logoRecord('modern-minimal', '现代极简', [
            {
              id: 'variant-1',
              generationId: 'generation-modern-minimal',
              assetId: logoAsset.id,
              index: 0,
              favorite: false,
              createdAt: '2026-07-09T00:00:00.000Z',
              asset: logoAsset
            }
          ])
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onDelete={vi.fn()}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '选择图片' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /删\s*除/ })).toBeDisabled()
  })
})
