import { Tag, Typography } from 'antd'
import type { LogoCandidateReview } from '../../../../shared/logoDesign'

interface LogoReviewBadgeProps {
  review: LogoCandidateReview
}

const statusPresentation = {
  recommended: { color: 'success', label: '推荐继续' },
  adjustable: { color: 'processing', label: '可以调整' },
  'not-recommended': { color: 'error', label: '不建议继续' },
  unreviewed: { color: 'default', label: '未执行 AI 评审' }
} as const

const scoreLabels = {
  strategyFit: '策略匹配',
  distinctiveness: '独特性',
  simplicity: '简洁度',
  smallSizePotential: '小尺寸潜力',
  craft: '完成度'
} as const

export function LogoReviewBadge({ review }: LogoReviewBadgeProps): React.JSX.Element {
  const presentation = statusPresentation[review.status]
  return (
    <div className="logo-review-badge">
      <Tag color={presentation.color}>{presentation.label}</Tag>
      {review.reviewMode === 'local-only' ? (
        <Typography.Text type="secondary">{review.unavailableReasonZh}</Typography.Text>
      ) : (
        <dl className="logo-review-scores">
          {Object.entries(review.scores).map(([key, score]) => (
            <div key={key}>
              <dt>{scoreLabels[key as keyof typeof scoreLabels]}</dt>
              <dd>{score}</dd>
            </div>
          ))}
        </dl>
      )}
      {review.hardFailures.length > 0 ? (
        <ul className="logo-review-failures">
          {review.hardFailures.map((failure) => (
            <li key={failure}>{failure}</li>
          ))}
        </ul>
      ) : null}
      {review.risksZh.length > 0 ? (
        <ul className="logo-review-risks">
          {review.risksZh.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      ) : null}
      {review.reviewMode === 'vision-model' && review.suggestedRevisionZh ? (
        <Typography.Text type="secondary">{review.suggestedRevisionZh}</Typography.Text>
      ) : null}
    </div>
  )
}
