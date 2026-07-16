import { fireEvent, render, screen } from '@testing-library/react'
import { App } from 'antd'
import type { ComponentProps } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { LogoGenerationStep } from './LogoGenerationStep'

function renderStep(
  overrides: Partial<ComponentProps<typeof LogoGenerationStep>> = {}
): void {
  render(
    <App>
      <LogoGenerationStep
        generating={false}
        generations={[]}
        items={[]}
        mode="quality-first"
        projectId="project-1"
        onDelete={vi.fn()}
        onDeleteVariants={vi.fn()}
        onExport={vi.fn()}
        onGenerate={vi.fn()}
        onModeChange={vi.fn()}
        onRetryGeneration={vi.fn()}
        onRetryItem={vi.fn()}
        onSelectCandidate={vi.fn()}
        {...overrides}
      />
    </App>
  )
}

describe('LogoGenerationStep', () => {
  test('defaults to six candidates and explains the estimate without inventing price', () => {
    renderStep()

    expect(screen.getByText('预计生成 6 张候选图')).toBeInTheDocument()
    expect(screen.queryByText(/¥|美元|预计费用/)).not.toBeInTheDocument()
  })

  test('economy mode requests one candidate per strategy', () => {
    const onGenerate = vi.fn()
    renderStep({ mode: 'economy', onGenerate })

    fireEvent.click(screen.getByRole('button', { name: '生成 3 张 Logo 初稿' }))
    expect(onGenerate).toHaveBeenCalledWith({ candidatesPerStrategy: 1 })
  })

  test('shows a failed candidate with a focused retry action', () => {
    const onRetryItem = vi.fn()
    const failedItem = {
      key: 'strategy-path:0',
      strategyId: 'strategy-path',
      strategyNameZh: '连续创作路径',
      candidateIndex: 0,
      status: 'failed' as const,
      errorMessage: 'provider timeout'
    }
    renderStep({ items: [failedItem], onRetryItem })

    expect(screen.getByText('provider timeout')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '只重试此项' }))
    expect(onRetryItem).toHaveBeenCalledWith(failedItem)
  })
})
