import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreationPanel } from './CreationPanel'

describe('CreationPanel', () => {
  it('opens provider settings when generating without provider', () => {
    const onNeedProvider = vi.fn()

    render(
      <CreationPanel
        activeProvider={null}
        referenceAssets={[]}
        settings={null}
        onCreated={vi.fn()}
        onError={vi.fn()}
        onGeneratingChange={vi.fn()}
        onNeedProvider={onNeedProvider}
        onReferenceAssetsChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    expect(onNeedProvider).toHaveBeenCalledOnce()
  })
})
