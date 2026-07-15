import { CheckSquareOutlined, DeleteOutlined } from '@ant-design/icons'
import { Button, Checkbox, Collapse, Empty, Image, Modal, Space, Spin, Typography } from 'antd'
import { useState } from 'react'
import { assetProtocolUrl } from '../../../../shared/assetProtocol'
import type { Asset, GenerationRecord } from '../../../../shared/types'
import { LogoUsabilityPreview } from './LogoUsabilityPreview'

interface LogoResultsPanelProps {
  generating: boolean
  generations: GenerationRecord[]
  selectedProjectId: string | null
  onContinueEdit: (asset: Asset) => void
  onDelete: (generationId: string) => Promise<void>
  onDeleteVariants: (variantIds: string[]) => Promise<void>
  onExport: (assetId: string) => Promise<void>
  onRetry: (generationId: string) => Promise<void>
}

function groupByDirection(generations: GenerationRecord[]): Record<string, GenerationRecord[]> {
  return generations.reduce<Record<string, GenerationRecord[]>>((groups, generation) => {
    const key = generation.scenarioMetadata?.styleDirectionName ?? '未分类方向'
    groups[key] = [...(groups[key] ?? []), generation]
    return groups
  }, {})
}

export function LogoResultsPanel({
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
  const groups = groupByDirection(projectGenerations)
  const entries = Object.entries(groups)
  const allVariantIds = projectGenerations.flatMap((generation) =>
    generation.variants.map((variant) => variant.id)
  )

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
                  disabled={selectedVariantIds.length === 0}
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
                icon={<CheckSquareOutlined />}
                onClick={() => setSelectionMode(true)}
              >
                选择图片
              </Button>
            )
          ) : null}
        </Space>
      </div>
      {entries.length === 0 ? (
        <Empty description="还没有 Logo 初稿" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="logo-direction-groups">
          {entries.map(([directionName, directionGenerations]) => (
            <section className="logo-direction-group" key={directionName}>
              <div className="logo-direction-header">
                <Typography.Text strong>{directionName}</Typography.Text>
                <Typography.Text type="secondary">
                  {directionGenerations.length} 次生成
                </Typography.Text>
              </div>
              <div className="result-grid">
                {directionGenerations.flatMap((generation) =>
                  generation.variants.map((variant) => (
                    <article
                      className={`result-card${selectedVariantIds.includes(variant.id) ? ' selected' : ''}`}
                      key={variant.id}
                    >
                      <Image
                        alt={`${directionName} 方案 ${variant.index + 1}`}
                        preview={!selectionMode}
                        src={assetProtocolUrl(variant.asset.id)}
                        onClick={() => {
                          if (selectionMode) toggleVariant(variant.id)
                        }}
                      />
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
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
      <Modal
        cancelText="取消"
        confirmLoading={deleting}
        okButtonProps={{ 'aria-label': '删除', danger: true }}
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
        okButtonProps={{ 'aria-label': '删除', danger: true }}
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
