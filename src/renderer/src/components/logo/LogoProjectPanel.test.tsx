import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { LogoProject } from '../../../../shared/types'
import { LogoProjectPanel } from './LogoProjectPanel'

const project: LogoProject = {
  id: 'project-1',
  brandName: '生花',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者生成图片',
  brandKeywords: ['清晰'],
  preferredColors: [],
  avoidedColors: [],
  logoTypes: ['combination-mark'],
  styleDirections: ['modern-minimal'],
  usageScenarios: [],
  referenceImageIds: [],
  generationIds: [],
  favoriteVariantIds: [],
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
}

describe('LogoProjectPanel', () => {
  test('renders projects and selects one', async () => {
    const onSelect = vi.fn()
    render(
      <LogoProjectPanel
        projects={[project]}
        generating={false}
        selectedId={null}
        selectedProjectImageCount={0}
        onCreateNew={vi.fn()}
        onDelete={vi.fn()}
        onSelect={onSelect}
      />
    )

    fireEvent.click(screen.getByText('生花'))

    expect(screen.getByText('AI 绘图软件')).toBeInTheDocument()
    expect(onSelect).toHaveBeenCalledWith(project)
  })

  test('confirms deletion for the selected empty project', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <LogoProjectPanel
        projects={[project]}
        generating={false}
        selectedId={project.id}
        selectedProjectImageCount={0}
        onCreateNew={vi.fn()}
        onDelete={onDelete}
        onSelect={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '删除项目' }))
    const dialog = await screen.findByRole('dialog', { name: '删除 Logo 项目及图片？' })
    expect(within(dialog).getByText('将删除该项目和相关历史记录。')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /删\s*除/ }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(project.id))
  })

  test('confirms cascading deletion for a selected project with images', async () => {
    render(
      <LogoProjectPanel
        projects={[project]}
        generating={false}
        selectedId={project.id}
        selectedProjectImageCount={6}
        onCreateNew={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    const deleteButton = screen.getByRole('button', { name: '删除项目' })
    expect(deleteButton).toBeEnabled()
    fireEvent.click(deleteButton)

    const dialog = await screen.findByRole('dialog', { name: '删除 Logo 项目及图片？' })
    expect(within(dialog).getByText('将同步删除 6 张生成图片和相关历史记录。')).toBeInTheDocument()
    expect(within(dialog).getByText(/用户导入的参考图原文件会保留/)).toBeInTheDocument()
  })

  test('disables project deletion while a generation is running', () => {
    render(
      <LogoProjectPanel
        generating
        projects={[project]}
        selectedId={project.id}
        selectedProjectImageCount={0}
        onCreateNew={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '删除项目' })).toBeDisabled()
  })
})
