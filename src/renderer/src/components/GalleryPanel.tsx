import { DownloadOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Empty, Image, Skeleton, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { assetProtocolUrl } from '../../../shared/assetProtocol'
import type { Asset, GenerationRecord } from '../../../shared/types'
import { ImagePreviewModal } from './ImagePreviewModal'

interface GalleryPanelProps {
  generation: GenerationRecord | null
  generating: boolean
  onContinueEdit: (asset: Asset) => void
  onExport: (assetId: string) => void
  onRetry: (generationId: string) => void
}

export function GalleryPanel({
  generation,
  generating,
  onContinueEdit,
  onExport,
  onRetry
}: GalleryPanelProps): React.JSX.Element {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

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

  return (
    <main className="gallery-panel">
      <div className="gallery-header">
        <div>
          <Typography.Title level={4}>生成结果</Typography.Title>
          <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
            {generation.promptFinal}
          </Typography.Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => onRetry(generation.id)}>
          重新生成
        </Button>
      </div>
      <div className="image-grid">
        {generation.variants.map((variant, index) => (
          <div className="image-tile" key={variant.id}>
            <Image
              alt={generation.promptFinal}
              preview={false}
              src={assetProtocolUrl(variant.assetId)}
              onClick={() => setPreviewIndex(index)}
            />
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
    </main>
  )
}
