import type { LogoCandidateReview } from '../../shared/logoDesign'
import { logoCandidateReviewSchema } from '../../shared/schemas'
import type { Asset, LogoGenerationMetadataV2, ProviderConfig } from '../../shared/types'
import type { OpenAIResponsesClient } from '../services/openAIResponsesClient'
import { LogoPreviewService } from './logoPreviewService'

export interface LogoReviewContext {
  candidateId: string
  asset: Asset
  metadata: LogoGenerationMetadataV2
}

const UNAVAILABLE_REASON = '当前供应商未执行 AI 视觉评审'

const REVIEW_SYSTEM_PROMPT = `You are a strict logo design reviewer. Review only the supplied single logo image against the supplied brand brief and approved strategy.
Return JSON only with this exact shape: {"status":"recommended|adjustable|not-recommended","scores":{"strategyFit":0,"distinctiveness":0,"simplicity":0,"smallSizePotential":0,"craft":0},"hardFailures":[],"risksZh":[],"suggestedRevisionZh":"","revisionInstructionEn":""}.
All five scores must be numbers from 0 to 100. Use not-recommended for any hard failure. Hard failures include: multiple logos or a concept sheet; unrequested text, pseudo-text, or watermark; mockup, poster, or scene presentation; clear violation of exclusions; details that collapse at small size. For a wordmark, wrong, missing, or fake characters are also hard failures. Do not claim trademark availability or legal originality.`

function localOnlyReview(
  candidateId: string,
  hardFailures: string[] = [],
  risksZh: string[] = []
): LogoCandidateReview {
  return {
    candidateId,
    status: 'unreviewed',
    reviewMode: 'local-only',
    hardFailures,
    risksZh,
    unavailableReasonZh: UNAVAILABLE_REASON
  }
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Logo review returned no JSON object')
  const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Logo review JSON must be an object')
  }
  return parsed as Record<string, unknown>
}

function expectedText(metadata: LogoGenerationMetadataV2): string {
  const { briefSnapshot: brief, logoType } = metadata
  if (logoType === 'wordmark') return `exact full brand name: ${brief.brandName}`
  if (logoType === 'lettermark') {
    return `only the approved initials: ${brief.shortName || brief.brandNameAlt || brief.brandName}`
  }
  if (logoType === 'combination-mark') return 'no brand text in this first-round symbol candidate'
  if (logoType === 'emblem')
    return 'no ring text or small text in this first-round emblem structure'
  return 'no text'
}

export class LogoReviewService {
  constructor(
    private readonly responses: Pick<OpenAIResponsesClient, 'createText'>,
    private readonly previews: Pick<LogoPreviewService, 'create'> = new LogoPreviewService()
  ) {}

  async review(
    provider: ProviderConfig,
    apiKey: string,
    context: LogoReviewContext,
    useVision: boolean
  ): Promise<LogoCandidateReview> {
    let preview
    try {
      preview = await this.previews.create(context.asset)
    } catch {
      return localOnlyReview(context.candidateId, ['无法执行本地图片检查'])
    }

    const localRisks = preview.localCheck.lowContrast ? ['本地检查发现图片对比度较低'] : []
    if (preview.localCheck.blank) {
      return localOnlyReview(context.candidateId, ['图片为空白或接近空白'], localRisks)
    }
    if (!useVision || !provider.promptModel.trim()) {
      return localOnlyReview(context.candidateId, [], localRisks)
    }

    const { briefSnapshot: brief, designRevisionSnapshot: revision } = context.metadata
    const strategy = revision.strategies.find((item) => item.id === context.metadata.strategyId)
    if (!strategy) {
      return localOnlyReview(context.candidateId, ['生成记录缺少对应设计策略'], localRisks)
    }

    try {
      const output = await this.responses.createText(provider, apiKey, [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                brand: {
                  name: brief.brandName,
                  industry: brief.industry,
                  businessDescription: brief.businessDescription,
                  keywords: brief.brandKeywords,
                  differentiator: brief.differentiator,
                  avoidedElements: brief.avoidedElements,
                  usageScenarios: brief.usageScenarios
                },
                strategy: {
                  nameZh: strategy.nameZh,
                  coreMetaphor: strategy.coreMetaphor,
                  construction: strategy.construction,
                  silhouette: strategy.silhouette,
                  exclusions: strategy.exclusions
                },
                logoType: context.metadata.logoType,
                expectedText: expectedText(context.metadata),
                localCheck: preview.localCheck
              })
            },
            { type: 'input_image', image_url: preview.whiteBackgroundDataUrl }
          ]
        }
      ])
      return logoCandidateReviewSchema.parse({
        ...parseJsonObject(output),
        candidateId: context.candidateId,
        reviewMode: 'vision-model'
      })
    } catch {
      return localOnlyReview(context.candidateId, [], localRisks)
    }
  }
}
