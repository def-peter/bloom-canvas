import {
  CheckSquareOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Image,
  Modal,
  Skeleton,
  Space,
  Tooltip,
  Typography
} from 'antd'
import { useEffect, useState } from 'react'
import { assetProtocolUrl } from '../../../shared/assetProtocol'
import type { Asset, GenerationRecord } from '../../../shared/types'
import { summarizeGenerationError } from '../utils/generationStatus'
import { ImagePreviewModal } from './ImagePreviewModal'

interface GalleryPanelProps {
  generation: GenerationRecord | null
  generating: boolean
  onContinueEdit: (asset: Asset) => void
  onDeleteVariants: (variantIds: string[]) => Promise<void>
  onExport: (assetId: string) => void
  onRetry: (generationId: string) => void
}

export function GalleryPanel({
  generation,
  generating,
  onContinueEdit,
  onDeleteVariants,
  onExport,
  onRetry
}: GalleryPanelProps): React.JSX.Element {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setSelectionMode(false)
    setSelectedVariantIds([])
    setDeleteOpen(false)
  }, [generation?.id])

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
      setDeleteOpen(false)
      setSelectionMode(false)
      setSelectedVariantIds([])
    } catch {
      // AppShell owns error reporting; keep the selection for a retry.
    } finally {
      setDeleting(false)
    }
  }

  if (generating) {
    return (
      <main className="gallery-panel">
        <Skeleton active paragraph={{ rows: 8 }} />
      </main>
    )
  }

  if (!generation) {
    return (
      <main className="gallery-panel gallery-empty">
        <Empty description="写下提示词，开始生成第一张图" />
      </main>
    )
  }

  if (generation.status === 'failed') {
    return (
      <main className="gallery-panel">
        <div className="gallery-header">
          <div>
            <Typography.Title level={4}>生成失败</Typography.Title>
            <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
              {generation.promptFinal}
            </Typography.Paragraph>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => onRetry(generation.id)}>
            重新生成
          </Button>
        </div>
        <Alert
          showIcon
          description="这条记录没有生成图片。可以调整 Provider 设置后重新生成。"
          title={summarizeGenerationError(generation.errorMessage)}
          type="error"
        />
      </main>
    )
  }

  return (
    <main className="gallery-panel">
      <div className="gallery-header">
        <div>
          <Typography.Title level={4}>生成结果</Typography.Title>
          <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
            {generation.promptFinal}
          </Typography.Paragraph>
        </div>
        <div className="gallery-header-actions">
          {selectionMode ? (
            <Space wrap>
              <Typography.Text type="secondary">
                已选 {selectedVariantIds.length} 张
              </Typography.Text>
              <Button
                aria-label={
                  selectedVariantIds.length === generation.variants.length ? '取消全选' : '全选'
                }
                autoInsertSpace={false}
                onClick={() =>
                  setSelectedVariantIds(
                    selectedVariantIds.length === generation.variants.length
                      ? []
                      : generation.variants.map((variant) => variant.id)
                  )
                }
              >
                {selectedVariantIds.length === generation.variants.length ? '取消全选' : '全选'}
              </Button>
              <Button
                aria-label={`删除所选（${selectedVariantIds.length}）`}
                autoInsertSpace={false}
                danger
                disabled={selectedVariantIds.length === 0}
                icon={<DeleteOutlined />}
                onClick={() => setDeleteOpen(true)}
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
            </Space>
          ) : (
            <Space>
              <Button
                aria-label="选择图片"
                autoInsertSpace={false}
                icon={<CheckSquareOutlined />}
                onClick={() => setSelectionMode(true)}
              >
                选择图片
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => onRetry(generation.id)}>
                重新生成
              </Button>
            </Space>
          )}
        </div>
      </div>
      <div className="image-grid">
        {generation.variants.map((variant, index) => (
          <div
            className={`image-tile${selectedVariantIds.includes(variant.id) ? ' selected' : ''}`}
            key={variant.id}
          >
            <Image
              alt={generation.promptFinal}
              preview={false}
              src={assetProtocolUrl(variant.assetId)}
              onClick={() => (selectionMode ? toggleVariant(variant.id) : setPreviewIndex(index))}
            />
            {selectionMode ? (
              <Checkbox
                aria-label={`选择图片 ${index + 1}`}
                checked={selectedVariantIds.includes(variant.id)}
                className="image-selection-checkbox"
                onChange={() => toggleVariant(variant.id)}
              />
            ) : (
              <div className="tile-actions">
                <Tooltip title="继续修改">
                  <Button
                    aria-label="继续修改"
                    icon={<EditOutlined />}
                    shape="circle"
                    onClick={() => onContinueEdit(variant.asset)}
                  />
                </Tooltip>
                <Tooltip title="导出图片">
                  <Button
                    aria-label="导出图片"
                    icon={<DownloadOutlined />}
                    shape="circle"
                    onClick={() => onExport(variant.assetId)}
                  />
                </Tooltip>
              </div>
            )}
          </div>
        ))}
      </div>
      <ImagePreviewModal
        generation={generation}
        open={previewIndex !== null}
        variantIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onContinueEdit={onContinueEdit}
        onExport={onExport}
      />
      <Modal
        cancelText="取消"
        confirmLoading={deleting}
        okButtonProps={{ 'aria-label': '删除', danger: true }}
        okText="删除"
        open={deleteOpen}
        title="删除所选图片？"
        onCancel={() => setDeleteOpen(false)}
        onOk={deleteSelectedVariants}
      >
        <Typography.Paragraph>
          将删除已选择的 {selectedVariantIds.length} 张图片。仍被其他创作引用的图片文件会保留。
        </Typography.Paragraph>
      </Modal>
    </main>
  )
}
