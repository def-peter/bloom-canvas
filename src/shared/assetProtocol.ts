import type { AssetId } from './types'

export const ASSET_PROTOCOL = 'bloom-canvas'

export type AssetProtocolKind = 'asset' | 'thumbnail'

export interface ParsedAssetProtocolUrl {
  kind: AssetProtocolKind
  assetId: AssetId
}

export function assetProtocolUrl(assetId: AssetId): string {
  return `${ASSET_PROTOCOL}://asset/${encodeURIComponent(assetId)}`
}

export function thumbnailProtocolUrl(assetId: AssetId): string {
  return `${ASSET_PROTOCOL}://thumbnail/${encodeURIComponent(assetId)}`
}

export function parseAssetProtocolUrl(requestUrl: string): ParsedAssetProtocolUrl | null {
  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    return null
  }

  if (url.protocol !== `${ASSET_PROTOCOL}:`) {
    return null
  }

  if (url.hostname !== 'asset' && url.hostname !== 'thumbnail') {
    return null
  }

  const encodedAssetId = url.pathname.replace(/^\/+/, '')
  if (!encodedAssetId) {
    return null
  }

  return {
    kind: url.hostname,
    assetId: decodeURIComponent(encodedAssetId)
  }
}
