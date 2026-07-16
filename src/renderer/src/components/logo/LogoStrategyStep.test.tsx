import { fireEvent, render, screen } from '@testing-library/react'
import { App } from 'antd'
import type { ComponentProps } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { logoTestPromptPack, logoTestRevision } from '../../../../shared/logoDesign.testFixtures'
import { LogoStrategyStep } from './LogoStrategyStep'

function renderStrategyStep(
  overrides: Partial<ComponentProps<typeof LogoStrategyStep>> = {}
): void {
  render(
    <App>
      <LogoStrategyStep
        loadingStrategyId={null}
        promptPack={logoTestPromptPack}
        revision={logoTestRevision}
        onChangePrompt={vi.fn()}
        onChangeRenderStyle={vi.fn()}
        onEditStrategy={vi.fn()}
        onGenerate={vi.fn()}
        onReplaceStrategy={vi.fn()}
        {...overrides}
      />
    </App>
  )
}

describe('LogoStrategyStep', () => {
  test('shows concrete strategy content and keeps prompts collapsed by default', () => {
    renderStrategyStep()

    expect(screen.getByText('连续创作路径')).toBeInTheDocument()
    expect(screen.getAllByText('品牌依据')).toHaveLength(3)
    expect(screen.getAllByText('构形方式')).toHaveLength(3)
    expect(screen.queryByDisplayValue(/Create exactly one/)).not.toBeInTheDocument()
  })

  test('blocks generation when selected prompts are stale', () => {
    renderStrategyStep({
      promptPack: { ...logoTestPromptPack, sourceBriefVersion: 2 }
    })

    expect(screen.getByRole('button', { name: '生成 Logo 初稿' })).toBeDisabled()
    expect(screen.getByText('上游信息已变化，请重新确认提示词')).toBeInTheDocument()
  })

  test('replaces only the requested strategy', () => {
    const onReplaceStrategy = vi.fn()
    renderStrategyStep({ onReplaceStrategy })

    fireEvent.click(screen.getByRole('button', { name: '替换策略：连续创作路径' }))
    expect(onReplaceStrategy).toHaveBeenCalledWith('strategy-path')
  })
})
