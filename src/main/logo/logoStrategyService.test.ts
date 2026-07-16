import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type {
  GenerateLogoStrategiesInput,
  LogoDesignRevision,
  LogoDesignStrategy
} from '../../shared/logoDesign'
import {
  logoTestBrief,
  logoTestProvider,
  logoTestRevision,
  logoTestSemantics
} from '../../shared/logoDesign.testFixtures'
import type {
  OpenAIResponsesClient,
  ResponsesInputMessage
} from '../services/openAIResponsesClient'
import { logoGrammarCards } from './logoGrammarLibrary'
import { LogoStrategyService } from './logoStrategyService'

const NOW = '2026-07-14T01:02:03.000Z'
const CORE_REQUIREMENTS = `You are creating design strategies, not finished artwork and not mood-board style labels.
Every strategy must name one concrete metaphor, one construction mechanism, one silhouette,
and evidence copied exactly from functionalTruths or differentiators.
Use three different grammarId values. Do not create three color or rendering variants.
Do not mention, imitate, or compare against any existing brand, agency, or trademark.
Return JSON only.`
const SEMANTICS_FIELDS = [
  'functionalTruths',
  'emotionalQualities',
  'differentiators',
  'audienceSignals',
  'usableMetaphors',
  'literalMetaphorRisks',
  'industryCliches',
  'usageConstraints'
]
const MODEL_STRATEGY_FIELDS = [
  'id',
  'nameZh',
  'summaryZh',
  'grammarId',
  'brandEvidence',
  'coreMetaphor',
  'construction',
  'silhouette',
  'composition',
  'colorPlan',
  'recommendedRenderStyles',
  'exclusions',
  'rationaleZh',
  'imagePromptEn'
]
const RENDER_STYLES = [
  'flat-monochrome',
  'flat-duotone',
  'restrained-gradient',
  'bold-outline',
  'soft-2.5d',
  'soft-volume',
  'embossed',
  'skeuomorphic'
]

interface JsonSchemaNode {
  type?: string
  properties?: Record<string, JsonSchemaNode>
  required?: string[]
  items?: JsonSchemaNode
  enum?: unknown[]
  minItems?: number
  maxItems?: number
  minLength?: number
  maxLength?: number
  additionalProperties?: boolean
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
})

function input(overrides: Partial<GenerateLogoStrategiesInput> = {}): GenerateLogoStrategiesInput {
  return {
    providerId: logoTestProvider.id,
    briefVersion: 7,
    brief: logoTestBrief,
    ...overrides
  }
}

function validOutput(): string {
  return JSON.stringify({
    semantics: logoTestSemantics,
    strategies: logoTestRevision.strategies.map((strategy) => ({ ...strategy, version: 99 }))
  })
}

function withoutVersion(strategy: LogoDesignStrategy): Omit<LogoDesignStrategy, 'version'> {
  const modelStrategy: Partial<LogoDesignStrategy> = { ...strategy }
  delete modelStrategy.version
  return modelStrategy as Omit<LogoDesignStrategy, 'version'>
}

function responsesWith(...outputs: string[]): {
  createText: ReturnType<typeof vi.fn<OpenAIResponsesClient['createText']>>
} {
  const createText = vi.fn<OpenAIResponsesClient['createText']>()
  for (const output of outputs) createText.mockResolvedValueOnce(output)
  return { createText }
}

function requestMessages(
  responses: ReturnType<typeof responsesWith>,
  callIndex = 0
): Parameters<OpenAIResponsesClient['createText']>[2] {
  return responses.createText.mock.calls[callIndex][2]
}

function textContent(message: ResponsesInputMessage): string {
  if (typeof message.content !== 'string') {
    throw new Error('Expected a text-only strategy request')
  }
  return message.content
}

