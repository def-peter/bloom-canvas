import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GenerationRecord } from '../../../shared/types'
import { GalleryPanel } from './GalleryPanel'

const generation: GenerationRecord = {
  id: 'generation-1',
  mode: 'text-to-image',
  promptOriginal: 'logo',
  promptFinal: 'logo',
  referenceImageIds: [],
  parameters: {
    size: '1024x1024',
    count: 1,
    quality: 'standard',
    outputFormat: 'webp'
  },
  outputVariantIds: ['variant-1'],
  providerId: 'provider-1',
  status: 'succeeded',
  favorite: false,
  createdAt: '2026-07-09T03:00:37.157Z',
  updatedAt: '2026-07-09T03:00:37.157Z',
  references: [],
  variants: [
    {
      id: 'variant-1',
      generationId: 'generation-1',
      assetId: 'asset-1',
      index: 0,
      favorite: false,
      createdAt: '2026-07-09T03:00:37.157Z',
      asset: {
        id: 'asset-1',
        type: 'output',
        filePath: '/Users/peter/Library/Application Support/bloom-canvas/图 #1.webp',
        thumbnailPath: '/Users/peter/Library/Application Support/bloom-canvas/thumb.webp',
        mimeType: 'image/webp',
        width: 1024,
        height: 1024,
        size: 1024,
        sha256: 'hash',
        createdAt: '2026-07-09T03:00:37.157Z'
      }
    }
  ]
}

const failedGeneration: GenerationRecord = {
  ...generation,
  outputVariantIds: [],
  status: 'failed',
  errorMessage: `Provider request failed: 400 {"error":{"code":"unknown_parameter","message":"Unknown parameter: 'tools[0].n'.","param":"tools[0].n","type":"invalid_request_error"}}`,
  variants: []
}

describe('GalleryPanel', () => {
  it('uses app protocol URLs for generated images', () => {
    render(
      <GalleryPanel
        generation={generation}
        generating={false}
        onContinueEdit={vi.fn()}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByRole('img', { name: 'logo' })).toHaveAttribute(
      'src',
      'bloom-canvas://asset/asset-1'
    )
  })

  it('shows a readable failure state for failed generations', () => {
    render(
      <GalleryPanel
        generation={failedGeneration}
        generating={false}
        onContinueEdit={vi.fn()}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText('生成失败')).toBeInTheDocument()
    expect(screen.getByText("Unknown parameter: 'tools[0].n'.")).toBeInTheDocument()
    expect(screen.queryByText(/unknown_parameter/)).not.toBeInTheDocument()
  })

  it('selects individual images and confirms batch deletion', async () => {
    const onDeleteVariants = vi.fn().mockResolvedValue(undefined)
    const generationWithTwoVariants: GenerationRecord = {
      ...generation,
      outputVariantIds: ['variant-1', 'variant-2'],
      variants: [
        generation.variants[0],
        {
          ...generation.variants[0],
          id: 'variant-2',
          assetId: 'asset-2',
          index: 1,
          asset: { ...generation.variants[0].asset, id: 'asset-2' }
        }
      ]
    }

    render(
      <GalleryPanel
        generation={generationWithTwoVariants}
        generating={false}
        onContinueEdit={vi.fn()}
        onDeleteVariants={onDeleteVariants}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '选择图片' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '选择图片 1' }))
    fireEvent.click(screen.getByRole('button', { name: '删除所选（1）' }))
    const dialog = await screen.findByRole('dialog', { name: '删除所选图片？' })
    fireEvent.click(within(dialog).getByRole('button', { name: '删除' }))

    await waitFor(() => expect(onDeleteVariants).toHaveBeenCalledWith(['variant-1']))
  })
})
