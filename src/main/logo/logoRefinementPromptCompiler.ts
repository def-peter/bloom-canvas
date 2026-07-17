import type { BuildLogoRefinementPromptInput } from '../../shared/logoDesign'

function operationInstruction(input: BuildLogoRefinementPromptInput): string {
  const brandName = input.brief.brandName
  switch (input.operation) {
    case 'custom':
      return input.mode === 'preserve-structure'
        ? 'Preserve the exact dominant silhouette and core geometry; change only color, stroke weight, corner radius, spacing, or proportion as requested.'
        : 'Continue exploring, but keep the same core metaphor and grammar; local geometry may be reconstructed where needed, but do not switch to another concept.'
    case 'add-brand-name':
      if (!['combination-mark', 'emblem'].includes(input.brief.logoType)) {
        throw new Error(
          `Logo type ${input.brief.logoType} does not support brand text in this step`
        )
      }
      return input.brief.logoType === 'emblem'
        ? `Add exactly this full brand name inside the approved emblem outline: ${brandName}; no slogan and no additional text. Treat this as a raster typography draft.`
        : `Add exactly this full brand name: ${brandName}. Create one balanced symbol-and-name lockup, with no slogan and no additional text. Treat this as a raster typography draft.`
    case 'horizontal-lockup':
      return `Keep the reference symbol unchanged and create one horizontal lockup using exactly this full brand name: ${brandName}; no slogan and no additional text.`
    case 'application-style':
      return `Create one ${input.renderStyle ?? 'restrained application-style'} presentation while keeping the flat master geometry from the reference image unchanged.`
    case 'monochrome':
      return 'Convert the mark to strict pure black and white only. Do not reconstruct or decorate the geometry.'
  }
}

export function buildLogoRefinementPrompt(input: BuildLogoRefinementPromptInput): string {
  return [
    'Use the supplied reference image as the authoritative structure source.',
    `Approved strategy: ${input.strategy.nameZh}; core metaphor: ${input.strategy.coreMetaphor}; grammar: ${input.strategy.grammarId}.`,
    `Source design prompt: ${input.sourcePrompt.finalPrompt}`,
    operationInstruction(input),
    input.instruction.trim() ? `User revision request: ${input.instruction.trim()}` : '',
    'Output exactly one standalone logo result on a clean neutral background.',
    'Do not output a mockup, poster, scene, option sheet, presentation board, watermark, or unrelated text.'
  ]
    .filter(Boolean)
    .join('\n')
}
