import { SettingOutlined } from '@ant-design/icons'
import {
  App as AntdApp,
  Button,
  ConfigProvider,
  Layout,
  Segmented,
  Select,
  Spin,
  Typography
} from 'antd'
import { useEffect, useState } from 'react'
import { bloomCanvasClient } from '../api/bloomCanvasClient'
import { useWorkbenchStore } from '../state/workbenchStore'
import { bloomTheme } from '../theme'
import { assertGenerationSucceeded } from '../utils/generationStatus'
import type { Asset, GenerationRecord } from '../../../shared/types'
import { CreationPanel } from './CreationPanel'
import { ErrorNotice } from './ErrorNotice'
import { GalleryPanel } from './GalleryPanel'
import { HistoryPanel } from './HistoryPanel'
import { LogoCreationPanel } from './logo/LogoCreationPanel'
import { LogoProjectPanel } from './logo/LogoProjectPanel'
import { LogoResultsPanel } from './logo/LogoResultsPanel'
import { ProviderSettingsModal } from './ProviderSettingsModal'

const { Header } = Layout

function WorkbenchShell(): React.JSX.Element {
  const {
    activeScene,
    providers,
    activeProvider,
    settings,
    generations,
    selectedGeneration,
    logoProjects,
    selectedLogoProject,
    loading,
    generating,
    error,
    refresh,
    refreshLogoProjects,
    setActiveScene,
    selectGeneration,
    selectLogoProject,
    setGenerating,
    setError
  } = useWorkbenchStore()
  const { message } = AntdApp.useApp()
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [generalReferenceAssets, setGeneralReferenceAssets] = useState<Asset[]>([])
  const [logoReferenceAssets, setLogoReferenceAssets] = useState<Asset[]>([])

  useEffect(() => {
    let cancelled = false
    const referenceImageIds = selectedLogoProject?.referenceImageIds ?? []

    void bloomCanvasClient.assets
      .getMany(referenceImageIds)
      .then((assets) => {
        if (!cancelled) setLogoReferenceAssets(assets)
      })
      .catch((assetError) => {
        if (!cancelled) {
          setLogoReferenceAssets([])
          setError(assetError instanceof Error ? assetError.message : '加载 Logo 参考图失败')
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedLogoProject?.id, selectedLogoProject?.referenceImageIds, setError])

  async function handleProviderChange(providerId: string): Promise<void> {
    try {
      await bloomCanvasClient.settings.save({ defaultProviderId: providerId })
      await refresh()
    } catch (providerError) {
      setError(providerError instanceof Error ? providerError.message : '切换 Provider 失败')
    }
  }

  async function handleGenerationCreated(record: GenerationRecord): Promise<void> {
    await refresh()
    selectGeneration(record)
  }

  async function handleExport(assetId: string): Promise<void> {
    try {
      const targetPath = await bloomCanvasClient.assets.export({ assetId })
      message.success(`已导出到 ${targetPath}`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : '导出图片失败')
    }
  }

  async function handleRetry(generationId: string): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      setProviderModalOpen(true)
      return
    }

    setGenerating(true)
    try {
      const record = await bloomCanvasClient.generations.retry(generationId)
      assertGenerationSucceeded(record)
      await refresh()
      selectGeneration(record)
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : '重新生成失败')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteGeneration(generationId: string): Promise<void> {
    try {
      await bloomCanvasClient.generations.remove(generationId)
      await refresh()
      message.success('已删除历史记录')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除历史记录失败')
    }
  }

  async function handleDeleteVariants(variantIds: string[]): Promise<void> {
    try {
      await bloomCanvasClient.generations.removeVariants(variantIds)
      await refresh()
      message.success(`已删除 ${variantIds.length} 张图片`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '批量删除图片失败')
      throw deleteError
    }
  }

  function handleContinueEdit(asset: Asset): void {
    setGeneralReferenceAssets([asset])
    setActiveScene('general')
    setError(null)
    message.info('已把图片加入参考图，请在提示词里输入修改要求')
  }

  async function handleProviderSaved(): Promise<void> {
    await refresh()
    setProviderModalOpen(false)
  }

  async function handleLogoProjectSaved(
    project: NonNullable<typeof selectedLogoProject>
  ): Promise<void> {
    await refreshLogoProjects()
    selectLogoProject(project)
  }

  async function handleDeleteLogoProject(projectId: string): Promise<void> {
    try {
      await bloomCanvasClient.logoProjects.remove(projectId)
      await refresh()
      message.success('已删除 Logo 项目')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除 Logo 项目失败')
      throw deleteError
    }
  }

  const selectedLogoProjectHasImages = Boolean(
    selectedLogoProject &&
    generations.some(
      (generation) =>
        generation.projectId === selectedLogoProject.id && generation.variants.length > 0
    )
  )

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="brand-block">
          <Typography.Title level={3}>生花</Typography.Title>
          <Typography.Text>BloomCanvas</Typography.Text>
        </div>
        <div className="header-controls">
          <Segmented
            options={[
              { label: '通用创作', value: 'general' },
              { label: 'Logo 设计', value: 'logo-design' }
            ]}
            value={activeScene}
            onChange={(value) => setActiveScene(value as 'general' | 'logo-design')}
          />
          <Select
            aria-label="Provider"
            className="provider-select"
            disabled={providers.length === 0}
            options={providers.map((provider) => ({
              label: provider.name,
              value: provider.id
            }))}
            placeholder="未配置 Provider"
            value={activeProvider?.id}
            onChange={handleProviderChange}
          />
          <Button icon={<SettingOutlined />} onClick={() => setProviderModalOpen(true)}>
            Provider 设置
          </Button>
        </div>
      </Header>
      <ErrorNotice error={error} onClose={() => setError(null)} />
      {loading ? (
        <main className="loading-view">
          <Spin />
        </main>
      ) : activeScene === 'general' ? (
        <div className="workspace-grid">
          <HistoryPanel
            generations={generations}
            selectedId={selectedGeneration?.id}
            onDelete={handleDeleteGeneration}
            onSelect={selectGeneration}
          />
          <GalleryPanel
            generating={generating}
            generation={selectedGeneration}
            onContinueEdit={handleContinueEdit}
            onDeleteVariants={handleDeleteVariants}
            onExport={handleExport}
            onRetry={handleRetry}
          />
          <CreationPanel
            activeProvider={activeProvider}
            referenceAssets={generalReferenceAssets}
            settings={settings}
            onCreated={handleGenerationCreated}
            onError={setError}
            onGeneratingChange={setGenerating}
            onNeedProvider={() => setProviderModalOpen(true)}
            onReferenceAssetsChange={setGeneralReferenceAssets}
          />
        </div>
      ) : (
        <div className="workspace-grid logo-workspace-grid">
          <LogoProjectPanel
            projects={logoProjects}
            selectedId={selectedLogoProject?.id ?? null}
            selectedProjectHasImages={selectedLogoProjectHasImages}
            onCreateNew={() => {
              selectLogoProject(null)
              setLogoReferenceAssets([])
            }}
            onDelete={handleDeleteLogoProject}
            onSelect={selectLogoProject}
          />
          <LogoResultsPanel
            generating={generating}
            generations={generations}
            selectedProjectId={selectedLogoProject?.id ?? null}
            onContinueEdit={handleContinueEdit}
            onDelete={handleDeleteGeneration}
            onDeleteVariants={handleDeleteVariants}
            onExport={handleExport}
            onRetry={handleRetry}
          />
          <LogoCreationPanel
            activeProvider={activeProvider}
            project={selectedLogoProject}
            referenceAssets={logoReferenceAssets}
            settings={settings}
            onCreated={handleGenerationCreated}
            onError={setError}
            onGeneratingChange={setGenerating}
            onNeedProvider={() => setProviderModalOpen(true)}
            onProjectSaved={handleLogoProjectSaved}
            onReferenceAssetsChange={setLogoReferenceAssets}
          />
        </div>
      )}
      <ProviderSettingsModal
        open={providerModalOpen}
        provider={activeProvider}
        onClose={() => setProviderModalOpen(false)}
        onError={setError}
        onSaved={handleProviderSaved}
      />
    </Layout>
  )
}

export function AppShell(): React.JSX.Element {
  return (
    <ConfigProvider theme={bloomTheme}>
      <AntdApp>
        <WorkbenchShell />
      </AntdApp>
    </ConfigProvider>
  )
}
