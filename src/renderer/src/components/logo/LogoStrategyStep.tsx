import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Collapse,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import { useState } from 'react'
import type {
  LogoDesignRevision,
  LogoDesignStrategy,
  LogoRenderStyle,
  LogoStrategyPromptPack
} from '../../../../shared/logoDesign'

interface LogoStrategyStepProps {
  revision: LogoDesignRevision
  promptPack: LogoStrategyPromptPack
  loadingStrategyId: string | null
  onChangePrompt: (strategyId: string, finalPrompt: string) => void
  onChangeRenderStyle: (strategyId: string, style: LogoRenderStyle) => void
  onEditStrategy: (strategyId: string, patch: Partial<LogoDesignStrategy>) => void
  onReplaceStrategy: (strategyId: string) => void
  onGenerate: () => void
}

const renderStyleOptions: Array<{ label: string; value: LogoRenderStyle }> = [
  { label: '单色扁平', value: 'flat-monochrome' },
  { label: '双色扁平', value: 'flat-duotone' },
  { label: '克制渐变', value: 'restrained-gradient' },
  { label: '粗线轮廓', value: 'bold-outline' },
  { label: '2.5D 应用版', value: 'soft-2.5d' },
  { label: '柔和立体', value: 'soft-volume' },
  { label: '浮雕应用版', value: 'embossed' },
  { label: '拟物应用版', value: 'skeuomorphic' }
]

interface StrategyDraft {
  strategy: LogoDesignStrategy
  coreMetaphor: string
  construction: string
  silhouette: string
  exclusions: string
}

function isPromptPackCurrent(
  revision: LogoDesignRevision,
  promptPack: LogoStrategyPromptPack
): boolean {
  if (
    promptPack.sourceBriefVersion !== revision.briefVersion ||
    promptPack.sourceStrategyVersion !== revision.strategyVersion
  ) {
    return false
  }

  return revision.selectedStrategyIds.every((strategyId) => {
    const strategy = revision.strategies.find((item) => item.id === strategyId)
    const direction = promptPack.directions.find((item) => item.strategyId === strategyId)
    return Boolean(
      strategy &&
        direction &&
        direction.sourceBriefVersion === revision.briefVersion &&
        direction.sourceStrategyVersion === strategy.version
    )
  })
}

