import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GenerationRecord } from '../../../shared/types'
import { ImagePreviewModal } from './ImagePreviewModal'

const generation: GenerationRecord = {
  id: 'generation-1',
  mode: 'text-to-image',
  promptOriginal: '竖向海报',
  promptFinal: '一张尺寸很大的竖向海报',
  referenceImageIds: [],
  parameters: {
    size: '1024x1536',
    count: 1,
    quality: 'standard',
    outputFormat: 'webp'
  },
  outputVariantIds: ['variant-1'],
  providerId: 'provider-1',
  status: 'succeeded',
  favorite: false,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  references: [],
  variants: [
    {
      id: 'variant-1',
      generationId: 'generation-1',
      assetId: 'asset-1',
      index: 0,
      favorite: false,
      createdAt: '2026-08-21T00:00:00.000Z',
      asset: {
        id: 'asset-1',
        type: 'output',
        filePath: '/tmp/large-poster.webp',
        thumbnailPath: '/tmp/large-poster-thumb.webp',
        mimeType: 'image/webp',
        width: 4096,
        height: 8192,
        size: 1024,
        sha256: 'hash',
        createdAt: '2026-08-21T00:00:00.000Z'
      }
    }
  ]
}

describe('ImagePreviewModal', () => {
  it('renders large images inside a viewport-constrained preview workspace', () => {
    render(
      <ImagePreviewModal
        generation={generation}
        variantIndex={0}
        open
        onClose={vi.fn()}
        onContinueEdit={vi.fn()}
        onExport={vi.fn()}
      />
    )

    const image = screen.getByRole('img', { name: generation.promptFinal })

    expect(document.querySelector('.preview-modal-container')).toBeInTheDocument()
    expect(document.querySelector('.preview-modal-content')).toBeInTheDocument()
    expect(image).toHaveClass('preview-modal-image')
    expect(image.closest('.preview-modal-canvas')).toBeInTheDocument()
  })

  it('pins the contained image to the preview canvas bounds', async () => {
    const css = await readFile(resolve(process.cwd(), 'src/renderer/src/assets/main.css'), 'utf8')
    const canvasRule = css.match(/\.preview-modal-canvas\s*\{([^}]*)\}/)?.[1]
    const imageRule = css.match(/\.preview-modal-image\s*\{([^}]*)\}/)?.[1]

    expect(canvasRule).toContain('position: relative')
    expect(canvasRule).toContain('overflow: hidden')
    expect(imageRule).toContain('position: absolute')
    expect(imageRule).toContain('object-fit: contain')
  })
})
