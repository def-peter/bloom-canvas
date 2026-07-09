import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, GenerationRecord, LogoProject, ProviderConfig } from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'

export type WorkbenchScene = 'general' | 'logo-design'

export interface WorkbenchState {
  activeScene: WorkbenchScene
  providers: ProviderConfig[]
  activeProvider: ProviderConfig | null
  settings: AppSettings | null
  generations: GenerationRecord[]
  selectedGeneration: GenerationRecord | null
  logoProjects: LogoProject[]
  selectedLogoProject: LogoProject | null
  loading: boolean
  generating: boolean
  error: string | null
  refresh: () => Promise<void>
  refreshLogoProjects: () => Promise<void>
  setActiveScene: (scene: WorkbenchScene) => void
  selectGeneration: (generation: GenerationRecord | null) => void
  selectLogoProject: (project: LogoProject | null) => void
  setGenerating: (generating: boolean) => void
  setError: (error: string | null) => void
}

export function useWorkbenchStore(): WorkbenchState {
  const [activeScene, setActiveScene] = useState<WorkbenchScene>('general')
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [activeProvider, setActiveProvider] = useState<ProviderConfig | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [generations, setGenerations] = useState<GenerationRecord[]>([])
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationRecord | null>(null)
  const [logoProjects, setLogoProjects] = useState<LogoProject[]>([])
  const [selectedLogoProject, setSelectedLogoProject] = useState<LogoProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshLogoProjects = useCallback(async () => {
    const nextLogoProjects = await bloomCanvasClient.logoProjects.list()
    setLogoProjects(nextLogoProjects)
    setSelectedLogoProject((current) => {
      if (!current) return nextLogoProjects[0] ?? null
      return nextLogoProjects.find((item) => item.id === current.id) ?? nextLogoProjects[0] ?? null
    })
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [
        nextProviders,
        nextActiveProvider,
        nextSettings,
        nextGenerations,
        nextLogoProjects
      ] = await Promise.all([
        bloomCanvasClient.providers.list(),
        bloomCanvasClient.providers.getActive(),
        bloomCanvasClient.settings.get(),
        bloomCanvasClient.generations.list(),
        bloomCanvasClient.logoProjects.list()
      ])
      setProviders(nextProviders)
      setActiveProvider(nextActiveProvider)
      setSettings(nextSettings)
      setGenerations(nextGenerations)
      setLogoProjects(nextLogoProjects)
      setSelectedGeneration((current) => {
        if (!current) return nextGenerations[0] ?? null
        return nextGenerations.find((item) => item.id === current.id) ?? nextGenerations[0] ?? null
      })
      setSelectedLogoProject((current) => {
        if (!current) return nextLogoProjects[0] ?? null
        return nextLogoProjects.find((item) => item.id === current.id) ?? nextLogoProjects[0] ?? null
      })
      setError(null)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : '加载工作台失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void Promise.resolve().then(() => {
      if (!cancelled) {
        void refresh()
      }
    })

    return () => {
      cancelled = true
    }
  }, [refresh])

  return useMemo(
    () => ({
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
      selectGeneration: setSelectedGeneration,
      selectLogoProject: setSelectedLogoProject,
      setGenerating,
      setError
    }),
    [
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
      refreshLogoProjects
    ]
  )
}
