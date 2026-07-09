import { describe, expect, test } from 'vitest'
import { buildLogoPromptPack } from './logoPromptCompiler'

describe('buildLogoPromptPack', () => {
  test('builds one base prompt and one final prompt per style direction', () => {
    const pack = buildLogoPromptPack({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助个人创作者用 AI 生成图片',
      targetAudience: '个人创作者和小团队',
      brandKeywords: ['清晰', '创造力'],
      preferredColors: ['蓝色'],
      avoidedColors: ['墨绿色'],
      avoidElements: '避免复杂花瓣和细碎纹理',
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal', 'symbolic-mark'],
      usageScenarios: ['app-icon', 'website'],
      referenceImageIds: [],
      referenceNote: '参考图只作为简洁程度参考'
    })

    expect(pack.basePrompt).toContain('生花')
    expect(pack.basePrompt).toContain('simple, scalable, clean vector-like logo')
    expect(pack.basePrompt).toContain('works at 64px and 32px')
    expect(pack.basePrompt).toContain('no tiny decorative elements')
    expect(pack.directions).toHaveLength(2)
    expect(pack.directions[0].finalPrompt).toContain(pack.basePrompt)
    expect(pack.directions[0].finalPrompt).toContain('现代极简')
  })

  test('keeps premium and tech styles constrained to simple logo language', () => {
    const pack = buildLogoPromptPack({
      brandName: 'NorthPeak',
      industry: '户外装备',
      businessDescription: '面向城市通勤和轻户外的装备品牌',
      brandKeywords: ['可靠'],
      logoTypes: ['symbol-mark'],
      styleDirections: ['tech', 'premium-restraint'],
      referenceImageIds: []
    })

    const finalPrompts = pack.directions.map((item) => item.finalPrompt).join('\n')

    expect(finalPrompts).toContain('avoid complex lines')
    expect(finalPrompts).toContain('avoid metallic effects')
  })
})
