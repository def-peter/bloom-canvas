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
        selectedId={null}
        selectedProjectHasImages={false}
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
        selectedId={project.id}
        selectedProjectHasImages={false}
        onCreateNew={vi.fn()}
        onDelete={onDelete}
        onSelect={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '删除项目' }))
    const dialog = await screen.findByRole('dialog', { name: '删除 Logo 项目？' })
    fireEvent.click(within(dialog).getByRole('button', { name: /删\s*除/ }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(project.id))
  })

  test('disables project deletion while images remain', () => {
    render(
      <LogoProjectPanel
        projects={[project]}
        selectedId={project.id}
        selectedProjectHasImages
        onCreateNew={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '删除项目' })).toBeDisabled()
  })
})
