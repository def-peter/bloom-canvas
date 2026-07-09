import { net, protocol } from 'electron'
import { pathToFileURL } from 'url'
import {
  ASSET_PROTOCOL,
  parseAssetProtocolUrl,
  type ParsedAssetProtocolUrl
} from '../../shared/assetProtocol'
import type { MetadataState, StorageService } from '../services/storageService'

export function registerAssetProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true
      }
    }
  ])
}

export function resolveAssetProtocolFilePath(
  state: MetadataState,
  parsedUrl: ParsedAssetProtocolUrl
): string | null {
  const asset = state.assets.find((item) => item.id === parsedUrl.assetId)
  if (!asset) {
    return null
  }

  return parsedUrl.kind === 'thumbnail' ? asset.thumbnailPath : asset.filePath
}

export function registerAssetProtocolHandler(storage: StorageService): void {
  protocol.handle(ASSET_PROTOCOL, async (request) => {
    const parsedUrl = parseAssetProtocolUrl(request.url)
    if (!parsedUrl) {
      return new Response('Unsupported asset URL', { status: 404 })
    }

    const state = await storage.read()
    const filePath = resolveAssetProtocolFilePath(state, parsedUrl)
    if (!filePath) {
      return new Response('Asset not found', { status: 404 })
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })
}
