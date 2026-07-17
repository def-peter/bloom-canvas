import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { LogoCandidateReview } from '../../../../shared/logoDesign'
import { LogoReviewBadge } from './LogoReviewBadge'

const localOnlyReview: LogoCandidateReview = {
  candidateId: 'variant-1',
  status: 'unreviewed',
  reviewMode: 'local-only',
  hardFailures: [],
  risksZh: [],
  unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
}

const notRecommendedReview: LogoCandidateReview = {
  candidateId: 'variant-2',
  status: 'not-recommended',
  reviewMode: 'vision-model',
  scores: {
    strategyFit: 40,
    distinctiveness: 35,
    simplicity: 48,
    smallSizePotential: 42,
    craft: 55
  },
  hardFailures: ['出现未要求的伪文字'],
  risksZh: ['小尺寸细节会消失'],
  suggestedRevisionZh: '移除伪文字并简化轮廓。'
}

describe('LogoReviewBadge', () => {
  test('shows an explicit local-only state without score UI', () => {
    render(<LogoReviewBadge review={localOnlyReview} />)

    expect(screen.getByText('未执行 AI 评审')).toBeInTheDocument()
    expect(screen.getByText('当前供应商未执行 AI 视觉评审')).toBeInTheDocument()
    expect(screen.queryByText(/50|评分|分$/)).not.toBeInTheDocument()
  })

  test('shows concrete reasons for a not-recommended result', () => {
    render(<LogoReviewBadge review={notRecommendedReview} />)

    expect(screen.getByText('不建议继续')).toBeInTheDocument()
    expect(screen.getByText('出现未要求的伪文字')).toBeInTheDocument()
    expect(screen.getByText('小尺寸细节会消失')).toBeInTheDocument()
  })
})
