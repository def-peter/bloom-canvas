import {
  BgColorsOutlined,
  ColumnWidthOutlined,
  DownloadOutlined,
  FontSizeOutlined,
  HighlightOutlined
} from '@ant-design/icons'
import { Alert, Button, Image, Input, Select, Space, Switch, Typography } from 'antd'
import { useState } from 'react'
import { assetProtocolUrl, thumbnailProtocolUrl } from '../../../../shared/assetProtocol'
import type {
  LogoGenerationMetadataV2,
  LogoProject,
  ProviderConfig,
  AppSettings,
  GenerationRecord
} from '../../../../shared/types'
import type { LogoRefinementOperation, LogoRenderStyle } from '../../../../shared/logoDesign'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { LogoUsabilityPreview } from './LogoUsabilityPreview'

type Candidate = GenerationRecord['variants'][number]

interface LogoRefinementPanelProps {
  activeProvider: ProviderConfig | null
  candidate: Candidate
  generations: GenerationRecord[]
  project: LogoProject
  settings: AppSettings | null
  onCreated: (record: GenerationRecord) => Promise<void>
  onError: (error: string | null) => void
  onExport: (assetId: string) => Promise<void>
  onGeneratingChange: (generating: boolean) => void
  onNeedProvider: () => void
  onSelectCandidate: (candidate: Candidate) => Promise<void> | void
}

interface VersionEntry {
  candidate: Candidate
  generation: GenerationRecord
  metadata: LogoGenerationMetadataV2
}

const renderStyleOptions: Array<{ label: string; value: LogoRenderStyle }> = [
  { label: '单色扁平', value: 'flat-monochrome' },
  { label: '双色扁平', value: 'flat-duotone' },
  { label: '克制渐变', value: 'restrained-gradient' },
  { label: '粗线轮廓', value: 'bold-outline' },
  { label: '2.5D 应用版', value: 'soft-2.5d' },
  { label: '柔和立体', value: 'soft-volume' },
  { label: '浮雕应用版', value: 'embossed' }
]

function allVersionEntries(generations: GenerationRecord[]): VersionEntry[] {
  return generations.flatMap((generation) => {
    const metadata = generation.scenarioMetadata
    if (metadata?.version !== 2) return []
    return generation.variants.map((candidate) => ({ candidate, generation, metadata }))
  })
}

function versionHistory(generations: GenerationRecord[], selectedId: string): VersionEntry[] {
  const entries = allVersionEntries(generations)
  const byId = new Map(entries.map((entry) => [entry.candidate.id, entry]))
  let root = byId.get(selectedId)
  if (!root) return []
  const seen = new Set<string>()
  while (root.metadata.parentVariantId && !seen.has(root.candidate.id)) {
    seen.add(root.candidate.id)
    const parent = byId.get(root.metadata.parentVariantId)
    if (!parent) break
    root = parent
  }
  const ordered: VersionEntry[] = []
  const visit = (entry: VersionEntry): void => {
    ordered.push(entry)
    entries
      .filter((candidate) => candidate.metadata.parentVariantId === entry.candidate.id)
      .sort((left, right) => left.generation.createdAt.localeCompare(right.generation.createdAt))
      .forEach(visit)
  }
  visit(root)
  return ordered
}

function sourceEntry(generations: GenerationRecord[], candidateId: string): VersionEntry | null {
  return allVersionEntries(generations).find((entry) => entry.candidate.id === candidateId) ?? null
}

function nextCandidateIndex(generations: GenerationRecord[], source: VersionEntry): number {
  const strategyIndexes = allVersionEntries(generations)
    .filter(
      (entry) =>
        entry.generation.projectId === source.generation.projectId &&
        entry.metadata.strategyId === source.metadata.strategyId
    )
    .map((entry) => entry.metadata.candidateIndex)
  return Math.max(-1, ...strategyIndexes) + 1
}

