import { z } from 'zod'
import type {
  GenerateLogoStrategiesInput,
  LogoBrandSemantics,
  LogoDesignRevision,
  LogoDesignStrategy,
  LogoGrammarCard
} from '../../shared/logoDesign'
import { logoBrandSemanticsSchema, logoDesignStrategySchema } from '../../shared/schemas'
import type { ProviderConfig } from '../../shared/types'
import type {
  OpenAIResponsesClient,
  ResponsesInputMessage
} from '../services/openAIResponsesClient'
import { normalizeLogoBrief, type NormalizedLogoBrief } from './logoBriefNormalizer'
import { LOGO_GRAMMAR_LIBRARY_VERSION, logoGrammarCards } from './logoGrammarLibrary'
import { validateLogoStrategies } from './logoStrategyValidator'

const CORE_REQUIREMENTS = `You are creating design strategies, not finished artwork and not mood-board style labels.
Every strategy must name one concrete metaphor, one construction mechanism, one silhouette,
and evidence copied exactly from functionalTruths or differentiators.
Use three different grammarId values. Do not create three color or rendering variants.
Do not mention, imitate, or compare against any existing brand, agency, or trademark.
Return JSON only.`

const newStrategyOutputSchema = z.object({
  semantics: logoBrandSemanticsSchema,
  strategies: z.array(logoDesignStrategySchema).length(3)
})

const replacementOutputSchema = z.object({
  semantics: logoBrandSemanticsSchema,
  strategies: z.array(logoDesignStrategySchema).length(1)
})

type StrategyAssessment =
  | {
      ok: true
      semantics: LogoBrandSemantics
      strategies: LogoDesignStrategy[]
    }
  | {
      ok: false
      issues: string[]
      duplicateStrategyIds: string[]
      requiresFullRewrite: boolean
    }

interface ReplacementContext {
  replaceStrategyId: string
  existingRevision: LogoDesignRevision
  targetIndex: number
}

export class LogoStrategyService {
  constructor(private readonly responses: Pick<OpenAIResponsesClient, 'createText'>) {}

  async generate(
    provider: ProviderConfig,
    apiKey: string,
    input: GenerateLogoStrategiesInput
  ): Promise<LogoDesignRevision> {
    const normalizedBrief = normalizeLogoBrief(input.brief)
    const replacement = resolveReplacementContext(input)
    const systemPrompt = buildSystemPrompt(replacement)
    const promptPayload = buildPromptPayload(normalizedBrief, replacement)
    const firstMessages = buildInitialMessages(systemPrompt, promptPayload)
    const firstOutput = await this.responses.createText(provider, apiKey, firstMessages)
    const firstAssessment = assessModelOutput(firstOutput, normalizedBrief, replacement)

    let validAssessment: Extract<StrategyAssessment, { ok: true }>
    if (firstAssessment.ok) {
      validAssessment = firstAssessment
    } else {
      const repairMessages = buildRepairMessages(
        systemPrompt,
        promptPayload,
        firstOutput,
        firstAssessment,
        replacement
      )
      const secondOutput = await this.responses.createText(provider, apiKey, repairMessages)
      const secondAssessment = assessModelOutput(secondOutput, normalizedBrief, replacement)

      if (!secondAssessment.ok) {
        throw new Error(`策略模型连续两次返回无效结果：${summarizeIssues(secondAssessment.issues)}`)
      }
      validAssessment = secondAssessment
    }

    return {
      briefVersion: input.briefVersion,
      strategyVersion: replacement ? replacement.existingRevision.strategyVersion + 1 : 1,
      grammarLibraryVersion: LOGO_GRAMMAR_LIBRARY_VERSION,
      semantics: validAssessment.semantics,
      strategies: validAssessment.strategies,
      selectedStrategyIds: validAssessment.strategies.map((strategy) => strategy.id),
      createdAt: new Date().toISOString()
    }
  }
}

function resolveReplacementContext(
  input: GenerateLogoStrategiesInput
): ReplacementContext | undefined {
  if (input.replaceStrategyId === undefined) return undefined
  if (!input.existingRevision) {
    throw new Error('replaceStrategyId requires existingRevision')
  }

  const matchingIndexes = input.existingRevision.strategies.flatMap((strategy, index) =>
    strategy.id === input.replaceStrategyId ? [index] : []
  )
  if (matchingIndexes.length !== 1) {
    throw new Error(
      `replaceStrategyId "${input.replaceStrategyId}" must uniquely identify one existing strategy; found ${matchingIndexes.length}`
    )
  }

  return {
    replaceStrategyId: input.replaceStrategyId,
    existingRevision: input.existingRevision,
    targetIndex: matchingIndexes[0]
  }
}

function buildSystemPrompt(replacement: ReplacementContext | undefined): string {
  const outputRules = replacement
    ? [
        'Return one JSON object with exactly this top-level shape: { semantics, strategies }.',
        'strategies must contain exactly 1 entry for the requested replacement.',
        `The single strategy id must remain "${replacement.replaceStrategyId}".`,
        'Keep semantics consistent with existingSemantics; the service will preserve the existing semantics.'
      ]
    : [
        'Return one JSON object with exactly this top-level shape: { semantics, strategies }.',
        'strategies must contain exactly 3 entries with distinct ids, grammarId values, metaphors, constructions, and silhouettes.'
      ]

  return [CORE_REQUIREMENTS, ...outputRules].join('\n')
}

