import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerationRecord, ProviderConfig } from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'
import { CreationPanel } from './CreationPanel'

vi.mock('../api/bloomCanvasClient', () => ({
  bloomCanvasClient: {
    generations: {
      create: vi.fn()
    }
  }
}))

const provider: ProviderConfig = {
  id: 'provider-1',
  name: 'Provider',
  baseUrl: 'https://api.example.test/v1',
  imageModel: 'gpt-image-2',
  promptModel: 'gpt-5.5',
  hasApiKey: true,
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
}

const failedRecord: GenerationRecord = {
  id: 'generation-1',
  mode: 'text-to-image',
  promptOriginal: '一朵发光的花',
  promptFinal: '一朵发光的花',
  referenceImageIds: [],
  parameters: {
    size: '1024x1024',
    count: 1,
    quality: 'standard',
    outputFormat: 'png'
  },
  outputVariantIds: [],
  providerId: provider.id,
  status: 'failed',
  favorite: false,
  errorMessage: "Provider request failed: Unknown parameter: 'tools[0].n'",
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z',
  references: [],
  variants: []
}

const succeededRecord: GenerationRecord = {
  ...failedRecord,
  parameters: {
    ...failedRecord.parameters,
    size: '1536x864'
  },
  status: 'succeeded',
  errorMessage: undefined
}

function renderPanel(
  overrides?: Partial<React.ComponentProps<typeof CreationPanel>>
): ReturnType<typeof render> {
  return render(
    <CreationPanel
      activeProvider={provider}
      referenceAssets={[]}
      settings={null}
      onCreated={vi.fn().mockResolvedValue(undefined)}
      onError={vi.fn()}
      onGeneratingChange={vi.fn()}
      onNeedProvider={vi.fn()}
      onReferenceAssetsChange={vi.fn()}
      {...overrides}
    />
  )
}

function openSizeSelect(): void {
  fireEvent.mouseDown(screen.getByLabelText('图像尺寸'))
}

describe('CreationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows flexible image sizes for gpt-image-2 providers', () => {
    renderPanel()

    openSizeSelect()

    expect(screen.getByText('1536 x 864')).toBeInTheDocument()
    expect(screen.getByText('自定义')).toBeInTheDocument()
  })

  it('generates with a custom controlled image size', async () => {
    vi.mocked(bloomCanvasClient.generations.create).mockResolvedValue(succeededRecord)
    renderPanel()

    fireEvent.change(screen.getByLabelText('提示词'), { target: { value: '一朵发光的花' } })
    openSizeSelect()
    fireEvent.click(screen.getByText('自定义'))
    fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1536' } })
    fireEvent.change(screen.getByLabelText('自定义高度'), { target: { value: '864' } })
    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    await waitFor(() => expect(bloomCanvasClient.generations.create).toHaveBeenCalledOnce())
    expect(bloomCanvasClient.generations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.objectContaining({ size: '1536x864' })
      })
    )
  })

  it('blocks generation when a custom dimension is not a multiple of 16', async () => {
    renderPanel()

    fireEvent.change(screen.getByLabelText('提示词'), { target: { value: '一朵发光的花' } })
    openSizeSelect()
    fireEvent.click(screen.getByText('自定义'))
    fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1537' } })
    fireEvent.change(screen.getByLabelText('自定义高度'), { target: { value: '864' } })
    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    await waitFor(() => expect(screen.getByText('宽高必须均为 16 的倍数')).toBeInTheDocument())
    expect(bloomCanvasClient.generations.create).not.toHaveBeenCalled()
  })

  it('opens provider settings when generating without provider', () => {
    const onNeedProvider = vi.fn()

    render(
      <CreationPanel
        activeProvider={null}
        referenceAssets={[]}
        settings={null}
        onCreated={vi.fn()}
        onError={vi.fn()}
        onGeneratingChange={vi.fn()}
        onNeedProvider={onNeedProvider}
        onReferenceAssetsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    expect(onNeedProvider).toHaveBeenCalledOnce()
  })

  it('reports failed generation records instead of treating them as created', async () => {
    vi.mocked(bloomCanvasClient.generations.create).mockResolvedValue(failedRecord)
    const onCreated = vi.fn()
    const onError = vi.fn()

    renderPanel({ onCreated, onError })

    fireEvent.change(screen.getByLabelText('提示词'), { target: { value: '一朵发光的花' } })
    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith(failedRecord.errorMessage))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
