import { CheckSquareOutlined, DeleteOutlined } from '@ant-design/icons'
import { Button, Checkbox, Collapse, Empty, Image, Modal, Space, Spin, Typography } from 'antd'
import { useState } from 'react'
import { assetProtocolUrl } from '../../../../shared/assetProtocol'
import type { LogoCandidateReview } from '../../../../shared/logoDesign'
import type { Asset, GenerationRecord } from '../../../../shared/types'
import { LogoReviewBadge } from './LogoReviewBadge'
import { LogoUsabilityPreview } from './LogoUsabilityPreview'

interface LogoResultsPanelProps {
  candidateReviews?: Record<string, LogoCandidateReview>
  generating: boolean
  generations: GenerationRecord[]
  selectedProjectId: string | null
  onContinueEdit: (asset: Asset) => void
  onDelete: (generationId: string) => Promise<void>
  onDeleteVariants: (variantIds: string[]) => Promise<void>
  onExport: (assetId: string) => Promise<void>
  onRetry: (generationId: string) => Promise<void>
}

interface LogoCandidateEntry {
  directionName: string
  generation: GenerationRecord
  review?: LogoCandidateReview
  variant: GenerationRecord['variants'][number]
}

function directionName(generation: GenerationRecord): string {
  const metadata = generation.scenarioMetadata
  return metadata?.version === 2
    ? metadata.strategyNameZh
    : (metadata?.styleDirectionName ?? '未分类方向')
}

function reviewWeight(review: LogoCandidateReview | undefined): number {
  if (review?.status === 'recommended') return 0
  if (review?.status === 'adjustable') return 1
  if (review?.status === 'unreviewed') return 2
  if (!review) return 3
  return 4
}

function groupEntries(entries: LogoCandidateEntry[]): Array<[string, LogoCandidateEntry[]]> {
  const groups = new Map<string, LogoCandidateEntry[]>()
  for (const entry of entries) {
    groups.set(entry.directionName, [...(groups.get(entry.directionName) ?? []), entry])
  }
  return Array.from(groups)
}

