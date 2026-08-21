import { DownloadOutlined, EditOutlined, StarOutlined } from '@ant-design/icons'
import { Button, Modal, Space, Typography } from 'antd'
import { assetProtocolUrl } from '../../../shared/assetProtocol'
import type { Asset, GenerationRecord } from '../../../shared/types'

interface ImagePreviewModalProps {
  generation: GenerationRecord | null
  variantIndex: number | null
  open: boolean
  onClose: () => void
  onContinueEdit: (asset: Asset) => void
  onExport: (assetId: string) => void
}

export function ImagePreviewModal({
  generation,
  variantIndex,
  open,
  onClose,
  onContinueEdit,
  onExport
}: ImagePreviewModalProps): React.JSX.Element {
  const variant = generation && variantIndex !== null ? generation.variants[variantIndex] : null

  return (
    <Modal
      centered
      classNames={{ container: 'preview-modal-container', body: 'preview-modal-content' }}
      footer={null}
      open={open}
      title="预览"
      width="min(1120px, calc(100vw - 32px))"
      onCancel={onClose}
    >
      {variant ? (
        <div className="preview-modal-body">
          <div className="preview-modal-canvas">
            <img
              className="preview-modal-image"
              alt={generation?.promptFinal ?? ''}
              src={assetProtocolUrl(variant.assetId)}
            />
          </div>
          <div className="preview-modal-details">
            <Typography.Paragraph className="preview-modal-prompt" copyable>
              {generation?.promptFinal}
            </Typography.Paragraph>
            <Space className="preview-modal-actions" size={[8, 8]} wrap>
              <Button icon={<EditOutlined />} onClick={() => onContinueEdit(variant.asset)}>
                继续修改
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => onExport(variant.assetId)}>
                导出
              </Button>
              <Button icon={<StarOutlined />}>收藏</Button>
            </Space>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
