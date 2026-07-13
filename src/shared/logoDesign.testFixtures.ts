import type {
  LogoBrandBriefV2,
  LogoBrandSemantics,
  LogoDesignRevision,
  LogoDesignStrategy,
  LogoStrategyPromptPack
} from './logoDesign'
import type { ProviderConfig } from './types'

export const logoTestBrief: LogoBrandBriefV2 = {
  brandName: '生花',
  brandNameAlt: 'BloomCanvas',
  shortName: 'BC',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者把想法转化为图片',
  targetAudience: '个人创作者和小团队',
  brandKeywords: ['清晰', '创造力'],
  differentiator: '轻量、直接的创作流程',
  avoidedElements: ['复杂花瓣'],
  preferredColors: ['蓝色'],
  avoidedColors: ['墨绿色'],
  logoType: 'combination-mark',
  usageScenarios: ['app-icon', 'website']
}

export const logoTestSemantics: LogoBrandSemantics = {
  functionalTruths: ['帮助创作者把想法转化为图片'],
  emotionalQualities: ['清晰', '创造力'],
  differentiators: ['轻量、直接的创作流程'],
  audienceSignals: ['个人创作者和小团队'],
  usableMetaphors: ['创作路径', '开放画布'],
  literalMetaphorRisks: ['花瓣', '叶片'],
  industryCliches: ['AI sparkle', 'robot head'],
  usageConstraints: ['readable at 32px', 'works as an app icon']
}

export function logoTestStrategy(overrides: Partial<LogoDesignStrategy> = {}): LogoDesignStrategy {
  return {
    id: 'strategy-path',
    version: 1,
    nameZh: '连续创作路径',
    summaryZh: '用一条展开路径表达从想法到画面的过程。',
    grammarId: 'continuous-path',
    brandEvidence: ['帮助创作者把想法转化为图片'],
    coreMetaphor: 'an unfolding creative path',
    construction: 'one broad continuous ribbon with two turns',
    silhouette: 'compact open loop',
    composition: 'centered with a stable lower-left anchor',
    colorPlan: 'one solid blue with a monochrome fallback',
    recommendedRenderStyles: ['flat-monochrome', 'flat-duotone'],
    exclusions: ['flower petals', 'leaves', 'pseudo-text'],
    rationaleZh: '连续路径对应创作流程，不依赖品牌名中的花。',
    imagePromptEn: 'Create exactly one standalone logo mark.',
    ...overrides
  }
}

export const logoTestRevision: LogoDesignRevision = {
  briefVersion: 1,
  strategyVersion: 1,
  grammarLibraryVersion: 1,
  semantics: logoTestSemantics,
  strategies: [
    logoTestStrategy(),
    logoTestStrategy({
      id: 'strategy-frame',
      nameZh: '开放画布入口',
      grammarId: 'frame-threshold',
      coreMetaphor: 'an open canvas threshold',
      construction: 'one bold open frame with an offset inner plane'
    }),
    logoTestStrategy({
      id: 'strategy-grid',
      nameZh: '生成模块',
      grammarId: 'modular-grid',
      coreMetaphor: 'small inputs becoming one visual system',
      construction: 'three solid modules aligned into one compact boundary'
    })
  ],
  selectedStrategyIds: ['strategy-path', 'strategy-frame', 'strategy-grid'],
  createdAt: '2026-07-13T00:00:00.000Z'
}

export const logoTestPromptPack: LogoStrategyPromptPack = {
  sourceBriefVersion: 1,
  sourceStrategyVersion: 1,
  sourcePromptVersion: 1,
  grammarLibraryVersion: 1,
  directions: logoTestRevision.strategies.map((strategy) => ({
    strategyId: strategy.id,
    strategyNameZh: strategy.nameZh,
    grammarId: strategy.grammarId,
    sourceBriefVersion: 1,
    sourceStrategyVersion: strategy.version,
    sourcePromptVersion: 1,
    renderStyle: strategy.recommendedRenderStyles[0],
    finalPrompt: `Create exactly one standalone logo mark. ${strategy.construction}`,
    customized: false
  }))
}

export const logoTestProvider: ProviderConfig = {
  id: 'provider-1',
  name: 'OpenAI Compatible',
  baseUrl: 'https://api.example.test/v1',
  imageModel: 'gpt-image-2',
  promptModel: 'gpt-5.5',
  hasApiKey: true,
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z'
}
