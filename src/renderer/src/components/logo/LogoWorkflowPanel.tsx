import { Alert, Steps } from 'antd'
import { useMemo, useState } from 'react'
import type {
  LogoBrandBriefV2,
  LogoCandidateReview,
  LogoDesignRevision,
  LogoDesignStrategy,
  LogoRenderStyle,
  LogoStrategyPromptPack,
  LogoWorkflowStep
} from '../../../../shared/logoDesign'
import type {
  AppSettings,
  Asset,
  GenerationRecord,
  LogoGenerationMetadataV2,
  LogoGenerationMode,
  LogoProject,
  ProviderConfig,
  SaveLogoProjectInput
} from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { LogoBriefStep } from './LogoBriefStep'
import { LogoGenerationStep } from './LogoGenerationStep'
import { LogoQuickRefinementStep } from './LogoQuickRefinementStep'
import { LogoStrategyStep } from './LogoStrategyStep'
import {
  briefToProjectInput,
  briefValuesToV2,
  mergeRecompiledPromptPack,
  projectToBriefValues,
  type LogoBriefFormValues
} from './logoFormUtils'
import { runLogoGenerationBatch, type LogoBatchItem } from './logoGenerationBatch'
import { buildQualityRetryPrompt, shouldAutoRetryQuality } from './logoQualityRetry'

interface LogoWorkflowPanelProps {
  activeProvider: ProviderConfig | null
  generations: GenerationRecord[]
  project: LogoProject | null
  referenceAssets?: Asset[]
  settings: AppSettings | null
  onCreated: (record: GenerationRecord) => Promise<void>
  onContinueEdit: (asset: Asset) => void
  onDelete: (generationId: string) => Promise<void>
  onDeleteVariants: (variantIds: string[]) => Promise<void>
  onError: (error: string | null) => void
  onExport: (assetId: string) => Promise<void>
  onGeneratingChange: (generating: boolean) => void
  onNeedProvider: () => void
  onProjectSaved: (project: LogoProject) => Promise<void> | void
  onReferenceAssetsChange?: (assets: Asset[]) => void
  onRetry: (generationId: string) => Promise<void>
}

const workflowSteps: LogoWorkflowStep[] = ['brief', 'strategy', 'generation', 'refinement']

function stepIndex(step: LogoWorkflowStep | undefined): number {
  const index = workflowSteps.indexOf(step ?? 'brief')
  return index < 0 ? 0 : index
}

function briefFromProject(project: LogoProject): LogoBrandBriefV2 {
  return briefValuesToV2(projectToBriefValues(project))
}

