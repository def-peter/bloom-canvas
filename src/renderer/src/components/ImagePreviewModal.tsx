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
    <Modal centered footer={null} open={open} title="预览" width="80vw" onCancel={onClose}>
      {variant ? (
        <div className="preview-modal-body">
          <img alt={generation?.promptFinal ?? ''} src={assetProtocolUrl(variant.assetId)} />
          <Space orientation="vertical" size={12}>
            <Typography.Paragraph copyable>{generation?.promptFinal}</Typography.Paragraph>
            <Space>
              <Button icon={<EditOutlined />} onClick={() => onContinueEdit(variant.asset)}>
                继续修改
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => onExport(variant.assetId)}>
                导出
              </Button>
              <Button icon={<StarOutlined />}>收藏</Button>
            </Space>
          </Space>
        </div>
      ) : null}
    </Modal>
  )
}