function buildPromptPayload(
  normalizedBrief: NormalizedLogoBrief,
  replacement: ReplacementContext | undefined
): Record<string, unknown> {
  const grammarCards = logoGrammarCards
    .filter((card) => card.allowedLogoTypes.includes(normalizedBrief.brief.logoType))
    .map(toPromptGrammarCard)

  return {
    mode: replacement ? 'replace-one-strategy' : 'create-three-strategies',
    brief: normalizedBrief,
    grammarCards,
    ...(replacement
      ? {
          replaceStrategyId: replacement.replaceStrategyId,
          existingSemantics: replacement.existingRevision.semantics,
          existingStrategies: replacement.existingRevision.strategies
        }
      : {})
  }
}

function toPromptGrammarCard(card: LogoGrammarCard): Omit<LogoGrammarCard, 'sourceRefs'> {
  return {
    id: card.id,
    nameZh: card.nameZh,
    mechanism: card.mechanism,
    fitSignals: card.fitSignals,
    conflictSignals: card.conflictSignals,
    allowedLogoTypes: card.allowedLogoTypes,
    constructionRules: card.constructionRules,
    antiPatterns: card.antiPatterns,
    promptFragments: card.promptFragments,
    reviewRules: card.reviewRules
  }
}

function buildInitialMessages(
  systemPrompt: string,
  promptPayload: Record<string, unknown>
): ResponsesInputMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(promptPayload) }
  ]
}

function buildRepairMessages(
  systemPrompt: string,
  promptPayload: Record<string, unknown>,
  originalOutput: string,
  assessment: Extract<StrategyAssessment, { ok: false }>,
  replacement: ReplacementContext | undefined
): ResponsesInputMessage[] {
  const repairScope = replacement
    ? `Rewrite only replacement strategy ID "${replacement.replaceStrategyId}".`
    : !assessment.requiresFullRewrite && assessment.duplicateStrategyIds.length > 0
      ? `Rewrite only these strategy IDs: ${JSON.stringify(assessment.duplicateStrategyIds)}.`
      : 'Rewrite the full strategy set of exactly 3 strategies.'

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        JSON.stringify(promptPayload),
        'The previous model output was invalid. Repair it once.',
        'Original model output:',
        originalOutput,
        'Validation and diversity issues:',
        ...assessment.issues,
        repairScope,
        'Return the corrected JSON object only.'
      ].join('\n')
    }
  ]
}

function assessModelOutput(
  output: string,
  brief: NormalizedLogoBrief,
  replacement: ReplacementContext | undefined
): StrategyAssessment {
  const parsedJson = parseModelJson(output)
  if (!parsedJson.ok) return parsedJson

  const parsedOutput = (replacement ? replacementOutputSchema : newStrategyOutputSchema).safeParse(
    parsedJson.value
  )
  if (!parsedOutput.success) {
    return {
      ok: false,
      issues: [`Invalid model output structure: ${summarizeZodIssues(parsedOutput.error)}`],
      duplicateStrategyIds: [],
      requiresFullRewrite: true
    }
  }

  if (replacement) {
    return assessReplacement(parsedOutput.data, brief, replacement)
  }

  const strategies = parsedOutput.data.strategies.map((strategy) => ({
    ...strategy,
    version: 1
  }))
  return assessCompleteSet(brief, parsedOutput.data.semantics, strategies, false)
}

function assessReplacement(
  parsedOutput: z.infer<typeof replacementOutputSchema>,
  brief: NormalizedLogoBrief,
  replacement: ReplacementContext
): StrategyAssessment {
  const modelStrategy = parsedOutput.strategies[0]
  if (modelStrategy.id !== replacement.replaceStrategyId) {
    return {
      ok: false,
      issues: [
        `replacement strategy id must equal "${replacement.replaceStrategyId}"; received "${modelStrategy.id}"`
      ],
      duplicateStrategyIds: [],
      requiresFullRewrite: false
    }
  }

  const previousStrategy = replacement.existingRevision.strategies[replacement.targetIndex]
  const nextStrategy: LogoDesignStrategy = {
    ...modelStrategy,
    id: replacement.replaceStrategyId,
    version: previousStrategy.version + 1
  }
  const mergedStrategies = [...replacement.existingRevision.strategies]
  mergedStrategies[replacement.targetIndex] = nextStrategy

  return assessCompleteSet(brief, replacement.existingRevision.semantics, mergedStrategies, false)
}

function assessCompleteSet(
  brief: NormalizedLogoBrief,
  semantics: LogoBrandSemantics,
  strategies: LogoDesignStrategy[],
  requiresFullRewrite: boolean
): StrategyAssessment {
  const validation = validateLogoStrategies({ brief, semantics, strategies })
  if (validation.ok) return { ok: true, semantics, strategies: validation.strategies }

  return {
    ok: false,
    issues: validation.issues,
    duplicateStrategyIds: validation.duplicateStrategyIds,
    requiresFullRewrite:
      requiresFullRewrite || validation.issues.some((issue) => issue.includes('duplicates id'))
  }
}

function parseModelJson(
  output: string
): { ok: true; value: unknown } | Extract<StrategyAssessment, { ok: false }> {
  const trimmedOutput = output.trim()
  const fencedMatch = trimmedOutput.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i)
  const jsonText = fencedMatch ? fencedMatch[1] : trimmedOutput

  try {
    return { ok: true, value: JSON.parse(jsonText) as unknown }
  } catch (error) {
    return {
      ok: false,
      issues: [`JSON parse failed: ${errorMessage(error)}`],
      duplicateStrategyIds: [],
      requiresFullRewrite: true
    }
  }
}

function summarizeZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`)
    .join('; ')
}

function summarizeIssues(issues: string[]): string {
  return issues.join('; ')
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