export function LogoRefinementPanel({
  activeProvider,
  candidate,
  generations,
  project,
  settings,
  onCreated,
  onError,
  onExport,
  onGeneratingChange,
  onNeedProvider,
  onSelectCandidate
}: LogoRefinementPanelProps): React.JSX.Element {
  const source = sourceEntry(generations, candidate.id)
  const [preserveStructure, setPreserveStructure] = useState(true)
  const [instruction, setInstruction] = useState('')
  const [renderStyle, setRenderStyle] = useState<LogoRenderStyle>(
    source?.metadata.promptDirectionSnapshot.renderStyle ?? 'flat-monochrome'
  )
  const [generating, setGenerating] = useState(false)
  const history = versionHistory(generations, candidate.id)

  async function generate(operation: LogoRefinementOperation): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      onNeedProvider()
      return
    }
    if (!source || source.generation.projectId !== project.id) {
      onError('选中的 Logo 版本缺少可用的 V2 生成记录')
      return
    }
    const strategy = source.metadata.designRevisionSnapshot.strategies.find(
      (item) => item.id === source.metadata.strategyId
    )
    if (!strategy) {
      onError('选中的 Logo 版本缺少对应设计策略')
      return
    }

    setGenerating(true)
    onGeneratingChange(true)
    try {
      const mode = preserveStructure ? 'preserve-structure' : 'explore'
      const prompt = await bloomCanvasClient.logoPrompt.buildRefinement({
        brief: source.metadata.briefSnapshot,
        strategy,
        sourcePrompt: source.metadata.promptDirectionSnapshot,
        mode,
        operation,
        instruction,
        renderStyle
      })
      const record = await bloomCanvasClient.generations.create({
        providerId: activeProvider.id,
        prompt,
        useOptimizedPrompt: false,
        referenceAssetIds: [candidate.asset.id],
        parameters: {
          size: settings?.defaultSize ?? '1024x1024',
          count: 1,
          quality: settings?.defaultQuality ?? 'hd',
          outputFormat: settings?.defaultOutputFormat ?? 'png'
        },
        scenario: 'logo-design',
        projectId: project.id,
        scenarioMetadata: {
          ...source.metadata,
          candidateIndex: nextCandidateIndex(generations, source),
          parentVariantId: candidate.id,
          refinementMode: mode,
          refinementOperation: operation,
          promptDirectionSnapshot: {
            ...source.metadata.promptDirectionSnapshot,
            customized: true,
            finalPrompt: prompt
          }
        }
      })
      if (record.status !== 'succeeded' || !record.variants[0]) {
        throw new Error(record.errorMessage ?? 'Logo 修改版本生成失败')
      }
      await onCreated(record)
      await onSelectCandidate(record.variants[0])
      setInstruction('')
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Logo 修改版本生成失败')
    } finally {
      setGenerating(false)
      onGeneratingChange(false)
    }
  }

  if (!source) {
    return <Alert showIcon title="当前候选缺少可修改的生成记录，请重新选择" type="warning" />
  }

  const logoType = source.metadata.logoType
  const textDraft =
    logoType === 'wordmark' ||
    ['add-brand-name', 'horizontal-lockup'].includes(source.metadata.refinementOperation ?? '')

  return (
    <section className="logo-workflow-step logo-refinement-panel">
      <div className="logo-step-heading">
        <Typography.Title level={4}>修改与导出</Typography.Title>
      </div>
      <div className="logo-refinement-layout">
        <div className="logo-refinement-preview">
          <Image alt="当前 Logo 版本" preview src={assetProtocolUrl(candidate.asset.id)} />
          <LogoUsabilityPreview asset={candidate.asset} />
          {textDraft ? <Alert showIcon title="AI 文字组合为光栅设计草案" type="info" /> : null}
        </div>
        <div className="logo-refinement-controls">
          <label className="logo-switch-field">
            <span>保持结构</span>
            <Switch
              aria-label="保持结构"
              checked={preserveStructure}
              onChange={setPreserveStructure}
            />
          </label>
          <label className="logo-field-label" htmlFor="logo-refinement-instruction">
            修改要求
          </label>
          <Input.TextArea
            id="logo-refinement-instruction"
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="例如：改成蓝色，转角更圆润"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
          <label className="logo-field-label" htmlFor="logo-refinement-style">
            表现风格
          </label>
          <Select
            id="logo-refinement-style"
            options={renderStyleOptions}
            value={renderStyle}
            onChange={setRenderStyle}
          />
          <Button
            block
            loading={generating}
            size="large"
            type="primary"
            onClick={() => void generate('custom')}
          >
            生成修改版本
          </Button>
          <div className="logo-refinement-secondary-actions">
            {logoType === 'combination-mark' || logoType === 'emblem' ? (
              <Button
                aria-label={logoType === 'emblem' ? '增加徽章文字' : '增加品牌文字'}
                icon={<FontSizeOutlined />}
                onClick={() => void generate('add-brand-name')}
              >
                {logoType === 'emblem' ? '增加徽章文字' : '增加品牌文字'}
              </Button>
            ) : null}
            {logoType !== 'symbol-mark' ? (
              <Button
                aria-label="生成横版组合"
                icon={<ColumnWidthOutlined />}
                onClick={() => void generate('horizontal-lockup')}
              >
                生成横版组合
              </Button>
            ) : null}
            <Button
              aria-label="生成应用版本"
              icon={<BgColorsOutlined />}
              onClick={() => void generate('application-style')}
            >
              生成应用版本
            </Button>
            <Button
              aria-label="生成黑白版本"
              icon={<HighlightOutlined />}
              onClick={() => void generate('monochrome')}
            >
              生成黑白版本
            </Button>
          </div>
          <Button icon={<DownloadOutlined />} onClick={() => void onExport(candidate.asset.id)}>
            导出当前版本
          </Button>
        </div>
      </div>
      <div className="logo-version-history">
        <Typography.Text strong>版本历史</Typography.Text>
        <Space wrap>
          {history.map((entry, index) => (
            <button
              aria-label={index === 0 ? '选择原始候选' : `选择修改版本 ${index}`}
              className={
                entry.candidate.id === candidate.id
                  ? 'logo-version-item selected'
                  : 'logo-version-item'
              }
              key={entry.candidate.id}
              type="button"
              onClick={() => void onSelectCandidate(entry.candidate)}
            >
              <img alt="" src={thumbnailProtocolUrl(entry.candidate.asset.id)} />
              <span>{index === 0 ? '原始候选' : `修改版本 ${index}`}</span>
            </button>
          ))}
        </Space>
      </div>
    </section>
  )
}
