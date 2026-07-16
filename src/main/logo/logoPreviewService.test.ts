import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Asset } from '../../shared/types'
import { LogoPreviewService } from './logoPreviewService'

let rootDir: string

function asset(id: string, filePath: string): Asset {
  return {
    id,
    type: 'output',
    filePath,
    thumbnailPath: filePath,
    mimeType: 'image/png',
    width: 256,
    height: 256,
    size: 1,
    sha256: 'hash',
    createdAt: '2026-07-13T00:00:00.000Z'
  }
}

async function writeSolidFixture(name: string, color: string): Promise<string> {
  const filePath = join(rootDir, name)
  await sharp({
    create: { width: 256, height: 256, channels: 4, background: color }
  })
    .png()
    .toFile(filePath)
  return filePath
}

async function writeTwoToneFixture(
  name: string,
  background: string,
  foreground: string
): Promise<string> {
  const filePath = join(rootDir, name)
  const foregroundBuffer = await sharp({
    create: { width: 128, height: 160, channels: 4, background: foreground }
  })
    .png()
    .toBuffer()
  await sharp({
    create: { width: 256, height: 256, channels: 4, background }
  })
    .composite([{ input: foregroundBuffer, left: 64, top: 48 }])
    .png()
    .toFile(filePath)
  return filePath
}

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'bloom-logo-preview-'))
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

describe('LogoPreviewService', () => {
  test('flags a solid image as blank', async () => {
    const filePath = await writeSolidFixture('blank.png', '#ffffff')
    const preview = await new LogoPreviewService().create(asset('asset-1', filePath))

    expect(preview.localCheck).toMatchObject({ decodable: true, blank: true })
  })

  test('flags a measurable but weak tonal difference as low contrast', async () => {
    const filePath = await writeTwoToneFixture('low-contrast.png', '#777777', '#7d7d7d')
    const preview = await new LogoPreviewService().create(asset('asset-1', filePath))

    expect(preview.localCheck).toMatchObject({ blank: false, lowContrast: true })
  })

  test('creates actual 64px, 32px, grayscale, monochrome, and inverse PNG previews', async () => {
    const filePath = await writeTwoToneFixture('two-tone.png', '#ffffff', '#111111')
    const preview = await new LogoPreviewService().create(asset('asset-1', filePath))

    for (const dataUrl of [
      preview.size64DataUrl,
      preview.size32DataUrl,
      preview.grayscaleDataUrl,
      preview.monochromeDataUrl,
      preview.inverseDataUrl
    ]) {
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    }
    const size32 = await sharp(
      Buffer.from(preview.size32DataUrl.split(',')[1] ?? '', 'base64')
    ).metadata()
    expect(size32).toMatchObject({ width: 32, height: 32 })
  })

  test('throws a visible error for undecodable image bytes', async () => {
    const filePath = join(rootDir, 'invalid.png')
    await writeFile(filePath, Buffer.from('not an image'))

    await expect(new LogoPreviewService().create(asset('bad', filePath))).rejects.toThrow(
      /无法解码 Logo 图片/
    )
  })
})
