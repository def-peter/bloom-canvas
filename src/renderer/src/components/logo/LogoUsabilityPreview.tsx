import { Alert, Image, Skeleton, Typography } from 'antd'
import { useEffect, useState } from 'react'
import type { LogoPreviewSet } from '../../../../shared/logoDesign'
import type { Asset } from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'

interface LogoUsabilityPreviewProps {
  asset: Asset
}

export function LogoUsabilityPreview({ asset }: LogoUsabilityPreviewProps): React.JSX.Element {
  const [state, setState] = useState<
    | { assetId: string; status: 'loading' }
    | { assetId: string; status: 'loaded'; preview: LogoPreviewSet }
    | { assetId: string; status: 'error'; message: string }
  >({ assetId: asset.id, status: 'loading' })

  useEffect(() => {
    let cancelled = false
    void bloomCanvasClient.logoPreview
      .get(asset.id)
      .then((preview) => {
        if (!cancelled) setState({ assetId: asset.id, status: 'loaded', preview })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            assetId: asset.id,
            status: 'error',
            message: error instanceof Error ? error.message : '加载 Logo 可用性预览失败'
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [asset.id])

  if (state.assetId !== asset.id || state.status === 'loading') {
    return (
      <div className="logo-usability-preview-loading">
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      </div>
    )
  }
  if (state.status === 'error') {
    return <Alert showIcon title={state.message} type="error" />
  }

  const { preview } = state
  const cells = [
    { alt: '白底预览', label: '白底', src: preview.whiteBackgroundDataUrl },
    { alt: '黑底预览', label: '黑底', src: preview.blackBackgroundDataUrl },
    { alt: '64px 预览', label: '64px', src: preview.size64DataUrl },
    { alt: '32px 预览', label: '32px', src: preview.size32DataUrl },
    { alt: '灰度预览', label: '灰度', src: preview.grayscaleDataUrl },
    { alt: '纯黑预览', label: '纯黑', src: preview.monochromeDataUrl },
    { alt: '反白预览', label: '反白', src: preview.inverseDataUrl }
  ]

  return (
    <div className="logo-usability-preview-content">
      {preview.localCheck.blank ? <Alert showIcon title="图片接近空白" type="error" /> : null}
      {preview.localCheck.lowContrast ? <Alert showIcon title="低对比度" type="warning" /> : null}
      <div className="logo-usability-preview">
        {cells.map((item) => (
          <div className="logo-check-cell" key={item.label}>
            <div className="logo-check-image">
              <Image alt={item.alt} preview={false} src={item.src} />
            </div>
            <Typography.Text type="secondary">{item.label}</Typography.Text>
          </div>
        ))}
      </div>
    </div>
  )
}
