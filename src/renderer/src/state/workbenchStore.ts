import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, GenerationRecord, ProviderConfig } from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'

export interface WorkbenchState {
  providers: ProviderConfig[]
  activeProvider: ProviderConfig | null
  settings: AppSettings | null
  generations: GenerationRecord[]
  selectedGeneration: GenerationRecord | null
  loading: boolean
  generating: boolean
  error: string | null
  refresh: () => Promise<void>
  selectGeneration: (generation: GenerationRecord | null) => void
  setGenerating: (generating: boolean) => void
  setError: (error: string | null) => void
}

export function useWorkbenchStore(): WorkbenchState {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [activeProvider, setActiveProvider] = useState<ProviderConfig | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [generations, setGenerations] = useState<GenerationRecord[]>([])
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextProviders, nextActiveProvider, nextSettings, nextGenerations] = await Promise.all([
        bloomCanvasClient.providers.list(),
        bloomCanvasClient.providers.getActive(),
        bloomCanvasClient.settings.get(),
        bloomCanvasClient.generations.list()
      ])
      setProviders(nextProviders)
      setActiveProvider(nextActiveProvider)
      setSettings(nextSettings)
      setGenerations(nextGenerations)
      setSelectedGeneration((current) => {
        if (!current) return nextGenerations[0] ?? null
        return nextGenerations.find((item) => item.id === current.id) ?? nextGenerations[0] ?? null
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
      providers,
      activeProvider,
      settings,
      generations,
      selectedGeneration,
      loading,
      generating,
      error,
      refresh,
      selectGeneration: setSelectedGeneration,
      setGenerating,
      setError
    }),
    [
      providers,
      activeProvider,
      settings,
      generations,
      selectedGeneration,
      loading,
      generating,
      error,
      refresh
    ]
  )
}
