import { readFile } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

describe('renderer Content Security Policy', () => {
  it('allows generated images served through the app asset protocol', async () => {
    const html = await readFile(join(process.cwd(), 'src/renderer/index.html'), 'utf8')
    const csp = html.match(/http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/)?.[1]
    const imgSrc = csp
      ?.split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('img-src'))

    expect(imgSrc?.split(/\s+/)).toContain('bloom-canvas:')
  })
})
