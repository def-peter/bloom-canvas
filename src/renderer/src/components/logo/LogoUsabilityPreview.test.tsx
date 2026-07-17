import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { LogoPreviewSet } from '../../../../shared/logoDesign'
import type { Asset } from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { LogoUsabilityPreview } from './LogoUsabilityPreview'

vi.mock('../../api/bloomCanvasClient', () => ({
  bloomCanvasClient: {
    logoPreview: { get: vi.fn() }
  }
}))

const asset: Asset = {
  id: 'asset-1',
  type: 'output',
  filePath: '/tmp/logo.png',
  thumbnailPath: '/tmp/logo-thumb.png',
  mimeType: 'image/png',
  width: 1024,
  height: 1024,
  size: 100,
  sha256: 'hash',
  createdAt: '2026-07-09T00:00:00.000Z'
}

describe('LogoUsabilityPreview', () => {
  test('loads generated local previews instead of reusing one source URL', async () => {
    const preview: LogoPreviewSet = {
      assetId: asset.id,
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
    }
    vi.mocked(bloomCanvasClient.logoPreview.get).mockResolvedValue(preview)
    render(<LogoUsabilityPreview asset={asset} />)

    expect(await screen.findByAltText('32px 预览')).toHaveAttribute('src', preview.size32DataUrl)
    expect(screen.getByAltText('灰度预览')).toHaveAttribute('src', preview.grayscaleDataUrl)
    expect(screen.getByAltText('反白预览')).toHaveAttribute('src', preview.inverseDataUrl)
  })
})
