import { Button, Collapse, Empty, Image, Spin, Typography } from 'antd'
import { assetProtocolUrl } from '../../../../shared/assetProtocol'
import type { Asset, GenerationRecord } from '../../../../shared/types'
import { LogoUsabilityPreview } from './LogoUsabilityPreview'

interface LogoResultsPanelProps {
  generating: boolean
  generations: GenerationRecord[]
  selectedProjectId: string | null
  onContinueEdit: (asset: Asset) => void
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
  onExport,
  onRetry
}: LogoResultsPanelProps): React.JSX.Element {
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

  return (
    <main className="gallery-panel logo-results-panel">
      <div className="panel-header">
        <Typography.Text strong>Logo 结果</Typography.Text>
        {generating ? <Spin size="small" /> : null}
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
                    <article className="result-card" key={variant.id}>
                      <Image
                        alt={`${directionName} 方案 ${variant.index + 1}`}
                        src={assetProtocolUrl(variant.asset.id)}
                      />
                      <div className="result-actions">
                        <Button size="small" onClick={() => onContinueEdit(variant.asset)}>
                          继续修改
                        </Button>
                        <Button size="small" onClick={() => void onExport(variant.asset.id)}>
                          导出
                        </Button>
                        <Button size="small" onClick={() => void onRetry(generation.id)}>
                          重新生成
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
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
