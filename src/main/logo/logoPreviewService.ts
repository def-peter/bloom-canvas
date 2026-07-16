import sharp from 'sharp'
import type { LogoPreviewSet } from '../../shared/logoDesign'
import type { Asset } from '../../shared/types'

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 }

function toPngDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function squarePreview(
  filePath: string,
  size: number,
  background: typeof WHITE
): ReturnType<typeof sharp> {
  return sharp(filePath)
    .resize(size, size, {
      fit: 'contain',
      background: { ...background, alpha: 0 }
    })
    .flatten({ background })
}

export class LogoPreviewService {
  async create(asset: Asset): Promise<LogoPreviewSet> {
    try {
      const [metadata, sourceStats, grayscaleStats] = await Promise.all([
        sharp(asset.filePath).metadata(),
        sharp(asset.filePath).stats(),
        sharp(asset.filePath).flatten({ background: WHITE }).grayscale().stats()
      ])
      const blank = sourceStats.channels.every((channel) => channel.stdev < 2.5)
      const lowContrast = grayscaleStats.channels.every((channel) => channel.stdev < 12)

      const [whiteBackground, blackBackground, size64, size32, grayscale, monochrome] =
        await Promise.all([
          squarePreview(asset.filePath, 256, WHITE).png().toBuffer(),
          squarePreview(asset.filePath, 256, BLACK).png().toBuffer(),
          squarePreview(asset.filePath, 64, WHITE).png().toBuffer(),
          squarePreview(asset.filePath, 32, WHITE).png().toBuffer(),
          squarePreview(asset.filePath, 256, WHITE).grayscale().png().toBuffer(),
          squarePreview(asset.filePath, 256, WHITE).grayscale().threshold(180).png().toBuffer()
        ])
      const inverse = await sharp(monochrome).negate({ alpha: false }).png().toBuffer()

      return {
        assetId: asset.id,
        localCheck: {
          decodable: true,
          blank,
          lowContrast,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0
        },
        whiteBackgroundDataUrl: toPngDataUrl(whiteBackground),
        blackBackgroundDataUrl: toPngDataUrl(blackBackground),
        size64DataUrl: toPngDataUrl(size64),
        size32DataUrl: toPngDataUrl(size32),
        grayscaleDataUrl: toPngDataUrl(grayscale),
        monochromeDataUrl: toPngDataUrl(monochrome),
        inverseDataUrl: toPngDataUrl(inverse)
      }
    } catch (error) {
      throw new Error('无法解码 Logo 图片，请重新生成或检查图片文件', { cause: error })
    }
  }
}
