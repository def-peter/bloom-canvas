import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { GenerationRecord, LogoStyleDirectionId } from '../../../../shared/types'
import { LogoResultsPanel } from './LogoResultsPanel'

function logoRecord(directionId: LogoStyleDirectionId, directionName: string): GenerationRecord {
  return {
    id: `generation-${directionId}`,
    mode: 'text-to-image',
    scenario: 'logo-design',
    projectId: 'project-1',
    scenarioMetadata: {
      logoProjectId: 'project-1',
      styleDirectionId: directionId,
      styleDirectionName: directionName,
      logoTypes: ['combination-mark'],
      promptPackSnapshot: {
        basePrompt: 'base prompt',
        directions: []
      },
      finalPrompt: 'final prompt',
      briefSnapshot: {
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者生成图片',
        brandKeywords: ['清晰']
      },
      qualityRulesVersion: 1
    },
    promptOriginal: 'final prompt',
    promptFinal: 'final prompt',
    referenceImageIds: [],
    parameters: { size: '1024x1024', count: 1, quality: 'standard', outputFormat: 'png' },
    outputVariantIds: [],
    providerId: 'provider-1',
    status: 'succeeded',
    favorite: false,
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    references: [],
    variants: []
  }
}

describe('LogoResultsPanel', () => {
  test('groups logo generations by style direction', () => {
    render(
      <LogoResultsPanel
        generating={false}
        generations={[
          logoRecord('modern-minimal', '现代极简'),
          logoRecord('symbolic-mark', '图形符号')
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText('现代极简')).toBeInTheDocument()
    expect(screen.getByText('图形符号')).toBeInTheDocument()
  })
})
