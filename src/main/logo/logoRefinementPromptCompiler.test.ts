import { describe, expect, test } from 'vitest'
import {
  logoTestBrief,
  logoTestPromptPack,
  logoTestRevision
} from '../../shared/logoDesign.testFixtures'
import type { BuildLogoRefinementPromptInput } from '../../shared/logoDesign'
import { buildLogoRefinementPrompt } from './logoRefinementPromptCompiler'

const input: BuildLogoRefinementPromptInput = {
  brief: logoTestBrief,
  strategy: logoTestRevision.strategies[0],
  sourcePrompt: logoTestPromptPack.directions[0],
  mode: 'preserve-structure',
  operation: 'custom',
  instruction: '改成蓝色，转角更圆润'
}

describe('buildLogoRefinementPrompt', () => {
  test('locks the silhouette in preserve-structure mode', () => {
    const prompt = buildLogoRefinementPrompt(input)

    expect(prompt).toContain('Preserve the exact dominant silhouette and core geometry')
    expect(prompt).toContain(
      'change only color, stroke weight, corner radius, spacing, or proportion'
    )
  })

  test('allows local reconstruction in explore mode without changing the strategy', () => {
    const prompt = buildLogoRefinementPrompt({ ...input, mode: 'explore' })

    expect(prompt).toContain('keep the same core metaphor and grammar')
    expect(prompt).toContain('local geometry may be reconstructed')
  })

  test('adds only the exact full brand name for combination preview', () => {
    const prompt = buildLogoRefinementPrompt({ ...input, operation: 'add-brand-name' })

    expect(prompt).toContain('Add exactly this full brand name: 生花')
    expect(prompt).toContain('no slogan and no additional text')
    expect(prompt).toContain('raster typography draft')
  })

  test('rejects adding brand text to a symbol-only type', () => {
    expect(() =>
      buildLogoRefinementPrompt({
        ...input,
        brief: { ...logoTestBrief, logoType: 'symbol-mark' },
        operation: 'add-brand-name'
      })
    ).toThrow(/does not support brand text/)
  })
})
