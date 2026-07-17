import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('renderer HTML application identity', () => {
  it('uses the BloomCanvas product name as the document title', async () => {
    const html = await readFile(resolve(__dirname, 'index.html'), 'utf8')

    expect(html).toContain('<title>BloomCanvas</title>')
    expect(html).not.toContain('<title>Electron</title>')
  })
})