export function LogoWorkflowPanel({
  activeProvider,
  generations,
  project,
  referenceAssets = [],
  settings,
  onCreated,
  onContinueEdit,
  onDelete,
  onDeleteVariants,
  onError,
  onExport,
  onGeneratingChange,
  onNeedProvider,
  onProjectSaved,
  onReferenceAssetsChange,
  onRetry
}: LogoWorkflowPanelProps): React.JSX.Element {
  const [workingProject, setWorkingProject] = useState<LogoProject | null>(project)
  const [currentStep, setCurrentStep] = useState(stepIndex(project?.workflowStep))
  const [buildingStrategies, setBuildingStrategies] = useState(false)
  const [loadingStrategyId, setLoadingStrategyId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [qualityRetrying, setQualityRetrying] = useState(false)
  const [batchItems, setBatchItems] = useState<LogoBatchItem[]>([])

  const selectedCandidate = useMemo(() => {
    const selectedId = workingProject?.selectedCandidateId
    if (!selectedId) return null
    return (
      generations
        .flatMap((generation) => generation.variants)
        .find((variant) => variant.id === selectedId) ?? null
    )
  }, [generations, workingProject?.selectedCandidateId])

  async function saveProject(input: SaveLogoProjectInput): Promise<LogoProject> {
    const saved = await bloomCanvasClient.logoProjects.save(input)
    setWorkingProject(saved)
    await onProjectSaved(saved)
    return saved
  }

  async function createStrategies(values: LogoBriefFormValues): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      onNeedProvider()
      return
    }
    setBuildingStrategies(true)
    try {
      const brief = briefValuesToV2(values)
      const savedBrief = await saveProject({
        ...briefToProjectInput(brief, workingProject),
        referenceImageIds: referenceAssets.map((asset) => asset.id),
        workflowStep: 'brief'
      })
      const revision = await bloomCanvasClient.logoStrategy.generate({
        providerId: activeProvider.id,
        briefVersion: savedBrief.briefVersion ?? 1,
        brief
      })
      const promptPack = await bloomCanvasClient.logoPrompt.buildStrategy({
        brief,
        revision,
        promptVersion: savedBrief.promptVersion ?? 1
      })
      await saveProject({
        ...savedBrief,
        designRevision: revision,
        strategyPromptPack: promptPack,
        workflowStep: 'strategy'
      })
      setCurrentStep(1)
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : '生成创意策略失败')
    } finally {
      setBuildingStrategies(false)
    }
  }

  async function rebuildPrompts(
    nextRevision: LogoDesignRevision,
    changedStrategyIds: string[],
    renderStyles?: Partial<Record<string, LogoRenderStyle>>
  ): Promise<void> {
    if (!workingProject?.strategyPromptPack) return
    const rebuilt = await bloomCanvasClient.logoPrompt.buildStrategy({
      brief: briefFromProject(workingProject),
      revision: nextRevision,
      promptVersion: workingProject.promptVersion ?? 1,
      renderStyles
    })
    const merged = mergeRecompiledPromptPack(
      workingProject.strategyPromptPack,
      rebuilt,
      changedStrategyIds
    )
    await saveProject({
      ...workingProject,
      designRevision: nextRevision,
      strategyPromptPack: merged,
      workflowStep: 'strategy'
    })
  }

  function changePrompt(strategyId: string, finalPrompt: string): void {
    if (!workingProject?.strategyPromptPack) return
    const strategyPromptPack: LogoStrategyPromptPack = {
      ...workingProject.strategyPromptPack,
      directions: workingProject.strategyPromptPack.directions.map((direction) =>
        direction.strategyId === strategyId
          ? { ...direction, customized: true, finalPrompt }
          : direction
      )
    }
    setWorkingProject({ ...workingProject, strategyPromptPack })
    void saveProject({ ...workingProject, strategyPromptPack, workflowStep: 'strategy' }).catch(
      (error) => onError(error instanceof Error ? error.message : '保存提示词失败')
    )
  }

  function changeRenderStyle(strategyId: string, style: LogoRenderStyle): void {
    if (!workingProject?.designRevision || !workingProject.strategyPromptPack) return
    const renderStyles = Object.fromEntries(
      workingProject.strategyPromptPack.directions.map((direction) => [
        direction.strategyId,
        direction.strategyId === strategyId ? style : direction.renderStyle
      ])
    )
    setLoadingStrategyId(strategyId)
    void rebuildPrompts(workingProject.designRevision, [strategyId], renderStyles)
      .catch((error) => onError(error instanceof Error ? error.message : '更新表现风格失败'))
      .finally(() => setLoadingStrategyId(null))
  }

  function editStrategy(strategyId: string, patch: Partial<LogoDesignStrategy>): void {
    if (!workingProject?.designRevision) return
    const revision: LogoDesignRevision = {
      ...workingProject.designRevision,
      strategyVersion: workingProject.designRevision.strategyVersion + 1,
      strategies: workingProject.designRevision.strategies.map((strategy) =>
        strategy.id === strategyId
          ? { ...strategy, ...patch, version: strategy.version + 1 }
          : strategy
      )
    }
    setLoadingStrategyId(strategyId)
    void rebuildPrompts(revision, [strategyId])
      .catch((error) => onError(error instanceof Error ? error.message : '调整策略失败'))
      .finally(() => setLoadingStrategyId(null))
  }

  function replaceStrategy(strategyId: string): void {
    if (!activeProvider?.hasApiKey || !workingProject?.designRevision) {
      onNeedProvider()
      return
    }
    setLoadingStrategyId(strategyId)
    void bloomCanvasClient.logoStrategy
      .generate({
        providerId: activeProvider.id,
        briefVersion: workingProject.briefVersion ?? 1,
        brief: briefFromProject(workingProject),
        existingRevision: workingProject.designRevision,
        replaceStrategyId: strategyId
      })
      .then((revision) => rebuildPrompts(revision, [strategyId]))
      .catch((error) => onError(error instanceof Error ? error.message : '替换策略失败'))
      .finally(() => setLoadingStrategyId(null))
  }

  async function createCandidate(
    savedProject: LogoProject,
    strategy: LogoDesignStrategy,
    candidateIndex: number,
    retryAttempt: 0 | 1 = 0,
    promptOverride?: string
  ): Promise<GenerationRecord> {
    if (!activeProvider || !savedProject.designRevision || !savedProject.strategyPromptPack) {
      throw new Error('Logo 策略尚未准备完成')
    }
    const direction = savedProject.strategyPromptPack.directions.find(
      (item) => item.strategyId === strategy.id
    )
    if (!direction) throw new Error(`缺少策略“${strategy.nameZh}”的提示词`)
    const promptDirectionSnapshot = promptOverride
      ? { ...direction, customized: true, finalPrompt: promptOverride }
      : direction
    const record = await bloomCanvasClient.generations.create({
      providerId: activeProvider.id,
      prompt: promptDirectionSnapshot.finalPrompt,
      useOptimizedPrompt: false,
      referenceAssetIds: savedProject.referenceImageIds,
      parameters: {
        size: settings?.defaultSize ?? '1024x1024',
        count: 1,
        quality: settings?.defaultQuality ?? 'hd',
        outputFormat: settings?.defaultOutputFormat ?? 'png'
      },
      scenario: 'logo-design',
      projectId: savedProject.id,
      scenarioMetadata: {
        version: 2,
        logoProjectId: savedProject.id,
        strategyId: strategy.id,
        strategyNameZh: strategy.nameZh,
        grammarId: strategy.grammarId,
        candidateIndex,
        logoType: savedProject.logoTypes[0],
        designRevisionSnapshot: savedProject.designRevision,
        promptDirectionSnapshot,
        briefSnapshot: briefFromProject(savedProject),
        qualityRulesVersion: 2,
        qualityRetryAttempt: retryAttempt
      }
    })
    if (record.status === 'succeeded') await onCreated(record)
    return record
  }

  function mergeReview(review: LogoCandidateReview): void {
    setWorkingProject((current) =>
      current
        ? {
            ...current,
            candidateReviews: {
              ...(current.candidateReviews ?? {}),
              [review.candidateId]: review
            }
          }
        : current
    )
  }

  async function reviewRecord(
    savedProject: LogoProject,
    record: GenerationRecord
  ): Promise<LogoCandidateReview[]> {
    if (!activeProvider) return []
    return Promise.all(
      record.variants.map(async (variant) => {
        let review: LogoCandidateReview
        try {
          review = await bloomCanvasClient.logoReview.run({
            providerId: activeProvider.id,
            projectId: savedProject.id,
            variantId: variant.id,
            useVision: savedProject.aiReviewEnabled ?? true
          })
        } catch {
          review = {
            candidateId: variant.id,
            status: 'unreviewed',
            reviewMode: 'local-only',
            hardFailures: [],
            risksZh: [],
            unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
          }
        }
        mergeReview(review)
        return review
      })
    )
  }

  async function generate(input: { candidatesPerStrategy: 1 | 2 }): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      onNeedProvider()
      return
    }
    if (!workingProject?.designRevision || !workingProject.strategyPromptPack) return
    setGenerating(true)
    onGeneratingChange(true)
    setCurrentStep(2)
    try {
      const savedProject = await saveProject({
        ...workingProject,
        generationMode: input.candidatesPerStrategy === 2 ? 'quality-first' : 'economy',
        workflowStep: 'generation'
      })
      const strategies = savedProject.designRevision?.strategies.filter((strategy) =>
        savedProject.designRevision?.selectedStrategyIds.includes(strategy.id)
      )
      if (!strategies?.length) throw new Error('没有可生成的 Logo 策略')
      const initialReviews: LogoCandidateReview[] = []
      const initialBatch = await runLogoGenerationBatch({
        strategies,
        candidatesPerStrategy: input.candidatesPerStrategy,
        createCandidate: async (strategy, candidateIndex) => {
          const record = await createCandidate(savedProject, strategy, candidateIndex)
          initialReviews.push(...(await reviewRecord(savedProject, record)))
          return record
        },
        onProgress: setBatchItems
      })
      const existingRetryAttempts = generations
        .filter((generation) => generation.projectId === savedProject.id)
        .map((generation) => generation.scenarioMetadata)
        .filter(
          (metadata): metadata is LogoGenerationMetadataV2 =>
            metadata?.version === 2 &&
            metadata.designRevisionSnapshot.createdAt === savedProject.designRevision?.createdAt
        )
        .map((metadata) => metadata.qualityRetryAttempt)
      if (
        initialBatch.records.length > 0 &&
        shouldAutoRetryQuality({
          enabled: savedProject.autoQualityRetry ?? true,
          expectedCount: strategies.length * input.candidatesPerStrategy,
          reviews: initialReviews,
          existingRetryAttempts
        })
      ) {
        setQualityRetrying(true)
        try {
          await runLogoGenerationBatch({
            strategies,
            candidatesPerStrategy: input.candidatesPerStrategy,
            createCandidate: async (strategy, candidateIndex) => {
              const direction = savedProject.strategyPromptPack?.directions.find(
                (item) => item.strategyId === strategy.id
              )
              if (!direction) throw new Error(`缺少策略“${strategy.nameZh}”的提示词`)
              const record = await createCandidate(
                savedProject,
                strategy,
                candidateIndex,
                1,
                buildQualityRetryPrompt(direction, initialReviews)
              )
              await reviewRecord(savedProject, record)
              return record
            },
            onProgress: setBatchItems
          })
        } finally {
          setQualityRetrying(false)
        }
      }
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : '生成 Logo 初稿失败')
    } finally {
      setGenerating(false)
      onGeneratingChange(false)
    }
  }

  function retryItem(item: LogoBatchItem): void {
    if (item.generationId) {
      void onRetry(item.generationId)
      return
    }
    const strategy = workingProject?.designRevision?.strategies.find(
      (candidate) => candidate.id === item.strategyId
    )
    if (!strategy || !workingProject) return
    setBatchItems((current) =>
      current.map((candidate) =>
        candidate.key === item.key
          ? { ...candidate, status: 'running', errorMessage: undefined }
          : candidate
      )
    )
    void createCandidate(workingProject, strategy, item.candidateIndex)
      .then((record) =>
        setBatchItems((current) =>
          current.map((candidate) =>
            candidate.key === item.key
              ? {
                  ...candidate,
                  status: record.status === 'succeeded' ? 'succeeded' : 'failed',
                  generationId: record.id,
                  errorMessage: record.errorMessage
                }
              : candidate
          )
        )
      )
      .catch((error) =>
        setBatchItems((current) =>
          current.map((candidate) =>
            candidate.key === item.key
              ? {
                  ...candidate,
                  status: 'failed',
                  errorMessage: error instanceof Error ? error.message : 'Logo 生成失败'
                }
              : candidate
          )
        )
      )
  }

  function selectCandidate(asset: Asset): void {
    if (!workingProject) return
    const variant = generations
      .filter((generation) => generation.projectId === workingProject.id)
      .flatMap((generation) => generation.variants)
      .find((item) => item.asset.id === asset.id)
    if (!variant) return
    void saveProject({
      ...workingProject,
      selectedCandidateId: variant.id,
      workflowStep: 'refinement'
    })
      .then(() => setCurrentStep(3))
      .catch((error) => onError(error instanceof Error ? error.message : '选择候选失败'))
  }

  function changeStep(next: number): void {
    if (next === 0) setCurrentStep(0)
    if (next === 1 && workingProject?.designRevision) setCurrentStep(1)
    if (next === 2 && workingProject?.strategyPromptPack) setCurrentStep(2)
    if (next === 3 && selectedCandidate) setCurrentStep(3)
  }

  const revision = workingProject?.designRevision
  const promptPack = workingProject?.strategyPromptPack
  const mode: LogoGenerationMode = workingProject?.generationMode ?? 'quality-first'

  return (
    <main className="logo-workflow-panel">
      <Steps
        current={currentStep}
        items={[
          { title: '品牌简报' },
          { disabled: !revision, title: '创意策略' },
          { disabled: !promptPack, title: '生成与筛选' },
          { disabled: !selectedCandidate, title: '修改与导出' }
        ]}
        onChange={changeStep}
      />
      <div className="logo-workflow-content">
        {currentStep === 0 ? (
          <LogoBriefStep
            initialValues={projectToBriefValues(workingProject)}
            loading={buildingStrategies}
            referenceAssets={referenceAssets}
            onError={onError}
            onReferenceAssetsChange={onReferenceAssetsChange}
            onSubmit={createStrategies}
          />
        ) : null}
        {currentStep === 1 && revision && promptPack ? (
          <LogoStrategyStep
            loadingStrategyId={loadingStrategyId}
            promptPack={promptPack}
            revision={revision}
            stale={
              revision.briefVersion !== (workingProject?.briefVersion ?? 1) ||
              promptPack.sourcePromptVersion !== (workingProject?.promptVersion ?? 1)
            }
            onChangePrompt={changePrompt}
            onChangeRenderStyle={changeRenderStyle}
            onEditStrategy={editStrategy}
            onGenerate={() =>
              void generate({ candidatesPerStrategy: mode === 'quality-first' ? 2 : 1 })
            }
            onReplaceStrategy={replaceStrategy}
          />
        ) : null}
        {currentStep === 1 && (!revision || !promptPack) ? (
          <Alert title="请先生成创意策略" type="info" />
        ) : null}
        {currentStep === 2 && workingProject ? (
          <LogoGenerationStep
            aiReviewEnabled={workingProject.aiReviewEnabled ?? true}
            autoQualityRetry={workingProject.autoQualityRetry ?? true}
            candidateReviews={workingProject.candidateReviews}
            generating={generating}
            generations={generations}
            items={batchItems}
            mode={mode}
            projectId={workingProject.id}
            qualityRetrying={qualityRetrying}
            onDelete={onDelete}
            onDeleteVariants={onDeleteVariants}
            onExport={onExport}
            onGenerate={(input) => void generate(input)}
            onModeChange={(generationMode) => {
              setWorkingProject({ ...workingProject, generationMode })
              void saveProject({ ...workingProject, generationMode })
            }}
            onReviewSettingsChange={(patch) => {
              const updated = { ...workingProject, ...patch }
              setWorkingProject(updated)
              void saveProject(updated).catch((error) =>
                onError(error instanceof Error ? error.message : '保存评审设置失败')
              )
            }}
            onRetryGeneration={onRetry}
            onRetryItem={retryItem}
            onSelectCandidate={selectCandidate}
          />
        ) : null}
        {currentStep === 3 ? (
          <LogoQuickRefinementStep
            candidate={selectedCandidate}
            onContinueEdit={(candidate) => onContinueEdit(candidate.asset)}
            onExport={onExport}
          />
        ) : null}
      </div>
    </main>
  )
}
