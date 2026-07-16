import { describe, expect, test, vi } from 'vitest'
import { logoTestRevision } from '../../../../shared/logoDesign.testFixtures'
import type { GenerationRecord } from '../../../../shared/types'
import { runLogoGenerationBatch, type LogoBatchItem } from './logoGenerationBatch'

function generationRecord(id: string): GenerationRecord {
  return {
    id,
    mode: 'text-to-image',
    scenario: 'logo-design',
    projectId: 'project-1',
    promptOriginal: 'logo prompt',
    promptFinal: 'logo prompt',
    referenceImageIds: [],
    parameters: { size: '1024x1024', count: 1, quality: 'hd', outputFormat: 'png' },
    outputVariantIds: [],
    providerId: 'provider-1',
    status: 'succeeded',
    favorite: false,
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    references: [],
    variants: []
  }
}

describe('runLogoGenerationBatch', () => {
  test('continues other candidates and strategies after one failure', async () => {
    const createCandidate = vi.fn(async (strategyId: string, candidateIndex: number) => {
      if (strategyId === 'strategy-frame' && candidateIndex === 0) {
        throw new Error('provider timeout')
      }
      return generationRecord(`${strategyId}-${candidateIndex}`)
    })
    const updates: LogoBatchItem[][] = []

    const result = await runLogoGenerationBatch({
      strategies: logoTestRevision.strategies,
      candidatesPerStrategy: 2,
      createCandidate: (strategy, candidateIndex) => createCandidate(strategy.id, candidateIndex),
      onProgress: (items) => updates.push(items)
    })

    expect(createCandidate).toHaveBeenCalledTimes(6)
    expect(result.records).toHaveLength(5)
    expect(result.failures).toEqual([
      expect.objectContaining({
        strategyId: 'strategy-frame',
        candidateIndex: 0,
        errorMessage: 'provider timeout'
      })
    ])
    expect(updates.at(-1)?.filter((item) => item.status === 'succeeded')).toHaveLength(5)
  })

  test('treats a failed generation record as one failed item', async () => {
    const result = await runLogoGenerationBatch({
      strategies: [logoTestRevision.strategies[0]],
      candidatesPerStrategy: 1,
      createCandidate: async () => ({
        ...generationRecord('failed-record'),
        status: 'failed',
        errorMessage: 'provider rejected prompt'
      }),
      onProgress: vi.fn()
    })

    expect(result.records).toEqual([])
    expect(result.failures[0]).toMatchObject({
      status: 'failed',
      errorMessage: 'provider rejected prompt'
    })
  })
})
