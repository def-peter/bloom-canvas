import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('CreationPanel', () => {
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

    render(
      <CreationPanel
        activeProvider={provider}
        referenceAssets={[]}
        settings={null}
        onCreated={onCreated}
        onError={onError}
        onGeneratingChange={vi.fn()}
        onNeedProvider={vi.fn()}
        onReferenceAssetsChange={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('提示词'), { target: { value: '一朵发光的花' } })
    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith(failedRecord.errorMessage))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
