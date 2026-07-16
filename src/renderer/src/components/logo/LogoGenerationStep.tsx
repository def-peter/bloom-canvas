import { Alert, Button, Progress, Segmented, Space, Typography } from 'antd'
import type { Asset, GenerationRecord, LogoGenerationMode } from '../../../../shared/types'
import type { LogoBatchItem } from './logoGenerationBatch'
import { LogoResultsPanel } from './LogoResultsPanel'

interface LogoGenerationStepProps {
  mode: LogoGenerationMode
  generating: boolean
  items: LogoBatchItem[]
  generations: GenerationRecord[]
  projectId: string
  onModeChange: (mode: LogoGenerationMode) => void
  onGenerate: (input: { candidatesPerStrategy: 1 | 2 }) => void
  onRetryItem: (item: LogoBatchItem) => void
  onSelectCandidate: (asset: Asset) => void
  onDelete: (generationId: string) => Promise<void>
  onDeleteVariants: (variantIds: string[]) => Promise<void>
  onExport: (assetId: string) => Promise<void>
  onRetryGeneration: (generationId: string) => Promise<void>
}

export function LogoGenerationStep({
  mode,
  generating,
  items,
  generations,
  projectId,
  onModeChange,
  onGenerate,
  onRetryItem,
  onSelectCandidate,
  onDelete,
  onDeleteVariants,
  onExport,
  onRetryGeneration
}: LogoGenerationStepProps): React.JSX.Element {
  const candidatesPerStrategy = mode === 'quality-first' ? 2 : 1
  const candidateCount = candidatesPerStrategy * 3
  const strategyGroups = Array.from(
    items.reduce<Map<string, LogoBatchItem[]>>((groups, item) => {
      groups.set(item.strategyId, [...(groups.get(item.strategyId) ?? []), item])
      return groups
    }, new Map())
  )

  return (
    <section className="logo-workflow-step logo-generation-step">
      <div className="logo-step-heading">
        <Typography.Title level={4}>生成与筛选</Typography.Title>
        <Typography.Text type="secondary">
          每个策略独立生成，成功结果会立即保留。
        </Typography.Text>
      </div>
      <div className="logo-generation-controls">
        <Segmented
          block
          options={[
            { label: '质量优先 · 6 张', value: 'quality-first' },
            { label: '省钱 · 3 张', value: 'economy' }
          ]}
          value={mode}
          onChange={(value) => onModeChange(value as LogoGenerationMode)}
        />
        <Typography.Text type="secondary">预计生成 {candidateCount} 张候选图</Typography.Text>
        <Button
          block
          disabled={generating}
          loading={generating}
          size="large"
          type="primary"
          onClick={() => onGenerate({ candidatesPerStrategy })}
        >
          生成 {candidateCount} 张 Logo 初稿
        </Button>
      </div>
      {strategyGroups.length > 0 ? (
        <div className="logo-generation-progress-list">
          {strategyGroups.map(([strategyId, strategyItems]) => {
            const completed = strategyItems.filter((item) =>
              ['succeeded', 'failed'].includes(item.status)
            ).length
            const failed = strategyItems.filter((item) => item.status === 'failed')
            return (
              <div className="logo-generation-progress" key={strategyId}>
                <div className="logo-generation-progress-header">
                  <Typography.Text strong>{strategyItems[0]?.strategyNameZh}</Typography.Text>
                  <Typography.Text type="secondary">
                    {completed}/{strategyItems.length}
                  </Typography.Text>
                </div>
                <Progress
                  percent={Math.round((completed / strategyItems.length) * 100)}
                  showInfo={false}
                  size="small"
                  status={failed.length > 0 && completed === strategyItems.length ? 'exception' : undefined}
                />
                {failed.map((item) => (
                  <Alert
                    action={
                      <Button size="small" onClick={() => onRetryItem(item)}>
                        只重试此项
                      </Button>
                    }
                    key={item.key}
                    title={item.errorMessage ?? 'Logo 生成失败'}
                    type="error"
                  />
                ))}
              </div>
            )
          })}
        </div>
      ) : null}
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <LogoResultsPanel
          generating={generating}
          generations={generations}
          selectedProjectId={projectId}
          onContinueEdit={onSelectCandidate}
          onDelete={onDelete}
          onDeleteVariants={onDeleteVariants}
          onExport={onExport}
          onRetry={onRetryGeneration}
        />
      </Space>
    </section>
  )
}
