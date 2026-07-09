import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BloomCanvasApi } from '../../../shared/ipc'
import type { GenerationRecord, ProviderConfig } from '../../../shared/types'
import { AppShell } from './AppShell'

const provider: ProviderConfig = {
  id: 'provider-1',
  name: 'Custom Provider',
  baseUrl: 'https://example.com/v1',
  imageModel: 'gpt-image-2',
  promptModel: 'gpt-5.5',
  hasApiKey: true,
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
}

const generatedRecord: GenerationRecord = {
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
  status: 'succeeded',
  favorite: false,
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z',
  references: [],
  variants: []
}

const generatedRecordWithVariant: GenerationRecord = {
  ...generatedRecord,
  outputVariantIds: ['variant-1'],
  variants: [
    {
      id: 'variant-1',
      generationId: generatedRecord.id,
      assetId: 'asset-1',
      index: 0,
      favorite: false,
      createdAt: generatedRecord.createdAt,
      asset: {
        id: 'asset-1',
        type: 'output',
        filePath: '/Users/peter/Library/Application Support/bloom-canvas/output.webp',
        thumbnailPath: '/Users/peter/Library/Application Support/bloom-canvas/thumb.webp',
        mimeType: 'image/webp',
        width: 1024,
        height: 1024,
        size: 2048,
        sha256: 'hash',
        createdAt: generatedRecord.createdAt,
        sourceGenerationId: generatedRecord.id
      }
    }
  ]
}

function installBloomCanvasApi(overrides: Partial<BloomCanvasApi> = {}): BloomCanvasApi {
  const api: BloomCanvasApi = {
    providers: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      save: vi.fn(),
      getActive: vi.fn().mockResolvedValue({ ok: true, data: null })
    },
    settings: {
      get: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          defaultProviderId: null,
          defaultSize: '1024x1024',
          defaultQuality: 'standard',
          defaultCount: 1,
          defaultOutputFormat: 'png',
          outputDirectory: null,
          theme: 'system'
        }
      }),
      save: vi.fn()
    },
    assets: {
      getPathForFile: vi.fn(),
      import: vi.fn(),
      export: vi.fn()
    },
    generations: {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      favorite: vi.fn(),
      retry: vi.fn()
    },
    prompt: {
      optimize: vi.fn()
    },
    ...overrides
  }

  window.bloomCanvas = api
  return api
}

describe('AppShell', () => {
  beforeEach(() => {
    installBloomCanvasApi()
  })

  it('renders the BloomCanvas workbench shell after loading data', async () => {
    render(<AppShell />)

    await waitFor(() => expect(screen.getByText('生花')).toBeInTheDocument())
    expect(screen.getByText('BloomCanvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /provider 设置/i })).toBeInTheDocument()
  })

  it('selects the generated record after creating an image', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: generatedRecord })
    installBloomCanvasApi({
      providers: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [provider] }),
        save: vi.fn(),
        getActive: vi.fn().mockResolvedValue({ ok: true, data: provider })
      },
      generations: {
        create,
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        favorite: vi.fn(),
        retry: vi.fn()
      }
    })

    render(<AppShell />)

    fireEvent.change(await screen.findByLabelText('提示词'), {
      target: { value: generatedRecord.promptOriginal }
    })
    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.getByText('生成结果')).toBeInTheDocument())
    expect(
      within(screen.getByRole('main')).getByText(generatedRecord.promptFinal)
    ).toBeInTheDocument()
  })

  it('uses a generated result as the next reference image when continuing an edit', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: generatedRecord })
    installBloomCanvasApi({
      providers: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [provider] }),
        save: vi.fn(),
        getActive: vi.fn().mockResolvedValue({ ok: true, data: provider })
      },
      generations: {
        create,
        list: vi.fn().mockResolvedValue({ ok: true, data: [generatedRecordWithVariant] }),
        favorite: vi.fn(),
        retry: vi.fn()
      }
    })

    render(<AppShell />)

    fireEvent.click(await screen.findByRole('button', { name: '继续修改' }))
    expect(screen.getByRole('img', { name: '参考图 1' })).toHaveAttribute(
      'src',
      'bloom-canvas://thumbnail/asset-1'
    )
    fireEvent.change(screen.getByLabelText('提示词'), {
      target: { value: '把背景换成纯白色，保留主体' }
    })
    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceAssetIds: ['asset-1']
      })
    )
  })
})
