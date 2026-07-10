import type { GenerationRecord } from '../../../shared/types'

export function assertGenerationSucceeded(record: GenerationRecord): void {
  if (record.status === 'failed') {
    throw new Error(record.errorMessage ?? '生成失败')
  }
}

export function summarizeGenerationError(message: string | undefined): string {
  if (!message) return '未知错误'

  const jsonStart = message.indexOf('{')
  if (jsonStart >= 0) {
    try {
      const payload = JSON.parse(message.slice(jsonStart)) as {
        error?: { message?: unknown }
      }
      if (typeof payload.error?.message === 'string' && payload.error.message.trim()) {
        return compactErrorText(payload.error.message)
      }
    } catch {
      // Fall through to plain-text cleanup.
    }
  }

  return compactErrorText(message.replace(/^Provider request failed:\s*\d*\s*/i, ''))
}

function compactErrorText(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 117)}...`
}
