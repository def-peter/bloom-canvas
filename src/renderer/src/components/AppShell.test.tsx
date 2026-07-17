import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BloomCanvasApi } from '../../../shared/ipc'
import type { GenerationRecord, LogoProject, ProviderConfig } from '../../../shared/types'
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

const logoProject: LogoProject = {
  id: 'project-1',
  brandName: '生花',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者生成图片',
  brandKeywords: ['清晰'],
  preferredColors: [],
  avoidedColors: [],
  logoTypes: ['combination-mark'],
  styleDirections: ['modern-minimal'],
  usageScenarios: ['app-icon'],
  referenceImageIds: [],
  generationIds: ['logo-generation-1'],
  favoriteVariantIds: [],
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
}

const projectReferenceAsset = {
  ...generatedRecordWithVariant.variants[0].asset,
  id: 'project-reference-1',
  type: 'reference' as const,
  sourceGenerationId: undefined
}

const logoGeneratedRecordWithVariant: GenerationRecord = {
  ...generatedRecordWithVariant,
  id: 'logo-generation-1',
  scenario: 'logo-design',
  projectId: logoProject.id,
  scenarioMetadata: {
    logoProjectId: logoProject.id,
    styleDirectionId: 'modern-minimal',
    styleDirectionName: '现代极简',
    logoTypes: ['combination-mark'],
    promptPackSnapshot: {
      basePrompt: 'base prompt',
      directions: []
    },
    finalPrompt: 'logo final prompt',
    briefSnapshot: {
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者生成图片',
      brandKeywords: ['清晰']
    },
    qualityRulesVersion: 1
  },
  promptOriginal: 'logo final prompt',
  promptFinal: 'logo final prompt',
  outputVariantIds: ['logo-variant-1'],
  variants: [
    {
      ...generatedRecordWithVariant.variants[0],
      id: 'logo-variant-1',
      generationId: 'logo-generation-1',
      assetId: 'logo-asset-1',
      asset: {
        ...generatedRecordWithVariant.variants[0].asset,
        id: 'logo-asset-1',
        sourceGenerationId: 'logo-generation-1'
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
      export: vi.fn(),
      getMany: vi.fn().mockResolvedValue({ ok: true, data: [] })
    },
    generations: {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      remove: vi.fn(),
      removeVariants: vi.fn(),
      favorite: vi.fn(),
      retry: vi.fn()
    },
    prompt: {
      optimize: vi.fn()
    },
    logoProjects: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      save: vi.fn(),
      get: vi.fn(),
      remove: vi.fn()
    },
    logoStrategy: {
      generate: vi.fn()
    },
    logoPreview: {
      get: vi.fn()
    },
    logoReview: {
      run: vi.fn()
    },
    logoPrompt: {
      build: vi.fn(),
      buildStrategy: vi.fn()
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

  it('switches between general creation and logo design scenes', async () => {
    render(<AppShell />)

    expect(await screen.findByText('通用创作')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Logo 设计'))

    expect(await screen.findByText('Logo 项目')).toBeInTheDocument()
    expect(screen.getAllByText('品牌简报')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '生成创意策略' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '生成/更新提示词' })).not.toBeInTheDocument()
    expect(screen.queryByText('Logo 结果')).not.toBeInTheDocument()
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
        remove: vi.fn(),
        removeVariants: vi.fn(),
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
        remove: vi.fn(),
        removeVariants: vi.fn(),
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

  it('opens the general edit form when continuing from a logo result', async () => {
    installBloomCanvasApi({
      providers: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [provider] }),
        save: vi.fn(),
        getActive: vi.fn().mockResolvedValue({ ok: true, data: provider })
      },
      generations: {
        create: vi.fn(),
        list: vi.fn().mockResolvedValue({ ok: true, data: [logoGeneratedRecordWithVariant] }),
        remove: vi.fn(),
        removeVariants: vi.fn(),
        favorite: vi.fn(),
        retry: vi.fn()
      },
      logoProjects: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              ...logoProject,
              selectedCandidateId: 'logo-variant-1',
              workflowStep: 'refinement'
            }
          ]
        }),
        save: vi.fn(),
        get: vi.fn(),
        remove: vi.fn()
      }
    })

    render(<AppShell />)

    fireEvent.click(await screen.findByText('Logo 设计'))
    fireEvent.click(await screen.findByRole('button', { name: '继续修改' }))

    expect(await screen.findByLabelText('提示词')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '参考图 1' })).toHaveAttribute(
      'src',
      'bloom-canvas://thumbnail/logo-asset-1'
    )
  })

  it('does not leak a general draft reference into logo design', async () => {
    installBloomCanvasApi({
      generations: {
        create: vi.fn(),
        list: vi.fn().mockResolvedValue({ ok: true, data: [generatedRecordWithVariant] }),
        remove: vi.fn(),
        removeVariants: vi.fn(),
        favorite: vi.fn(),
        retry: vi.fn()
      }
    })

    render(<AppShell />)

    fireEvent.click(await screen.findByRole('button', { name: '继续修改' }))
    expect(screen.getByText('参考图 1 张')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Logo 设计'))

    expect(screen.queryByText('参考图 1 张')).not.toBeInTheDocument()
  })

  it('restores the selected logo project reference assets', async () => {
    const projectWithReference = {
      ...logoProject,
      generationIds: [],
      referenceImageIds: [projectReferenceAsset.id]
    }
    installBloomCanvasApi({
      assets: {
        getPathForFile: vi.fn(),
        import: vi.fn(),
        export: vi.fn(),
        getMany: vi.fn().mockResolvedValue({ ok: true, data: [projectReferenceAsset] })
      },
      logoProjects: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [projectWithReference] }),
        save: vi.fn(),
        get: vi.fn(),
        remove: vi.fn()
      }
    })

    render(<AppShell />)
    fireEvent.click(await screen.findByText('Logo 设计'))

    expect(await screen.findByRole('img', { name: '参考图 1' })).toHaveAttribute(
      'src',
      'bloom-canvas://thumbnail/project-reference-1'
    )
  })

  it('deletes a generation from history after confirmation', async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    const list = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: [generatedRecordWithVariant] })
      .mockResolvedValue({ ok: true, data: [] })
    installBloomCanvasApi({
      providers: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [provider] }),
        save: vi.fn(),
        getActive: vi.fn().mockResolvedValue({ ok: true, data: provider })
      },
      generations: {
        create: vi.fn(),
        list,
        remove,
        removeVariants: vi.fn(),
        favorite: vi.fn(),
        retry: vi.fn()
      }
    })

    render(<AppShell />)

    await waitFor(() =>
      expect(screen.getAllByText(generatedRecordWithVariant.promptFinal).length).toBeGreaterThan(0)
    )
    fireEvent.click(screen.getByRole('button', { name: '删除历史记录' }))
    const deleteDialog = await screen.findByRole('dialog')
    expect(within(deleteDialog).getByText('删除这条历史记录？')).toBeInTheDocument()
    fireEvent.click(within(deleteDialog).getByRole('button', { name: /删\s*除/ }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith(generatedRecordWithVariant.id))
    await waitFor(() =>
      expect(screen.queryByText(generatedRecordWithVariant.promptFinal)).toBeNull()
    )
  })
})
