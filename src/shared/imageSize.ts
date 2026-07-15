export type GenerationSize = 'auto' | `${number}x${number}`

export const STANDARD_IMAGE_SIZES = ['1024x1024', '1024x1536', '1536x1024'] as const
export const FLEXIBLE_IMAGE_SIZE_PRESETS = [
  ...STANDARD_IMAGE_SIZES,
  '1536x864',
  '864x1536'
] as const

const IMAGE_SIZE_PATTERN = /^([1-9]\d*)x([1-9]\d*)$/
const SIZE_MULTIPLE = 16
const MAX_ASPECT_RATIO = 3
const MAX_DIMENSION = 3840
const MAX_TOTAL_PIXELS = 3840 * 2160

export function supportsFlexibleImageSize(imageModel: string): boolean {
  return imageModel === 'gpt-image-2' || imageModel.startsWith('gpt-image-2-')
}

export function parseImageSize(size: string): { width: number; height: number } | null {
  const match = IMAGE_SIZE_PATTERN.exec(size)
  if (!match) return null

  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) return null

  return { width, height }
}

export function getImageSizeError(size: string): string | null {
  if (size === 'auto') return null

  const dimensions = parseImageSize(size)
  if (!dimensions) return '尺寸必须为 auto 或 WIDTHxHEIGHT 格式，且宽高必须为正整数'

  const { width, height } = dimensions
  if (width % SIZE_MULTIPLE !== 0 || height % SIZE_MULTIPLE !== 0) {
    return `宽高必须均为 ${SIZE_MULTIPLE} 的倍数`
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return `宽高单边不能超过 ${MAX_DIMENSION}`
  }

  const aspectRatio = width / height
  if (aspectRatio > MAX_ASPECT_RATIO || aspectRatio < 1 / MAX_ASPECT_RATIO) {
    return '宽高比例必须在 1:3 到 3:1 之间'
  }

  if (width * height > MAX_TOTAL_PIXELS) {
    return `总像素不能超过 ${MAX_TOTAL_PIXELS}`
  }

  return null
}

export function getImageSizeModelError(imageModel: string, size: string): string | null {
  const sizeError = getImageSizeError(size)
  if (sizeError) return sizeError

  if (
    size === 'auto' ||
    supportsFlexibleImageSize(imageModel) ||
    STANDARD_IMAGE_SIZES.some((standardSize) => standardSize === size)
  ) {
    return null
  }

  return `模型 ${imageModel} 不支持自定义尺寸`
}