export function LogoResultsPanel({
  candidateReviews = {},
  generating,
  generations,
  selectedProjectId,
  onContinueEdit,
  onDelete,
  onDeleteVariants,
  onExport,
  onRetry
}: LogoResultsPanelProps): React.JSX.Element {
  const [retryingGenerationId, setRetryingGenerationId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([])
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)

  async function retryGeneration(generationId: string): Promise<void> {
    setRetryingGenerationId(generationId)
    try {
      await onRetry(generationId)
    } catch {
      // AppShell owns error reporting; keep this component focused on interaction state.
    } finally {
      setRetryingGenerationId(null)
    }
  }

  async function deleteGeneration(): Promise<void> {
    if (!deleteTargetId) return

    setDeleting(true)
    try {
      await onDelete(deleteTargetId)
      setDeleteTargetId(null)
    } finally {
      setDeleting(false)
    }
  }

  function toggleVariant(variantId: string): void {
    setSelectedVariantIds((current) =>
      current.includes(variantId)
        ? current.filter((id) => id !== variantId)
        : [...current, variantId]
    )
  }

  async function deleteSelectedVariants(): Promise<void> {
    setDeleting(true)
    try {
      await onDeleteVariants(selectedVariantIds)
      setBatchDeleteOpen(false)
      setSelectionMode(false)
      setSelectedVariantIds([])
    } catch {
      // AppShell owns error reporting; keep the selection for a retry.
    } finally {
      setDeleting(false)
    }
  }

  function renderCandidateGroups(groups: Array<[string, LogoCandidateEntry[]]>): React.JSX.Element {
    return (
      <div className="logo-direction-groups">
        {groups.map(([name, directionEntries]) => (
          <section className="logo-direction-group" key={name}>
            <div className="logo-direction-header">
              <Typography.Text strong>{name}</Typography.Text>
              <Typography.Text type="secondary">{directionEntries.length} 个候选</Typography.Text>
            </div>
            <div className="result-grid">
              {directionEntries.map(({ generation, review, variant }) => (
                <article
                  className={`result-card${selectedVariantIds.includes(variant.id) ? ' selected' : ''}`}
                  key={variant.id}
                >
                  <Image
                    alt={`${name} 方案 ${variant.index + 1}`}
                    preview={!selectionMode}
                    src={assetProtocolUrl(variant.asset.id)}
                    onClick={() => {
                      if (selectionMode) toggleVariant(variant.id)
                    }}
                  />
                  {review ? <LogoReviewBadge review={review} /> : null}
                  {selectionMode ? (
                    <Checkbox
                      aria-label={`选择图片 ${variant.id}`}
                      checked={selectedVariantIds.includes(variant.id)}
                      className="image-selection-checkbox"
                      onChange={() => toggleVariant(variant.id)}
                    />
                  ) : (
                    <>
                      <div className="result-actions">
                        <Button size="small" onClick={() => onContinueEdit(variant.asset)}>
                          继续修改
                        </Button>
                        <Button size="small" onClick={() => void onExport(variant.asset.id)}>
                          导出
                        </Button>
                        <Button
                          danger
                          disabled={generating}
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={() => setDeleteTargetId(generation.id)}
                        >
                          删除
                        </Button>
                        <Button
                          aria-label={
                            retryingGenerationId === generation.id ? '重新生成中' : '重新生成'
                          }
                          disabled={retryingGenerationId === generation.id}
                          loading={retryingGenerationId === generation.id}
                          size="small"
                          onClick={() => void retryGeneration(generation.id)}
                        >
                          {retryingGenerationId === generation.id ? '重新生成中' : '重新生成'}
                        </Button>
                      </div>
                      <Collapse
                        ghost
                        items={[
                          {
                            children: <LogoUsabilityPreview asset={variant.asset} />,
                            key: 'checks',
                            label: '可用性检查'
                          }
                        ]}
                        size="small"
                      />
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  if (!selectedProjectId) {
    return (
      <main className="gallery-panel logo-results-panel">
        <Empty description="选择或创建一个 Logo 项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </main>
    )
  }

  const projectGenerations = generations.filter(
    (generation) =>
      generation.scenario === 'logo-design' && generation.projectId === selectedProjectId
  )
  const candidates = projectGenerations
    .flatMap((generation) =>
      generation.variants.map((variant) => ({
        directionName: directionName(generation),
        generation,
        review: candidateReviews[variant.id],
        variant
      }))
    )
    .sort((left, right) => {
      const weight = reviewWeight(left.review) - reviewWeight(right.review)
      if (weight !== 0) return weight
      const time = left.generation.createdAt.localeCompare(right.generation.createdAt)
      if (time !== 0) return time
      return left.variant.index - right.variant.index
    })
  const primaryGroups = groupEntries(
    candidates.filter((candidate) => candidate.review?.status !== 'not-recommended')
  )
  const rejectedGroups = groupEntries(
    candidates.filter((candidate) => candidate.review?.status === 'not-recommended')
  )
  const rejectedCount = rejectedGroups.reduce((count, [, entries]) => count + entries.length, 0)
  const allVariantIds = candidates.map((candidate) => candidate.variant.id)

  return (
    <main className="gallery-panel logo-results-panel">
      <div className="panel-header">
        <Typography.Text strong>Logo 结果</Typography.Text>
        <Space wrap>
          {generating ? <Spin size="small" /> : null}
          {allVariantIds.length > 0 ? (
            selectionMode ? (
              <>
                <Typography.Text type="secondary">
                  已选 {selectedVariantIds.length} 张
                </Typography.Text>
                <Button
                  aria-label={
                    selectedVariantIds.length === allVariantIds.length ? '取消全选' : '全选'
                  }
                  autoInsertSpace={false}
                  disabled={generating}
                  onClick={() =>
                    setSelectedVariantIds(
                      selectedVariantIds.length === allVariantIds.length ? [] : allVariantIds
                    )
                  }
                >
                  {selectedVariantIds.length === allVariantIds.length ? '取消全选' : '全选'}
                </Button>
                <Button
                  aria-label={`删除所选（${selectedVariantIds.length}）`}
                  autoInsertSpace={false}
                  danger
                  disabled={generating || selectedVariantIds.length === 0}
                  icon={<DeleteOutlined />}
                  onClick={() => setBatchDeleteOpen(true)}
                >
                  删除所选（{selectedVariantIds.length}）
                </Button>
                <Button
                  autoInsertSpace={false}
                  onClick={() => {
                    setSelectionMode(false)
                    setSelectedVariantIds([])
                  }}
                >
                  完成
                </Button>
              </>
            ) : (
              <Button
                aria-label="选择图片"
                autoInsertSpace={false}
                disabled={generating}
                icon={<CheckSquareOutlined />}
                onClick={() => setSelectionMode(true)}
              >
                选择图片
              </Button>
            )
          ) : null}
        </Space>
      </div>
      {candidates.length === 0 ? (
        <Empty description="还没有 Logo 初稿" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          {renderCandidateGroups(primaryGroups)}
          {rejectedCount > 0 ? (
            <Collapse
              items={[
                {
                  children: renderCandidateGroups(rejectedGroups),
                  key: 'not-recommended',
                  label: `查看不建议继续的结果（${rejectedCount}）`
                }
              ]}
            />
          ) : null}
        </>
      )}
      <Modal
        cancelText="取消"
        confirmLoading={deleting}
        okButtonProps={{ 'aria-label': '删除', danger: true, disabled: generating }}
        okText="删除"
        open={Boolean(deleteTargetId)}
        title="删除这次 Logo 生成？"
        onCancel={() => setDeleteTargetId(null)}
        onOk={deleteGeneration}
      >
        <Typography.Paragraph>
          删除后会移除这次生成的 Logo 图片和项目记录。用户添加的参考图不会被删除。
        </Typography.Paragraph>
      </Modal>
      <Modal
        cancelText="取消"
        confirmLoading={deleting}
        okButtonProps={{ 'aria-label': '删除', danger: true, disabled: generating }}
        okText="删除"
        open={batchDeleteOpen}
        title="删除所选图片？"
        onCancel={() => setBatchDeleteOpen(false)}
        onOk={deleteSelectedVariants}
      >
        <Typography.Paragraph>
          将删除已选择的 {selectedVariantIds.length} 张图片。仍被其他创作引用的图片文件会保留。
        </Typography.Paragraph>
      </Modal>
    </main>
  )
}
