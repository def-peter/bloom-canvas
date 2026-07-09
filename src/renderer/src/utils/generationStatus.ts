import type { GenerationRecord } from '../../../shared/types'

export function assertGenerationSucceeded(record: GenerationRecord): void {
  if (record.status === 'failed') {
    throw new Error(record.errorMessage ?? '生成失败')
  }
}
