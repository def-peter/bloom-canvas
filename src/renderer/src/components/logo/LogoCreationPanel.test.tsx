import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { describe, expect, test, vi } from 'vitest'
import type { ProviderConfig } from '../../../../shared/types'
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

describe('LogoCreationPanel', () => {
  test('explains logo type choices in plain language', () => {
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
        />
      </App>
    )

    expect(screen.getByText('图标 + 品牌名')).toBeInTheDocument()
    expect(screen.getByText('品牌全名文字')).toBeInTheDocument()
    expect(screen.getByText('首字母 / 缩写')).toBeInTheDocument()
    expect(screen.getByLabelText('说明：图标 + 品牌名')).toBeInTheDocument()
    expect(screen.getByLabelText('说明：品牌全名文字')).toBeInTheDocument()
    expect(screen.getByLabelText('说明：首字母 / 缩写')).toBeInTheDocument()
  })

  test('builds a prompt pack before image generation', async () => {
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
        />
      </App>
    )

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
})
