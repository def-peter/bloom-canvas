import { render, screen } from '@testing-library/react'
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

describe('GalleryPanel', () => {
  it('uses app protocol URLs for generated images', () => {
    render(
      <GalleryPanel
        generation={generation}
        generating={false}
        onContinueEdit={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByRole('img', { name: 'logo' })).toHaveAttribute(
      'src',
      'bloom-canvas://asset/asset-1'
    )
  })
})
