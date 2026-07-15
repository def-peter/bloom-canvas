import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { GenerationSize } from '../../../shared/types'
import { ImageSizeControl } from './ImageSizeControl'

function openSizeSelect(): void {
  fireEvent.mouseDown(screen.getByLabelText('图像尺寸'))
}

function selectedSizeContent(): HTMLElement {
  const content = screen.getByLabelText('图像尺寸').parentElement
  if (!content) throw new Error('Select content is missing')
  return content
}

function ControlledImageSize(): React.JSX.Element {
  const [value, setValue] = useState<GenerationSize>('1024x1024')
  return <ImageSizeControl imageModel="gpt-image-2" value={value} onChange={setValue} />
}

describe('ImageSizeControl', () => {
  it('shows flexible presets and custom fields for gpt-image-2 models', () => {
    render(<ImageSizeControl imageModel="gpt-image-2-2026-07-15" />)

    openSizeSelect()

    expect(screen.getByText('1536 x 864')).toBeInTheDocument()
    expect(screen.getByText('864 x 1536')).toBeInTheDocument()

    fireEvent.click(screen.getByText('自定义'))

    expect(screen.getByLabelText('自定义宽度')).toBeInTheDocument()
    expect(screen.getByLabelText('自定义高度')).toBeInTheDocument()
  })

  it('hides flexible-only options for older models', () => {
    render(<ImageSizeControl imageModel="gpt-image-1" />)

    openSizeSelect()

    expect(screen.queryByText('1536 x 864')).not.toBeInTheDocument()
    expect(screen.queryByText('864 x 1536')).not.toBeInTheDocument()
    expect(screen.queryByText('自定义')).not.toBeInTheDocument()
  })

  it('emits the normalized size whenever both custom dimensions are present', () => {
    const onChange = vi.fn()
    render(<ImageSizeControl imageModel="gpt-image-2" onChange={onChange} />)

    openSizeSelect()
    fireEvent.click(screen.getByText('自定义'))
    fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1536' } })
    fireEvent.change(screen.getByLabelText('自定义高度'), { target: { value: '864' } })

    expect(onChange).toHaveBeenLastCalledWith('1536x864')
  })

  it('restores custom mode from a controlled non-standard size', () => {
    render(<ImageSizeControl imageModel="gpt-image-2" value="1200x800" />)

    expect(screen.getByText('自定义')).toBeInTheDocument()
    expect(screen.getByLabelText('自定义宽度')).toHaveValue('1200')
    expect(screen.getByLabelText('自定义高度')).toHaveValue('800')
  })

  it('keeps flexible presets in preset mode', () => {
    render(<ImageSizeControl imageModel="gpt-image-2" value="1536x864" />)

    expect(screen.getByText('1536 x 864')).toBeInTheDocument()
    expect(screen.queryByLabelText('自定义宽度')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('自定义高度')).not.toBeInTheDocument()
  })

  it('enters and keeps custom mode when the parent accepts controlled dimensions', () => {
    render(<ControlledImageSize />)

    openSizeSelect()
    fireEvent.click(screen.getByText('自定义'))
    expect(screen.getByLabelText('自定义宽度')).toHaveValue('1024')
    expect(screen.getByLabelText('自定义高度')).toHaveValue('1024')

    fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1536' } })
    fireEvent.change(screen.getByLabelText('自定义高度'), { target: { value: '864' } })

    expect(selectedSizeContent()).toHaveTextContent('自定义')
    expect(screen.getByLabelText('自定义宽度')).toHaveValue('1536')
    expect(screen.getByLabelText('自定义高度')).toHaveValue('864')
  })

  it('keeps the controlled value when the parent rejects a preset change', () => {
    const onChange = vi.fn()
    render(<ImageSizeControl imageModel="gpt-image-2" value="1024x1024" onChange={onChange} />)

    openSizeSelect()
    fireEvent.click(screen.getByText('1536 x 864'))

    expect(onChange).toHaveBeenCalledWith('1536x864')
    expect(selectedSizeContent()).toHaveTextContent('1024 x 1024')
  })

  it('follows a controlled value that is accepted and then reset', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ImageSizeControl imageModel="gpt-image-2" value="1024x1024" onChange={onChange} />
    )

    openSizeSelect()
    fireEvent.click(screen.getByText('1536 x 864'))
    rerender(<ImageSizeControl imageModel="gpt-image-2" value="1536x864" onChange={onChange} />)
    expect(selectedSizeContent()).toHaveTextContent('1536 x 864')

    rerender(<ImageSizeControl imageModel="gpt-image-2" value="1024x1024" onChange={onChange} />)
    expect(selectedSizeContent()).toHaveTextContent('1024 x 1024')
  })

  it('normalizes a non-standard size once when the model loses flexible-size support', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ImageSizeControl imageModel="gpt-image-2" value="1536x864" onChange={onChange} />
    )

    rerender(<ImageSizeControl imageModel="gpt-image-1" value="1536x864" onChange={onChange} />)

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('1024x1024'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('自定义宽度')).not.toBeInTheDocument()

    rerender(<ImageSizeControl imageModel="gpt-image-1" value="1536x864" onChange={onChange} />)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('keeps standard controlled values in sync for older models', () => {
    const { rerender } = render(<ImageSizeControl imageModel="gpt-image-1" value="1024x1024" />)

    rerender(<ImageSizeControl imageModel="gpt-image-1" value="1024x1536" />)

    expect(screen.getByText('1024 x 1536')).toBeInTheDocument()
  })

  it('normalizes an uncontrolled custom size when the model loses flexible-size support', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ImageSizeControl imageModel="gpt-image-2" onChange={onChange} />)

    openSizeSelect()
    fireEvent.click(screen.getByText('自定义'))
    fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1536' } })
    fireEvent.change(screen.getByLabelText('自定义高度'), { target: { value: '864' } })
    onChange.mockClear()

    rerender(<ImageSizeControl imageModel="gpt-image-1" onChange={onChange} />)

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('1024x1024'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('does not restore an uncontrolled custom mode after a model capability round trip', () => {
    const { rerender } = render(<ImageSizeControl imageModel="gpt-image-2" />)

    openSizeSelect()
    fireEvent.click(screen.getByText('自定义'))
    expect(screen.getByLabelText('自定义宽度')).toBeInTheDocument()

    rerender(<ImageSizeControl imageModel="gpt-image-1.5" />)
    expect(screen.queryByLabelText('自定义宽度')).not.toBeInTheDocument()

    rerender(<ImageSizeControl imageModel="gpt-image-2" />)
    expect(screen.queryByLabelText('自定义宽度')).not.toBeInTheDocument()
    expect(screen.getByText('1024 x 1024')).toBeInTheDocument()
  })

  it('keeps the other controlled dimension when editing a custom size', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ImageSizeControl imageModel="gpt-image-2" value="1200x800" onChange={onChange} />
    )

    rerender(<ImageSizeControl imageModel="gpt-image-2" value="1600x896" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1760' } })

    expect(onChange).toHaveBeenLastCalledWith('1760x896')
    expect(screen.getByLabelText('自定义高度')).toHaveValue('896')
  })
})
