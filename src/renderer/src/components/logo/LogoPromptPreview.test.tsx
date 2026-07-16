import { render, screen } from '@testing-library/react'
import { Form } from 'antd'
import { expect, test } from 'vitest'
import type { LogoPromptPack } from '../../../../shared/types'
import { LogoPromptPreview } from './LogoPromptPreview'

const promptPack: LogoPromptPack = {
  basePrompt: 'base prompt',
  directions: [
    {
      id: 'modern-minimal',
      name: '现代极简',
      prompt: 'direction prompt',
      finalPrompt: 'base prompt\ndirection prompt'
    }
  ]
}

test('keeps direction prompts collapsed when opening a saved project', () => {
  render(
    <Form initialValues={{ promptPack }}>
      <LogoPromptPreview promptPack={promptPack} />
    </Form>
  )

  expect(screen.getByDisplayValue('base prompt')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /现代极简/ })).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByDisplayValue('base prompt\ndirection prompt')).not.toBeInTheDocument()
})
