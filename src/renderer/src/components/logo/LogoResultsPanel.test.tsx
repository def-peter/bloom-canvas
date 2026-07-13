import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
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
  test('groups logo generations by style direction', () => {
    render(
      <LogoResultsPanel
        generating={false}
        generations={[
          logoRecord('modern-minimal', '现代极简'),
          logoRecord('symbolic-mark', '图形符号')
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onDelete={vi.fn()}
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
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }))
    const deleteDialog = await screen.findByRole('dialog', { name: '删除这次 Logo 生成？' })

    fireEvent.click(within(deleteDialog).getByRole('button', { name: /删\s*除/ }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('generation-modern-minimal'))
  })
})
