import { describe, expect, it } from 'vitest'
import { mergeMacUpdateMetadataDocuments } from './merge-mac-update-metadata.mjs'

const x64 = {
  version: '1.1.0',
  files: [
    { url: 'bloom-canvas-1.1.0-mac-x64.zip', sha512: 'x64-zip' },
    { url: 'bloom-canvas-1.1.0-mac-x64.dmg', sha512: 'x64-dmg' }
  ],
  path: 'bloom-canvas-1.1.0-mac-x64.zip',
  sha512: 'x64-zip',
  releaseDate: '2026-08-20T01:00:00.000Z'
}

const arm64 = {
  ...x64,
  files: [
    { url: 'bloom-canvas-1.1.0-mac-arm64.zip', sha512: 'arm64-zip' },
    { url: 'bloom-canvas-1.1.0-mac-arm64.dmg', sha512: 'arm64-dmg' }
  ],
  path: 'bloom-canvas-1.1.0-mac-arm64.zip',
  sha512: 'arm64-zip',
  releaseDate: '2026-08-20T02:00:00.000Z'
}

describe('mergeMacUpdateMetadataDocuments', () => {
  it('keeps one updater ZIP for each macOS architecture', () => {
    const merged = mergeMacUpdateMetadataDocuments([x64, arm64])

    expect(merged.files).toEqual([x64.files[0], arm64.files[0]])
    expect(merged.path).toBe(x64.files[0].url)
    expect(merged.releaseDate).toBe(arm64.releaseDate)
  })

  it('rejects incomplete architecture metadata', () => {
    expect(() => mergeMacUpdateMetadataDocuments([x64])).toThrow(
      'Both x64 and arm64 macOS ZIP entries are required'
    )
  })
})
