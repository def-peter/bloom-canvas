import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GenerationRecord } from '../../../shared/types'
import { HistoryPanel } from './HistoryPanel'

const failedGeneration: GenerationRecord = {
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
  providerId: 'provider-1',
  status: 'failed',
  favorite: false,
  errorMessage: `Provider request failed: 400 {"error":{"code":"unknown_parameter","message":"Unknown parameter: 'tools[0].n'.","param":"tools[0].n","type":"invalid_request_error"}}`,
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z',
  references: [],
  variants: []
}

describe('HistoryPanel', () => {
  it('shows failed generations with an explicit failure label', () => {
    render(
      <HistoryPanel
        generations={[failedGeneration]}
        selectedId={undefined}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />
    )

    expect(screen.getByLabelText('生成失败')).toBeInTheDocument()
    expect(screen.getByText("生成失败 · Unknown parameter: 'tools[0].n'.")).toBeInTheDocument()
    expect(screen.queryByText(/unknown_parameter/)).not.toBeInTheDocument()
  })

  it('confirms before deleting a generation', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)

    render(
      <HistoryPanel
        generations={[failedGeneration]}
        selectedId={undefined}
        onDelete={onDelete}
        onSelect={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '删除历史记录' }))
    const deleteDialog = await screen.findByRole('dialog', { name: '删除这条历史记录？' })

    fireEvent.click(within(deleteDialog).getByRole('button', { name: /删\s*除/ }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(failedGeneration.id))
  })
})
