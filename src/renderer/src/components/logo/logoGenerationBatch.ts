import type { LogoDesignStrategy } from '../../../../shared/logoDesign'
import type { GenerationRecord } from '../../../../shared/types'

export type LogoBatchItemStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface LogoBatchItem {
  key: string
  strategyId: string
  strategyNameZh: string
  candidateIndex: number
  status: LogoBatchItemStatus
  generationId?: string
  errorMessage?: string
}

interface RunLogoGenerationBatchInput {
  strategies: LogoDesignStrategy[]
  candidatesPerStrategy: 1 | 2
  createCandidate: (
    strategy: LogoDesignStrategy,
    candidateIndex: number
  ) => Promise<GenerationRecord>
  onProgress: (items: LogoBatchItem[]) => void
}

export async function runLogoGenerationBatch(
  input: RunLogoGenerationBatchInput
): Promise<{ records: GenerationRecord[]; failures: LogoBatchItem[] }> {
  let items: LogoBatchItem[] = input.strategies.flatMap((strategy) =>
    Array.from({ length: input.candidatesPerStrategy }, (_, candidateIndex) => ({
      key: `${strategy.id}:${candidateIndex}`,
      strategyId: strategy.id,
      strategyNameZh: strategy.nameZh,
      candidateIndex,
      status: 'queued' as const
    }))
  )
  const records: GenerationRecord[] = []

  function publish(): void {
    input.onProgress(items.map((item) => ({ ...item })))
  }

  function update(key: string, patch: Partial<LogoBatchItem>): void {
    items = items.map((item) => (item.key === key ? { ...item, ...patch } : item))
    publish()
  }

  publish()
  await Promise.all(
    input.strategies.map(async (strategy) => {
      for (
        let candidateIndex = 0;
        candidateIndex < input.candidatesPerStrategy;
        candidateIndex += 1
      ) {
        const key = `${strategy.id}:${candidateIndex}`
        update(key, { status: 'running', errorMessage: undefined })
        try {
          const record = await input.createCandidate(strategy, candidateIndex)
          if (record.status !== 'succeeded') {
            update(key, {
              status: 'failed',
              generationId: record.id,
              errorMessage: record.errorMessage ?? 'Logo 生成失败'
            })
            continue
          }
          records.push(record)
          update(key, { status: 'succeeded', generationId: record.id })
        } catch (error) {
          update(key, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Logo 生成失败'
          })
        }
      }
    })
  )

  return {
    records,
    failures: items.filter((item) => item.status === 'failed')
  }
}
