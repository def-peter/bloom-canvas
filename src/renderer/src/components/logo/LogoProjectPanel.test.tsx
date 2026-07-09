import { fireEvent, render, screen } from '@testing-library/react'
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
        onCreateNew={vi.fn()}
        onSelect={onSelect}
      />
    )

    fireEvent.click(screen.getByText('生花'))

    expect(screen.getByText('AI 绘图软件')).toBeInTheDocument()
    expect(onSelect).toHaveBeenCalledWith(project)
  })
})
