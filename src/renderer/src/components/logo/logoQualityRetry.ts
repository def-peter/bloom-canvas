import type {
  LogoCandidateReview,
  LogoStrategyPromptDirection
} from '../../../../shared/logoDesign'

const hardFailureInstructions: Record<string, string> = {
  一图多标: 'Show one mark only, never multiple logo options.',
  方案合集: 'Do not create a concept sheet or a collection of options.',
  出现未要求的伪文字: 'Remove all unrequested text and pseudo-text.',
  未要求文字: 'Remove all unrequested text and pseudo-text.',
  伪文字: 'Remove all unrequested text and pseudo-text.',
  水印: 'Remove every watermark or signature.',
  Mockup: 'Show the flat logo master only, without a mockup or scene.',
  细节无法缩小: 'Simplify details so the mark remains clear at 32 pixels.'
}

export function shouldAutoRetryQuality(input: {
  enabled: boolean
  expectedCount: number
  reviews: LogoCandidateReview[]
  existingRetryAttempts: Array<0 | 1>
}): boolean {
  if (!input.enabled || input.expectedCount < 1 || input.existingRetryAttempts.includes(1)) {
    return false
  }
  const uniqueReviews = new Map(input.reviews.map((review) => [review.candidateId, review]))
  return (
    uniqueReviews.size === input.expectedCount &&
    Array.from(uniqueReviews.values()).every(
      (review) => review.reviewMode === 'vision-model' && review.status === 'not-recommended'
    )
  )
}

export function buildQualityRetryPrompt(
  direction: LogoStrategyPromptDirection,
  reviews: LogoCandidateReview[]
): string {
  const corrections = new Set<string>()
  for (const review of reviews) {
    if (review.reviewMode === 'vision-model' && review.revisionInstructionEn?.trim()) {
      corrections.add(review.revisionInstructionEn.trim())
      continue
    }
    for (const failure of review.hardFailures) {
      const instruction = Object.entries(hardFailureInstructions).find(([label]) =>
        failure.includes(label)
      )?.[1]
      if (instruction) corrections.add(instruction)
    }
  }

  return [
    direction.finalPrompt,
    'Quality retry constraints:',
    'Keep the approved brand brief and core strategy unchanged.',
    ...Array.from(corrections).map((correction) => `- ${correction}`),
    'Generate exactly one standalone logo mark. Do not output a mockup, scene, poster, grid, or option sheet.'
  ].join('\n')
}
