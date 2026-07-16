import { Button, Empty, Image, Space, Typography } from 'antd'
import { assetProtocolUrl } from '../../../../shared/assetProtocol'
import type { GenerationRecord } from '../../../../shared/types'

type Candidate = GenerationRecord['variants'][number]

interface LogoQuickRefinementStepProps {
  candidate: Candidate | null
  onContinueEdit: (candidate: Candidate) => void
  onExport: (assetId: string) => Promise<void>
}

export function LogoQuickRefinementStep({
  candidate,
  onContinueEdit,
  onExport
}: LogoQuickRefinementStepProps): React.JSX.Element {
  if (!candidate) {
    return <Empty description="请先在上一步选择一个候选" />
  }

  return (
    <section className="logo-workflow-step logo-quick-refinement-step">
      <div className="logo-step-heading">
        <Typography.Title level={4}>修改与导出</Typography.Title>
      </div>
      <Image alt="选中的 Logo 候选" preview src={assetProtocolUrl(candidate.asset.id)} />
      <Space wrap>
        <Button type="primary" onClick={() => onContinueEdit(candidate)}>
          继续修改
        </Button>
        <Button onClick={() => void onExport(candidate.asset.id)}>导出</Button>
      </Space>
    </section>
  )
}
