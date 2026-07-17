import { describe, expect, test } from 'vitest'
import { logoTestPromptPack } from '../../../../shared/logoDesign.testFixtures'
import type { LogoCandidateReview } from '../../../../shared/logoDesign'
import { buildQualityRetryPrompt, shouldAutoRetryQuality } from './logoQualityRetry'

function rejected(
  candidateId: string
): Extract<LogoCandidateReview, { reviewMode: 'vision-model' }> {
  return {
    candidateId,
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
    risksZh: [],
    revisionInstructionEn: 'Remove all pseudo-text.'
  }
}

const sixRejected = Array.from({ length: 6 }, (_, index) => rejected(`variant-${index}`))

describe('logo quality retry', () => {
  test('retries only when every expected candidate has a vision-model rejection', () => {
    expect(
      shouldAutoRetryQuality({
        enabled: true,
        expectedCount: 6,
        reviews: sixRejected,
        existingRetryAttempts: []
      })
    ).toBe(true)
  })

  const nonRetryCases: Array<[string, LogoCandidateReview[]]> = [
    [
      'one recommendation',
      [...sixRejected.slice(0, 5), { ...rejected('recommended'), status: 'recommended' as const }]
    ],
    [
      'one local-only review',
      [
        ...sixRejected.slice(0, 5),
        {
          candidateId: 'local',
          status: 'unreviewed' as const,
          reviewMode: 'local-only' as const,
          hardFailures: [],
          risksZh: [],
          unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
        }
      ]
    ],
    ['incomplete reviews', sixRejected.slice(0, 5)]
  ]

  test.each(nonRetryCases)('does not retry for %s', (_, reviews) => {
    expect(
      shouldAutoRetryQuality({
        enabled: true,
        expectedCount: 6,
        reviews,
        existingRetryAttempts: []
      })
    ).toBe(false)
  })

  test('never retries when a quality retry record already exists', () => {
    expect(
      shouldAutoRetryQuality({
        enabled: true,
        expectedCount: 6,
        reviews: sixRejected,
        existingRetryAttempts: [1]
      })
    ).toBe(false)
  })

  test('keeps the strategy prompt and appends deduplicated correction boundaries', () => {
    const prompt = buildQualityRetryPrompt(logoTestPromptPack.directions[0], [
      rejected('variant-1'),
      rejected('variant-2')
    ])

    expect(prompt).toContain(logoTestPromptPack.directions[0].finalPrompt)
    expect(prompt.match(/Remove all pseudo-text\./g)).toHaveLength(1)
    expect(prompt).toContain('Keep the approved brand brief and core strategy unchanged')
    expect(prompt).toContain('Generate exactly one standalone logo mark')
  })
})