export function LogoStrategyStep({
  revision,
  promptPack,
  loadingStrategyId,
  onChangePrompt,
  onChangeRenderStyle,
  onEditStrategy,
  onReplaceStrategy,
  onGenerate
}: LogoStrategyStepProps): React.JSX.Element {
  const [draft, setDraft] = useState<StrategyDraft | null>(null)
  const promptCurrent = isPromptPackCurrent(revision, promptPack)
  const strategies = revision.strategies.filter((strategy) =>
    revision.selectedStrategyIds.includes(strategy.id)
  )

  function openEdit(strategy: LogoDesignStrategy): void {
    setDraft({
      strategy,
      coreMetaphor: strategy.coreMetaphor,
      construction: strategy.construction,
      silhouette: strategy.silhouette,
      exclusions: strategy.exclusions.join('，')
    })
  }

  function saveEdit(): void {
    if (!draft) return
    onEditStrategy(draft.strategy.id, {
      coreMetaphor: draft.coreMetaphor.trim(),
      construction: draft.construction.trim(),
      silhouette: draft.silhouette.trim(),
      exclusions: draft.exclusions
        .split(/[,，、\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    })
    setDraft(null)
  }

  return (
    <section className="logo-workflow-step logo-strategy-step">
      <div className="logo-step-heading">
        <Typography.Title level={4}>创意策略</Typography.Title>
        <Typography.Text type="secondary">
          三个方向使用不同构形机制，不靠换颜色伪装成不同方案。
        </Typography.Text>
      </div>
      {!promptCurrent ? (
        <Alert
          showIcon
          title="上游信息已变化，请重新确认提示词"
          type="warning"
        />
      ) : null}
      <div className="logo-strategy-grid">
        {strategies.map((strategy) => {
          const direction = promptPack.directions.find(
            (item) => item.strategyId === strategy.id
          )
          return (
            <article className="logo-strategy-card" key={strategy.id}>
              <div className="logo-strategy-card-header">
                <div>
                  <Typography.Title level={5}>{strategy.nameZh}</Typography.Title>
                  <Typography.Paragraph type="secondary">
                    {strategy.summaryZh}
                  </Typography.Paragraph>
                </div>
                <Space.Compact>
                  <Tooltip title="调整这个策略">
                    <Button
                      aria-label={`调整策略：${strategy.nameZh}`}
                      icon={<EditOutlined />}
                      onClick={() => openEdit(strategy)}
                    />
                  </Tooltip>
                  <Tooltip title="只替换这个策略">
                    <Button
                      aria-label={`替换策略：${strategy.nameZh}`}
                      icon={<ReloadOutlined />}
                      loading={loadingStrategyId === strategy.id}
                      onClick={() => onReplaceStrategy(strategy.id)}
                    />
                  </Tooltip>
                </Space.Compact>
              </div>
              <dl className="logo-strategy-facts">
                <div>
                  <dt>品牌依据</dt>
                  <dd>{strategy.brandEvidence.join('；')}</dd>
                </div>
                <div>
                  <dt>核心隐喻</dt>
                  <dd>{strategy.coreMetaphor}</dd>
                </div>
                <div>
                  <dt>构形方式</dt>
                  <dd>{strategy.construction}</dd>
                </div>
                <div>
                  <dt>预期轮廓</dt>
                  <dd>{strategy.silhouette}</dd>
                </div>
              </dl>
              <div className="logo-strategy-exclusions">
                {strategy.exclusions.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </div>
              <label className="logo-field-label" htmlFor={`render-style-${strategy.id}`}>
                表现风格
              </label>
              <Select
                id={`render-style-${strategy.id}`}
                options={renderStyleOptions}
                value={direction?.renderStyle ?? strategy.recommendedRenderStyles[0]}
                onChange={(value) => onChangeRenderStyle(strategy.id, value)}
              />
              {direction ? (
                <Collapse
                  ghost
                  items={[
                    {
                      key: 'prompt',
                      label: direction.customized ? '图片提示词 · 已自定义' : '图片提示词',
                      children: (
                        <Input.TextArea
                          aria-label={`图片提示词：${strategy.nameZh}`}
                          autoSize={{ minRows: 7, maxRows: 14 }}
                          value={direction.finalPrompt}
                          onChange={(event) =>
                            onChangePrompt(strategy.id, event.target.value)
                          }
                        />
                      )
                    }
                  ]}
                  size="small"
                />
              ) : null}
            </article>
          )
        })}
      </div>
      <Button
        block
        disabled={!promptCurrent || Boolean(loadingStrategyId)}
        size="large"
        type="primary"
        onClick={onGenerate}
      >
        生成 Logo 初稿
      </Button>
      <Modal
        cancelText="取消"
        okText="保存调整"
        open={Boolean(draft)}
        title={draft ? `调整策略：${draft.strategy.nameZh}` : '调整策略'}
        onCancel={() => setDraft(null)}
        onOk={saveEdit}
      >
        {draft ? (
          <div className="logo-strategy-edit-form">
            <label htmlFor="strategy-metaphor">核心隐喻</label>
            <Input.TextArea
              id="strategy-metaphor"
              value={draft.coreMetaphor}
              onChange={(event) => setDraft({ ...draft, coreMetaphor: event.target.value })}
            />
            <label htmlFor="strategy-construction">构形方式</label>
            <Input.TextArea
              id="strategy-construction"
              value={draft.construction}
              onChange={(event) => setDraft({ ...draft, construction: event.target.value })}
            />
            <label htmlFor="strategy-silhouette">预期轮廓</label>
            <Input.TextArea
              id="strategy-silhouette"
              value={draft.silhouette}
              onChange={(event) => setDraft({ ...draft, silhouette: event.target.value })}
            />
            <label htmlFor="strategy-exclusions">禁用元素</label>
            <Input.TextArea
              id="strategy-exclusions"
              value={draft.exclusions}
              onChange={(event) => setDraft({ ...draft, exclusions: event.target.value })}
            />
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