function outputContract(systemPrompt: string): JsonSchemaNode {
  const match = systemPrompt.match(/MODEL_OUTPUT_SCHEMA_BEGIN\n([\s\S]*?)\nMODEL_OUTPUT_SCHEMA_END/)
  expect(match, 'system prompt must include a complete model output JSON Schema').not.toBeNull()
  if (!match) throw new Error('model output JSON Schema markers are missing')
  return JSON.parse(match[1]) as JsonSchemaNode
}

function schemaProperty(schema: JsonSchemaNode, name: string): JsonSchemaNode {
  const property = schema.properties?.[name]
  expect(property, `JSON Schema property ${name} must exist`).toBeDefined()
  if (!property) throw new Error(`JSON Schema property ${name} is missing`)
  return property
}

function replacementRevision(briefVersion = 7): LogoDesignRevision {
  return {
    ...logoTestRevision,
    briefVersion,
    strategyVersion: 4,
    semantics: { ...logoTestSemantics },
    strategies: logoTestRevision.strategies.map((strategy, index) => ({
      ...strategy,
      version: [2, 5, 3][index]
    }))
  }
}

function validReplacementOutput(targetId = 'strategy-frame'): string {
  return JSON.stringify({
    semantics: { ...logoTestSemantics, emotionalQualities: ['模型试图修改语义'] },
    strategies: [
      withoutVersion({
        ...logoTestRevision.strategies[1],
        id: targetId,
        grammarId: 'negative-space-fusion',
        coreMetaphor: 'two creative truths revealing one clear opening',
        construction: 'two bold planes reveal one wide central negative shape',
        silhouette: 'compact paired form with one clear opening'
      })
    ]
  })
}

