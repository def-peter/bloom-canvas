import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { GenerationRecord, LogoProject, ProviderConfig } from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { LogoCreationPanel } from './LogoCreationPanel'

vi.mock('../../api/bloomCanvasClient', () => ({
  bloomCanvasClient: {
    generations: {
      create: vi.fn()
    },
    logoProjects: {
      save: vi.fn(async (input) => ({ ...input, id: 'project-1', generationIds: [] }))
    },
    logoPrompt: {
      build: vi.fn(async () => ({
        basePrompt: 'base prompt simple scalable logo works at 32px',
        directions: [
          {
            id: 'modern-minimal',
            name: '现代极简',
            prompt: 'modern prompt',
            finalPrompt: 'base prompt\nmodern prompt'
          }
        ]
      }))
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

const existingProject: LogoProject = {
  id: 'project-1',
  brandName: '生花',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者生成图片',
  brandKeywords: ['清晰'],
  preferredColors: [],
  avoidedColors: [],
  logoTypes: ['combination-mark'],
  styleDirections: ['modern-minimal', 'symbolic-mark', 'wordmark'],
  usageScenarios: ['app-icon'],
  referenceImageIds: [],
  generationIds: [],
  favoriteVariantIds: [],
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
}

const failedLogoRecord: GenerationRecord = {
  id: 'generation-1',
  mode: 'text-to-image',
  scenario: 'logo-design',
  projectId: 'project-1',
  promptOriginal: 'base prompt\nmodern prompt',
  promptFinal: 'base prompt\nmodern prompt',
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

function renderPanel(overrides?: Partial<ComponentProps<typeof LogoCreationPanel>>): void {
  render(
    <App>
      <LogoCreationPanel
        activeProvider={provider}
        project={null}
        referenceAssets={[]}
        settings={null}
        onCreated={vi.fn()}
        onError={vi.fn()}
        onGeneratingChange={vi.fn()}
        onNeedProvider={vi.fn()}
        onProjectSaved={vi.fn()}
        onReferenceAssetsChange={vi.fn()}
        {...overrides}
      />
    </App>
  )
}

describe('LogoCreationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows flexible image sizes for gpt-image-2 providers', () => {
    renderPanel()

    fireEvent.mouseDown(screen.getByLabelText('图像尺寸'))

    expect(screen.getByText('1536 x 864')).toBeInTheDocument()
    expect(screen.getByText('自定义')).toBeInTheDocument()
  })

  test('explains logo type choices in plain language', () => {
    renderPanel()

    expect(screen.getByText('图标 + 品牌名')).toBeInTheDocument()
    expect(screen.getByText('品牌全名文字')).toBeInTheDocument()
    expect(screen.getByText('首字母 / 缩写')).toBeInTheDocument()
    expect(screen.getByLabelText('说明：图标 + 品牌名')).toBeInTheDocument()
    expect(screen.getByLabelText('说明：品牌全名文字')).toBeInTheDocument()
    expect(screen.getByLabelText('说明：首字母 / 缩写')).toBeInTheDocument()
  })

  test('builds a prompt pack before image generation', async () => {
    renderPanel()

    fireEvent.change(screen.getByLabelText('品牌名'), { target: { value: '生花' } })
    fireEvent.change(screen.getByLabelText('行业'), { target: { value: 'AI 绘图软件' } })
    fireEvent.change(screen.getByLabelText('业务描述'), {
      target: { value: '帮助创作者生成图片' }
    })
    fireEvent.change(screen.getByLabelText('品牌关键词'), { target: { value: '清晰' } })
    fireEvent.click(screen.getByText('生成/更新提示词'))

    await waitFor(() => expect(screen.getByText('提示词预览')).toBeInTheDocument())
    expect(screen.getAllByDisplayValue(/base prompt/)).not.toHaveLength(0)
  })

  test('saves one primary logo type from the selected radio choice', async () => {
    const save = vi.mocked(bloomCanvasClient.logoProjects.save)
    renderPanel()

    fireEvent.change(screen.getByLabelText('品牌名'), { target: { value: '生花' } })
    fireEvent.change(screen.getByLabelText('行业'), { target: { value: 'AI 绘图软件' } })
    fireEvent.change(screen.getByLabelText('业务描述'), {
      target: { value: '帮助创作者生成图片' }
    })
    fireEvent.change(screen.getByLabelText('品牌关键词'), { target: { value: '清晰' } })
    fireEvent.click(screen.getByText('纯图形图标'))
    fireEvent.click(screen.getByText('生成 Logo 初稿'))

    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ logoTypes: ['symbol-mark'] }))
  })

  test('blocks more than three style directions', async () => {
    const save = vi.mocked(bloomCanvasClient.logoProjects.save)
    renderPanel({ project: existingProject })

    fireEvent.click(screen.getByText('科技感'))
    fireEvent.click(screen.getByText('生成 Logo 初稿'))

    await waitFor(() => expect(screen.getByText('最多选择 3 个风格方向')).toBeInTheDocument())
    expect(save).not.toHaveBeenCalled()
  })

  test('reports failed logo generations instead of treating gray placeholders as results', async () => {
    vi.mocked(bloomCanvasClient.generations.create).mockResolvedValue(failedLogoRecord)
    const onCreated = vi.fn()
    const onError = vi.fn()
    renderPanel({ onCreated, onError })

    fireEvent.change(screen.getByLabelText('品牌名'), { target: { value: '生花' } })
    fireEvent.change(screen.getByLabelText('行业'), { target: { value: 'AI 绘图软件' } })
    fireEvent.change(screen.getByLabelText('业务描述'), {
      target: { value: '帮助创作者生成图片' }
    })
    fireEvent.change(screen.getByLabelText('品牌关键词'), { target: { value: '清晰' } })
    fireEvent.click(screen.getByText('生成 Logo 初稿'))

    await waitFor(() => expect(onError).toHaveBeenCalledWith(failedLogoRecord.errorMessage))
    expect(onCreated).not.toHaveBeenCalled()
  })
})
