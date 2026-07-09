import { describe, expect, it } from 'vitest'
import { assetProtocolUrl, parseAssetProtocolUrl, thumbnailProtocolUrl } from './assetProtocol'

describe('asset protocol URLs', () => {
  it('builds protocol URLs from asset ids instead of local file paths', () => {
    expect(assetProtocolUrl('asset #1')).toBe('bloom-canvas://asset/asset%20%231')
    expect(thumbnailProtocolUrl('asset #1')).toBe('bloom-canvas://thumbnail/asset%20%231')
  })

  it('parses asset and thumbnail requests', () => {
    expect(parseAssetProtocolUrl('bloom-canvas://asset/asset%20%231')).toEqual({
      kind: 'asset',
      assetId: 'asset #1'
    })
    expect(parseAssetProtocolUrl('bloom-canvas://thumbnail/asset%20%231')).toEqual({
      kind: 'thumbnail',
      assetId: 'asset #1'
    })
  })

  it('rejects unsupported protocol requests', () => {
    expect(parseAssetProtocolUrl('file:///tmp/a.png')).toBeNull()
    expect(parseAssetProtocolUrl('bloom-canvas://unknown/a.png')).toBeNull()
  })
})
