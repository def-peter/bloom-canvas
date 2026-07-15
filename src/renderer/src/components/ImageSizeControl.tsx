import { InputNumber, Select } from 'antd'
import { useEffect, useRef, useState } from 'react'
import {
  FLEXIBLE_IMAGE_SIZE_PRESETS,
  parseImageSize,
  STANDARD_IMAGE_SIZES,
  supportsFlexibleImageSize
} from '../../../shared/imageSize'
import type { GenerationSize } from '../../../shared/types'

export interface ImageSizeControlProps {
  imageModel?: string
  value?: GenerationSize
  onChange?: (value: GenerationSize) => void
}

type SizeMode = GenerationSize | 'custom'

interface ImageSizeControlInnerProps {
  controlled: boolean
  flexible: boolean
  value?: GenerationSize
  onChange?: (value: GenerationSize) => void
}

const DEFAULT_SIZE = '1024x1024' as const
const DEFAULT_DIMENSIONS = { width: 1024, height: 1024 }
const STANDARD_OPTIONS = [
  { label: '1024 x 1024', value: '1024x1024' },
  { label: '1024 x 1536', value: '1024x1536' },
  { label: '1536 x 1024', value: '1536x1024' },
  { label: '自动', value: 'auto' }
]
const FLEXIBLE_OPTIONS = [
  ...STANDARD_OPTIONS,
  { label: '1536 x 864', value: '1536x864' },
  { label: '864 x 1536', value: '864x1536' },
  { label: '自定义', value: 'custom' }
]

function isStandardSize(size: GenerationSize): boolean {
  return size === 'auto' || STANDARD_IMAGE_SIZES.some((standardSize) => standardSize === size)
}

function isPresetSize(size: GenerationSize): boolean {
  return size === 'auto' || FLEXIBLE_IMAGE_SIZE_PRESETS.some((presetSize) => presetSize === size)
}

function isAvailablePreset(size: GenerationSize, flexible: boolean): boolean {
  return flexible ? isPresetSize(size) : isStandardSize(size)
}

function getValueMode(value: GenerationSize | undefined, flexible: boolean): SizeMode {
  if (!value) return DEFAULT_SIZE
  if (isAvailablePreset(value, flexible)) return value
  if (flexible && parseImageSize(value)) return 'custom'
  return DEFAULT_SIZE
}

function toNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function ImageSizeControl({
  imageModel,
  value,
  onChange
}: ImageSizeControlProps): React.JSX.Element {
  const flexible = supportsFlexibleImageSize(imageModel ?? '')
  const [uncontrolledValue, setUncontrolledValue] = useState<GenerationSize>()
  const controlled = value !== undefined
  const currentValue = controlled ? value : uncontrolledValue

  function changeValue(nextValue: GenerationSize): void {
    if (value === undefined) setUncontrolledValue(nextValue)
    onChange?.(nextValue)
  }

  return (
    <ImageSizeControlInner
      controlled={controlled}
      flexible={flexible}
      key={flexible ? 'flexible' : 'standard'}
      value={currentValue}
      onChange={changeValue}
    />
  )
}

function ImageSizeControlInner({
  controlled,
  flexible,
  value,
  onChange
}: ImageSizeControlInnerProps): React.JSX.Element {
  const initialDimensions = (value && parseImageSize(value)) ?? DEFAULT_DIMENSIONS
  const [uncontrolledMode, setUncontrolledMode] = useState<SizeMode>(() =>
    getValueMode(value, flexible)
  )
  const [width, setWidth] = useState<number | null>(initialDimensions.width)
  const [height, setHeight] = useState<number | null>(initialDimensions.height)
  const normalizedValueRef = useRef<GenerationSize | null>(null)
  const mode = controlled ? getValueMode(value, flexible) : uncontrolledMode
  const controlledDimensions =
    controlled && mode === 'custom' && value ? parseImageSize(value) : null
  const displayedWidth = controlledDimensions?.width ?? width
  const displayedHeight = controlledDimensions?.height ?? height

  useEffect(() => {
    const localSize: GenerationSize =
      uncontrolledMode === 'custom' && width !== null && height !== null
        ? `${width}x${height}`
        : DEFAULT_SIZE
    const currentSize = value ?? (uncontrolledMode === 'custom' ? localSize : uncontrolledMode)

    if (flexible || isStandardSize(currentSize)) {
      normalizedValueRef.current = null
      return
    }

    if (normalizedValueRef.current !== currentSize) {
      normalizedValueRef.current = currentSize
      onChange?.(DEFAULT_SIZE)
    }
  }, [flexible, height, onChange, uncontrolledMode, value, width])

  function selectMode(nextMode: string): void {
    if (nextMode !== 'custom') {
      const nextSize = nextMode as GenerationSize
      if (!controlled) setUncontrolledMode(nextSize)
      onChange?.(nextSize)
      return
    }

    if (controlled) return

    const dimensions = value && !isPresetSize(value) ? parseImageSize(value) : null
    setWidth(dimensions?.width ?? DEFAULT_DIMENSIONS.width)
    setHeight(dimensions?.height ?? DEFAULT_DIMENSIONS.height)
    setUncontrolledMode('custom')
  }

  function changeWidth(nextValue: number | string | null): void {
    const nextWidth = toNumber(nextValue)
    if (!controlled) {
      setWidth(nextWidth)
      setHeight(displayedHeight)
    }
    if (nextWidth !== null && displayedHeight !== null) {
      const nextSize = `${nextWidth}x${displayedHeight}` as const
      onChange?.(nextSize)
    }
  }

  function changeHeight(nextValue: number | string | null): void {
    const nextHeight = toNumber(nextValue)
    if (!controlled) {
      setWidth(displayedWidth)
      setHeight(nextHeight)
    }
    if (displayedWidth !== null && nextHeight !== null) {
      const nextSize = `${displayedWidth}x${nextHeight}` as const
      onChange?.(nextSize)
    }
  }

  return (
    <div className="image-size-control">
      <Select
        aria-label="图像尺寸"
        options={flexible ? FLEXIBLE_OPTIONS : STANDARD_OPTIONS}
        value={mode}
        onChange={selectMode}
      />
      {flexible && mode === 'custom' ? (
        <div className="image-size-custom-fields">
          <InputNumber
            aria-label="自定义宽度"
            max={3840}
            min={16}
            step={16}
            value={displayedWidth}
            onChange={changeWidth}
          />
          <InputNumber
            aria-label="自定义高度"
            max={3840}
            min={16}
            step={16}
            value={displayedHeight}
            onChange={changeHeight}
          />
        </div>
      ) : null}
    </div>
  )
}