describe('LogoStrategyService', () => {
  test('accepts model output without version and adds service-owned revision metadata', async () => {
    const versionlessOutput = JSON.stringify({
      semantics: logoTestSemantics,
      strategies: logoTestRevision.strategies.map(withoutVersion)
    })
    const responses = responsesWith(versionlessOutput, versionlessOutput)

    const revision = await new LogoStrategyService(responses).generate(
      logoTestProvider,
      'sk-test',
      input()
    )

    expect(revision).toMatchObject({
      briefVersion: 7,
      strategyVersion: 1,
      grammarLibraryVersion: 1,
      semantics: logoTestSemantics,
      selectedStrategyIds: ['strategy-path', 'strategy-frame', 'strategy-grid'],
      createdAt: NOW
    })
    expect(revision.strategies.map((strategy) => strategy.version)).toEqual([1, 1, 1])
    expect(responses.createText).toHaveBeenCalledTimes(1)
  })

  test('sends the core requirements and only compatible source-free grammar cards', async () => {
    const responses = responsesWith(validOutput())

    await new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())

    const [systemMessage, userMessage] = requestMessages(responses)
    expect(systemMessage.role).toBe('system')
    expect(systemMessage.content).toContain(CORE_REQUIREMENTS)
    expect(systemMessage.content).toContain(
      'Return one JSON object with exactly this top-level shape: { semantics, strategies }.'
    )
    expect(systemMessage.content).toContain('strategies must contain exactly 3 entries')

    const payload = JSON.parse(textContent(userMessage)) as {
      grammarCards: Array<{ id: string; sourceRefs?: string[] }>
    }
    const compatibleCards = logoGrammarCards.filter((card) =>
      card.allowedLogoTypes.includes(logoTestBrief.logoType)
    )
    expect(payload.grammarCards.map((card) => card.id)).toEqual(
      compatibleCards.map((card) => card.id)
    )
    expect(payload.grammarCards.every((card) => !('sourceRefs' in card))).toBe(true)
    for (const sourceRef of logoGrammarCards.flatMap((card) => card.sourceRefs)) {
      expect(textContent(userMessage)).not.toContain(sourceRef)
    }
    expect(JSON.stringify(requestMessages(responses))).not.toContain('sk-test')
  })

  test('sends the complete creation output contract with field types and constraints', async () => {
    const responses = responsesWith(validOutput())

    await new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())

    const contract = outputContract(textContent(requestMessages(responses)[0]))
    expect(contract).toMatchObject({
      type: 'object',
      required: ['semantics', 'strategies'],
      additionalProperties: false
    })

    const semantics = schemaProperty(contract, 'semantics')
    expect(semantics).toMatchObject({
      type: 'object',
      required: SEMANTICS_FIELDS,
      additionalProperties: false
    })
    for (const field of SEMANTICS_FIELDS) {
      expect(schemaProperty(semantics, field)).toMatchObject({
        type: 'array',
        maxItems: 12,
        items: { type: 'string', minLength: 1, maxLength: 240 }
      })
    }

    const strategies = schemaProperty(contract, 'strategies')
    expect(strategies).toMatchObject({ type: 'array', minItems: 3, maxItems: 3 })
    const strategy = strategies.items
    expect(strategy).toMatchObject({
      type: 'object',
      required: MODEL_STRATEGY_FIELDS,
      additionalProperties: false
    })
    expect(strategy?.properties).not.toHaveProperty('version')

    const stringFields: Record<string, number> = {
      id: 80,
      nameZh: 40,
      summaryZh: 240,
      coreMetaphor: 240,
      construction: 400,
      silhouette: 240,
      composition: 240,
      colorPlan: 240,
      rationaleZh: 400,
      imagePromptEn: 12000
    }
    for (const [field, maxLength] of Object.entries(stringFields)) {
      expect(schemaProperty(strategy!, field)).toMatchObject({
        type: 'string',
        minLength: 1,
        maxLength
      })
    }

    expect(schemaProperty(strategy!, 'grammarId')).toMatchObject({
      type: 'string',
      enum: logoGrammarCards.map((card) => card.id)
    })
    expect(schemaProperty(strategy!, 'brandEvidence')).toMatchObject({
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'string', minLength: 1, maxLength: 240 }
    })
    expect(schemaProperty(strategy!, 'recommendedRenderStyles')).toMatchObject({
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'string', enum: RENDER_STYLES }
    })
    expect(schemaProperty(strategy!, 'exclusions')).toMatchObject({
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: { type: 'string', minLength: 1, maxLength: 120 }
    })
  })

  test('accepts one complete top-level Markdown JSON fence', async () => {
    const responses = responsesWith(`  \n\`\`\`json\n${validOutput()}\n\`\`\`\n `)

    const revision = await new LogoStrategyService(responses).generate(
      logoTestProvider,
      'sk-test',
      input()
    )

    expect(revision.strategies).toHaveLength(3)
    expect(responses.createText).toHaveBeenCalledTimes(1)
  })

  test('rejects prose outside a fence and repairs from the untouched original output', async () => {
    const originalOutput = `Here is the result:\n\`\`\`json\n${validOutput()}\n\`\`\``
    const responses = responsesWith(originalOutput, validOutput())

    await new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())

    expect(responses.createText).toHaveBeenCalledTimes(2)
    const repairRequest = requestMessages(responses, 1)[1].content
    expect(repairRequest).toContain(originalOutput)
    expect(repairRequest).toContain('JSON parse failed')
  })

  test('repairs invalid JSON once and includes its parse error and full rewrite scope', async () => {
    const originalOutput = 'not json at all'
    const responses = responsesWith(originalOutput, validOutput())

    await new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())

    const repairRequest = requestMessages(responses, 1)[1].content
    expect(repairRequest).toContain(originalOutput)
    expect(repairRequest).toContain('JSON parse failed')
    expect(repairRequest).toContain('Rewrite the full strategy set of exactly 3 strategies.')
    expect(outputContract(textContent(requestMessages(responses, 1)[0]))).toEqual(
      outputContract(textContent(requestMessages(responses)[0]))
    )
  })

  test('repairs Zod-invalid empty IDs as an explicit full strategy-set rewrite', async () => {
    const invalidOutput = JSON.stringify({
      semantics: logoTestSemantics,
      strategies: logoTestRevision.strategies.map((strategy, index) => ({
        ...strategy,
        id: index === 0 ? '' : strategy.id
      }))
    })
    const responses = responsesWith(invalidOutput, validOutput())

    await new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())

    const repairRequest = requestMessages(responses, 1)[1].content
    expect(repairRequest).toContain(invalidOutput)
    expect(repairRequest).toContain('Invalid model output structure')
    expect(repairRequest).toContain('strategies.0.id')
    expect(repairRequest).toContain('Rewrite the full strategy set of exactly 3 strategies.')
  })

  test('repairs only occurrence-safe duplicate strategy IDs reported by the validator', async () => {
    const invalidStrategies = logoTestRevision.strategies.map((strategy) => ({ ...strategy }))
    invalidStrategies[1].grammarId = invalidStrategies[0].grammarId
    const invalidOutput = JSON.stringify({
      semantics: logoTestSemantics,
      strategies: invalidStrategies
    })
    const responses = responsesWith(invalidOutput, validOutput())

    await new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())

    const repairRequest = requestMessages(responses, 1)[1].content
    expect(repairRequest).toContain(invalidOutput)
    expect(repairRequest).toContain('duplicates grammarId')
    expect(repairRequest).toContain('Rewrite only these strategy IDs: ["strategy-frame"].')
  })

  test('repairs ambiguous duplicate IDs by rewriting the full strategy set', async () => {
    const invalidStrategies = logoTestRevision.strategies.map((strategy, index) => ({
      ...strategy,
      id: ['duplicate-id', 'duplicate-id', 'unique-id'][index]
    }))
    const invalidOutput = JSON.stringify({
      semantics: logoTestSemantics,
      strategies: invalidStrategies
    })
    const responses = responsesWith(invalidOutput, validOutput())

    await new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())

    const repairRequest = requestMessages(responses, 1)[1].content
    expect(repairRequest).toContain('duplicates id')
    expect(repairRequest).toContain('Rewrite the full strategy set of exactly 3 strategies.')
  })

  test('throws a visible final issue summary after exactly two invalid model outputs', async () => {
    const responses = responsesWith('{"semantics":{}}', 'still invalid JSON')

    await expect(
      new LogoStrategyService(responses).generate(logoTestProvider, 'sk-test', input())
    ).rejects.toThrow(/策略模型连续两次返回无效结果.*JSON parse failed/)
    expect(responses.createText).toHaveBeenCalledTimes(2)
  })

  test('propagates createText transport errors without retrying', async () => {
    const networkError = new Error('socket closed')
    const createText = vi.fn<OpenAIResponsesClient['createText']>().mockRejectedValue(networkError)

    await expect(
      new LogoStrategyService({ createText }).generate(logoTestProvider, 'sk-test', input())
    ).rejects.toBe(networkError)
    expect(createText).toHaveBeenCalledTimes(1)
  })

  test('replaces one strategy in place while preserving semantics and untouched objects', async () => {
    const existingRevision = replacementRevision(9)
    const responses = responsesWith(validReplacementOutput())

    const revision = await new LogoStrategyService(responses).generate(
      logoTestProvider,
      'sk-test',
      input({ existingRevision, replaceStrategyId: 'strategy-frame', briefVersion: 9 })
    )

    expect(revision.briefVersion).toBe(9)
    expect(revision.strategyVersion).toBe(5)
    expect(revision.grammarLibraryVersion).toBe(1)
    expect(revision.createdAt).toBe(NOW)
    expect(revision.semantics).toBe(existingRevision.semantics)
    expect(revision.strategies[0]).toBe(existingRevision.strategies[0])
    expect(revision.strategies[2]).toBe(existingRevision.strategies[2])
    expect(revision.strategies[1]).toMatchObject({ id: 'strategy-frame', version: 6 })
    expect(revision.selectedStrategyIds).toEqual([
      'strategy-path',
      'strategy-frame',
      'strategy-grid'
    ])

    const [systemMessage, userMessage] = requestMessages(responses)
    expect(systemMessage.content).toContain('strategies must contain exactly 1 entry')
    expect(systemMessage.content).toContain('The single strategy id must remain "strategy-frame".')
    expect(userMessage.content).toContain('"replaceStrategyId":"strategy-frame"')
    const strategiesContract = schemaProperty(
      outputContract(textContent(systemMessage)),
      'strategies'
    )
    expect(strategiesContract).toMatchObject({ type: 'array', minItems: 1, maxItems: 1 })
    expect(strategiesContract.items?.properties).not.toHaveProperty('version')
  })

  test('rejects replacement without an existing revision before calling the API', async () => {
    const responses = responsesWith(validReplacementOutput())

    await expect(
      new LogoStrategyService(responses).generate(
        logoTestProvider,
        'sk-test',
        input({ replaceStrategyId: 'strategy-frame' })
      )
    ).rejects.toThrow(/existingRevision/)
    expect(responses.createText).not.toHaveBeenCalled()
  })

  test('rejects replacement from a stale brief revision before calling the API', async () => {
    const responses = responsesWith(validReplacementOutput())

    await expect(
      new LogoStrategyService(responses).generate(
        logoTestProvider,
        'sk-test',
        input({
          briefVersion: 8,
          existingRevision: replacementRevision(7),
          replaceStrategyId: 'strategy-frame'
        })
      )
    ).rejects.toThrow(
      /strategy validation failed.*existingRevision\.briefVersion.*stale.*full strategy regeneration/i
    )
    expect(responses.createText).not.toHaveBeenCalled()
  })

  test.each([
    ['is absent', replacementRevision(), 'missing-id'],
    [
      'is duplicated',
      {
        ...replacementRevision(),
        strategies: replacementRevision().strategies.map((strategy, index) => ({
          ...strategy,
          id: index < 2 ? 'strategy-path' : strategy.id
        }))
      },
      'strategy-path'
    ]
  ])(
    'rejects replacement when the target %s before calling the API',
    async (_, revision, targetId) => {
      const responses = responsesWith(validReplacementOutput(targetId))

      await expect(
        new LogoStrategyService(responses).generate(
          logoTestProvider,
          'sk-test',
          input({ existingRevision: revision, replaceStrategyId: targetId })
        )
      ).rejects.toThrow(/must uniquely identify one existing strategy/)
      expect(responses.createText).not.toHaveBeenCalled()
    }
  )

  test('repairs a replacement whose id does not preserve the requested target', async () => {
    const responses = responsesWith(
      validReplacementOutput('strategy-surprise'),
      validReplacementOutput()
    )

    await new LogoStrategyService(responses).generate(
      logoTestProvider,
      'sk-test',
      input({ existingRevision: replacementRevision(), replaceStrategyId: 'strategy-frame' })
    )

    const repairRequest = requestMessages(responses, 1)[1].content
    expect(repairRequest).toContain('strategy id must equal "strategy-frame"')
    expect(repairRequest).toContain('Rewrite only replacement strategy ID "strategy-frame".')
  })

  test('keeps replacement repair scoped to the target when validation points at another strategy', async () => {
    const conflictingReplacement = JSON.stringify({
      semantics: logoTestSemantics,
      strategies: [
        {
          ...logoTestRevision.strategies[1],
          grammarId: 'modular-grid',
          construction: logoTestRevision.strategies[2].construction
        }
      ]
    })
    const responses = responsesWith(conflictingReplacement, validReplacementOutput())

    await new LogoStrategyService(responses).generate(
      logoTestProvider,
      'sk-test',
      input({ existingRevision: replacementRevision(), replaceStrategyId: 'strategy-frame' })
    )

    const repairRequest = requestMessages(responses, 1)[1].content
    expect(repairRequest).toContain('strategy-grid')
    expect(repairRequest).toContain('Rewrite only replacement strategy ID "strategy-frame".')
    expect(repairRequest).not.toContain('Rewrite only these strategy IDs: ["strategy-grid"].')
  })
})
