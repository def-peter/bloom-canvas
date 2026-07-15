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

interface SizeSelection {
  mode: SizeMode
  valueAtSelection?: GenerationSize
  requestedValue?: GenerationSize
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

function getInitialMode(value: GenerationSize | undefined, flexible: boolean): SizeMode {
  if (!value) return DEFAULT_SIZE
  if (flexible && !isStandardSize(value) && parseImageSize(value)) return 'custom'
  return value
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
  const initialDimensions = (value && parseImageSize(value)) ?? DEFAULT_DIMENSIONS
  const [selection, setSelection] = useState<SizeSelection>(() => ({
    mode: getInitialMode(value, flexible),
    valueAtSelection: value,
    requestedValue: value
  }))
  const [width, setWidth] = useState<number | null>(initialDimensions.width)
  const [height, setHeight] = useState<number | null>(initialDimensions.height)
  const normalizedValueRef = useRef<GenerationSize | null>(null)
  const selectionMatchesValue =
    value === undefined ||
    value === selection.valueAtSelection ||
    value === selection.requestedValue
  const mode: SizeMode = !flexible
    ? value && isStandardSize(value)
      ? value
      : isStandardSize(selection.mode as GenerationSize)
        ? selection.mode
        : DEFAULT_SIZE
    : value && !selectionMatchesValue
      ? isStandardSize(value)
        ? value
        : 'custom'
      : selection.mode
  const controlledDimensions =
    mode === 'custom' && value && !selectionMatchesValue ? parseImageSize(value) : null
  const displayedWidth = controlledDimensions?.width ?? width
  const displayedHeight = controlledDimensions?.height ?? height

  useEffect(() => {
    const localSize: GenerationSize =
      selection.mode === 'custom' && width !== null && height !== null
        ? `${width}x${height}`
        : DEFAULT_SIZE
    const currentSize = value ?? (selection.mode === 'custom' ? localSize : selection.mode)

    if (flexible || isStandardSize(currentSize)) {
      normalizedValueRef.current = null
      return
    }

    if (normalizedValueRef.current !== currentSize) {
      normalizedValueRef.current = currentSize
      onChange?.(DEFAULT_SIZE)
    }
  }, [flexible, height, onChange, selection.mode, value, width])

  function selectMode(nextMode: string): void {
    if (nextMode !== 'custom') {
      const nextSize = nextMode as GenerationSize
      setSelection({ mode: nextSize, valueAtSelection: value, requestedValue: nextSize })
      onChange?.(nextSize)
      return
    }

    const dimensions = value && !isPresetSize(value) ? parseImageSize(value) : null
    setWidth(dimensions?.width ?? DEFAULT_DIMENSIONS.width)
    setHeight(dimensions?.height ?? DEFAULT_DIMENSIONS.height)
    setSelection({ mode: 'custom', valueAtSelection: value, requestedValue: value })
  }

  function changeWidth(nextValue: number | string | null): void {
    const nextWidth = toNumber(nextValue)
    setWidth(nextWidth)
    setHeight(displayedHeight)
    if (nextWidth !== null && displayedHeight !== null) {
      const nextSize = `${nextWidth}x${displayedHeight}` as const
      setSelection({ mode: 'custom', valueAtSelection: value, requestedValue: nextSize })
      onChange?.(nextSize)
      return
    }
    setSelection({ mode: 'custom', valueAtSelection: value, requestedValue: value })
  }

  function changeHeight(nextValue: number | string | null): void {
    const nextHeight = toNumber(nextValue)
    setWidth(displayedWidth)
    setHeight(nextHeight)
    if (displayedWidth !== null && nextHeight !== null) {
      const nextSize = `${displayedWidth}x${nextHeight}` as const
      setSelection({ mode: 'custom', valueAtSelection: value, requestedValue: nextSize })
      onChange?.(nextSize)
      return
    }
    setSelection({ mode: 'custom', valueAtSelection: value, requestedValue: value })
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
