import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Asset } from '../../../../shared/types'
import { LogoUsabilityPreview } from './LogoUsabilityPreview'

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
  test('renders white, black, 64px, and 32px checks', () => {
    render(<LogoUsabilityPreview asset={asset} />)

    expect(screen.getByText('白底')).toBeInTheDocument()
    expect(screen.getByText('黑底')).toBeInTheDocument()
    expect(screen.getByText('64px')).toBeInTheDocument()
    expect(screen.getByText('32px')).toBeInTheDocument()
  })
})
