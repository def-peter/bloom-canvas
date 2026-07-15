import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from '../../../shared/types'
import { ProviderSettingsModal } from './ProviderSettingsModal'

const existingProvider: ProviderConfig = {
  id: 'provider-1',
  name: 'Provider',
  baseUrl: 'https://api.example.test/v1',
  imageModel: 'gpt-image-2',
  promptModel: 'custom-strategy-model',
  hasApiKey: true,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z'
}

function renderModal(provider: ProviderConfig | null): void {
  render(
    <ProviderSettingsModal
      open
      provider={provider}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onError={vi.fn()}
    />
  )
}

describe('ProviderSettingsModal', () => {
  it('defaults the strategy and prompt model for a new provider', async () => {
    renderModal(null)

    expect(await screen.findByLabelText('策略与提示词模型')).toHaveValue('gpt-5.6-terra')
  })

  it('preserves the strategy and prompt model for an existing provider', async () => {
    renderModal(existingProvider)

    expect(await screen.findByLabelText('策略与提示词模型')).toHaveValue(
      existingProvider.promptModel
    )
  })
})
