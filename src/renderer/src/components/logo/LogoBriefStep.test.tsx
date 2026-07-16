import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { describe, expect, test, vi } from 'vitest'
import { LogoBriefStep } from './LogoBriefStep'
import type { LogoBriefFormValues } from './logoFormUtils'

const initialValues: LogoBriefFormValues = {
  brandName: '生花',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者生成图片',
  brandKeywords: ['清晰', '创造力'],
  avoidedElements: [],
  preferredColors: [],
  avoidedColors: [],
  logoType: 'combination-mark',
  usageScenarios: ['app-icon', 'website']
}

describe('LogoBriefStep', () => {
  test('submits a plain-language brief with one clear primary action', async () => {
    const onSubmit = vi.fn()
    render(
      <App>
        <LogoBriefStep initialValues={initialValues} loading={false} onSubmit={onSubmit} />
      </App>
    )

    expect(screen.queryByText('风格方向')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '生成创意策略' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '生成创意策略' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        brandName: '生花',
        brandKeywords: ['清晰', '创造力'],
        usageScenarios: ['app-icon', 'website']
      })
    )
  })
})
