import { Image, Typography } from 'antd'
import { assetProtocolUrl } from '../../../../shared/assetProtocol'
import type { Asset } from '../../../../shared/types'

interface LogoUsabilityPreviewProps {
  asset: Asset
}

export function LogoUsabilityPreview({ asset }: LogoUsabilityPreviewProps): React.JSX.Element {
  const src = assetProtocolUrl(asset.id)

  return (
    <div className="logo-usability-preview">
      {[
        { label: '白底', className: 'logo-check-white', size: 96 },
        { label: '黑底', className: 'logo-check-black', size: 96 },
        { label: '64px', className: 'logo-check-white', size: 64 },
        { label: '32px', className: 'logo-check-white', size: 32 }
      ].map((item) => (
        <div className="logo-check-cell" key={item.label}>
          <div className={item.className}>
            <Image
              alt={item.label}
              preview={false}
              src={src}
              style={{ height: item.size, objectFit: 'contain', width: item.size }}
            />
          </div>
          <Typography.Text type="secondary">{item.label}</Typography.Text>
        </div>
      ))}
    </div>
  )
}
