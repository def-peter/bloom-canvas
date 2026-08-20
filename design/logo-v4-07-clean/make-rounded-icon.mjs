import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const directory = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(directory, '07-final-third-palette-compact-depth.png')
const canvasSize = 1024
const panelInset = 24
const panelSize = canvasSize - panelInset * 2
const panelRadius = 216
const markSize = 760

const panel = Buffer.from(`
  <svg width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="${panelInset}"
      y="${panelInset}"
      width="${panelSize}"
      height="${panelSize}"
      rx="${panelRadius}"
      fill="#ffffff"
      stroke="#edf0f4"
      stroke-width="2"
    />
  </svg>
`)

const { data: mark, info } = await sharp(sourcePath)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 4 })
  .resize({ width: markSize, height: markSize, fit: 'inside' })
  .png()
  .toBuffer({ resolveWithObject: true })

const outputPath = join(directory, '07-final-rounded-white.png')

await sharp({
  create: {
    width: canvasSize,
    height: canvasSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite([
    { input: panel },
    {
      input: mark,
      left: Math.round((canvasSize - info.width) / 2),
      top: Math.round((canvasSize - info.height) / 2)
    }
  ])
  .png()
  .toFile(outputPath)

await Promise.all([
  sharp(outputPath).resize(256, 256).png().toFile(join(directory, '07-final-rounded-white-256.png')),
  sharp(outputPath).resize(64, 64).png().toFile(join(directory, '07-final-rounded-white-64.png')),
  sharp(outputPath).resize(32, 32).png().toFile(join(directory, '07-final-rounded-white-32.png'))
])
