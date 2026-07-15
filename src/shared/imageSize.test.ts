import { describe, expect, test } from 'vitest'
import {
  FLEXIBLE_IMAGE_SIZE_PRESETS,
  getImageSizeError,
  getImageSizeModelError,
  parseImageSize,
  STANDARD_IMAGE_SIZES,
  supportsFlexibleImageSize
} from './imageSize'

describe('image size contract', () => {
  test('exposes standard and flexible image size presets', () => {
    expect(STANDARD_IMAGE_SIZES).toEqual(['1024x1024', '1024x1536', '1536x1024'])
    expect(FLEXIBLE_IMAGE_SIZE_PRESETS).toEqual([
      '1024x1024',
      '1024x1536',
      '1536x1024',
      '1536x864',
      '864x1536'
    ])
  })

  test.each(['gpt-image-2', 'gpt-image-2-2026-07-15'])(
    'recognizes %s as a flexible-size model',
    (imageModel) => {
      expect(supportsFlexibleImageSize(imageModel)).toBe(true)
    }
  )

  test.each(['gpt-image-1', 'dall-e-3', 'my-gpt-image-2', 'gpt-image-20'])(
    'does not recognize %s as a flexible-size model',
    (imageModel) => {
      expect(supportsFlexibleImageSize(imageModel)).toBe(false)
    }
  )

  test('parses and accepts a valid flexible image size', () => {
    expect(parseImageSize('1536x864')).toEqual({ width: 1536, height: 864 })
    expect(getImageSizeError('1536x864')).toBeNull()
  })

  test('accepts auto for every model', () => {
    expect(getImageSizeError('auto')).toBeNull()
    expect(getImageSizeModelError('dall-e-3', 'auto')).toBeNull()
  })

  test.each([
    ['1537x864', '16'],
    ['3072x512', '比例'],
    ['3856x1024', '3840'],
    ['3840x2176', '总像素']
  ])('rejects invalid size %s with the expected error category', (size, errorCategory) => {
    expect(getImageSizeError(size)).toContain(errorCategory)
  })

  test('restricts custom sizes for models without flexible-size support', () => {
    expect(getImageSizeModelError('gpt-image-1', '1536x864')).toContain('不支持自定义尺寸')
    expect(getImageSizeModelError('gpt-image-1', '1024x1024')).toBeNull()
    expect(getImageSizeModelError('gpt-image-2', '1536x864')).toBeNull()
  })
})
