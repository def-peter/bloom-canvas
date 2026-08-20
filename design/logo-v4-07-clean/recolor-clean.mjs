import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const directory = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(directory, '..', 'logo-v3-generated', '06-bold-cutout.png')

const variants = [
  {
    id: 'a-clean-vivid',
    left: ['#ff6b5c', '#ff3e9d'],
    upper: ['#ff3fb4', '#9c42ff'],
    lower: ['#7a48ff', '#1f7cff', '#00cfff'],
    center: '#ff5b7f'
  },
  {
    id: 'b-electric-bloom',
    left: ['#ff4d2e', '#ff207d'],
    upper: ['#ff1db1', '#7c2cff'],
    lower: ['#6430ff', '#006cff', '#00e0ff'],
    center: '#ffb000'
  },
  {
    id: 'c-pixso-bright',
    left: ['#ff8a6a', '#fa66d0'],
    upper: ['#fa66d0', '#b14bea'],
    lower: ['#7536ff', '#4b98ff', '#3ab8ff'],
    center: '#fe76a5'
  },
  {
    id: 'd-prism-pop',
    left: ['#ff5f1f', '#ff2e88'],
    upper: ['#ff2dd1', '#8b37ff'],
    lower: ['#5c2cff', '#147dff', '#00d9d1'],
    center: '#fff04a'
  },
  {
    id: 'e-solid-signal',
    left: ['#ff4f66', '#ff4f66'],
    upper: ['#df35ff', '#df35ff'],
    lower: ['#3378ff', '#3378ff'],
    center: '#20d7ff'
  },
  {
    id: 'final-deep-clean',
    left: ['#ff665d', '#ed3baa'],
    upper: ['#e53bc4', '#9136e4'],
    lower: ['#6333e7', '#3379ed', '#19a8ef'],
    center: '#ef4d8d'
  },
  {
    id: 'final-soft-depth',
    left: ['#ff7168', '#f04ab0'],
    upper: ['#e94ac8', '#9b43e7'],
    lower: ['#7044ea', '#4183ef', '#2baff1'],
    center: '#f15b96',
    sharpContact: true,
    shadow: true
  },
  {
    id: 'final-soft-depth-v2',
    left: ['#ff7168', '#f04ab0'],
    upper: ['#e94ac8', '#9b43e7'],
    lower: ['#7044ea', '#4183ef', '#2baff1'],
    center: '#f15b96',
    curvedContact: true,
    shadow: true
  },
  {
    id: 'final-soft-depth-v3',
    left: ['#ff7168', '#f04ab0'],
    upper: ['#e94ac8', '#9b43e7'],
    lower: ['#7044ea', '#4183ef', '#2baff1'],
    center: '#f15b96',
    bezierContact: true,
    shadow: true
  },
  {
    id: 'final-third-palette-directional-depth',
    left: ['#ff8a6a', '#fa66d0'],
    upper: ['#fa66d0', '#b14bea'],
    lower: ['#7536ff', '#4b98ff', '#3ab8ff'],
    center: '#fe76a5',
    bezierContact: true,
    directionalDepth: true
  },
  {
    id: 'final-third-palette-compact-depth',
    left: ['#ff8a6a', '#fa66d0'],
    upper: ['#fa66d0', '#b14bea'],
    lower: ['#7536ff', '#4b98ff', '#3ab8ff'],
    center: '#fe76a5',
    bezierContact: true,
    compactDirectionalDepth: true
  }
]

function parseHex(hex) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
}

function clamp(value) {
  return Math.max(0, Math.min(1, value))
}

function lerp(start, end, amount) {
  return Math.round(start + (end - start) * amount)
}

function sampleGradient(stops, amount) {
  const colors = stops.map(parseHex)
  const position = clamp(amount) * (colors.length - 1)
  const index = Math.min(colors.length - 2, Math.floor(position))
  const localAmount = position - index
  return colors[index].map((channel, channelIndex) =>
    lerp(channel, colors[index + 1][channelIndex], localAmount)
  )
}

function distanceToSegment(x, y, startX, startY, endX, endY) {
  const deltaX = endX - startX
  const deltaY = endY - startY
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  const amount = clamp(((x - startX) * deltaX + (y - startY) * deltaY) / lengthSquared)
  return Math.hypot(x - (startX + amount * deltaX), y - (startY + amount * deltaY))
}

function triangleCoverage(x, y, points) {
  const [a, b, c] = points
  const side = (start, end) =>
    (x - end[0]) * (start[1] - end[1]) - (start[0] - end[0]) * (y - end[1])
  const sides = [side(a, b), side(b, c), side(c, a)]
  const inside = !(sides.some((value) => value < 0) && sides.some((value) => value > 0))
  if (!inside) return 0

  const edgeDistance = Math.min(
    distanceToSegment(x, y, ...a, ...b),
    distanceToSegment(x, y, ...b, ...c),
    distanceToSegment(x, y, ...c, ...a)
  )
  return clamp((edgeDistance + 0.35) / 1.35)
}

function sampleCurve(points, y) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    if (y < current[0] || y > next[0]) continue

    const previous = points[Math.max(0, index - 1)]
    const following = points[Math.min(points.length - 1, index + 2)]
    const amount = (y - current[0]) / (next[0] - current[0])
    const amountSquared = amount * amount
    const amountCubed = amountSquared * amount
    return 0.5 * (
      2 * current[1]
      + (-previous[1] + next[1]) * amount
      + (2 * previous[1] - 5 * current[1] + 4 * next[1] - following[1]) * amountSquared
      + (-previous[1] + 3 * current[1] - 3 * next[1] + following[1]) * amountCubed
    )
  }

  return null
}

function curvedContactBoundary(y) {
  const upper = [
    [660, 678],
    [675, 645],
    [690, 615],
    [705, 585],
    [719, 564]
  ]
  const lower = [
    [719, 564],
    [730, 595],
    [745, 640],
    [760, 679]
  ]
  return sampleCurve(y <= 719 ? upper : lower, y)
}

function curvedContactCoverage(x, y) {
  const boundary = curvedContactBoundary(y)
  if (boundary === null || x > 720 || x < boundary - 0.5) return 0
  return clamp(x - boundary + 0.5)
}

function cubicBezier(start, controlA, controlB, end, amount) {
  const inverse = 1 - amount
  return inverse ** 3 * start
    + 3 * inverse ** 2 * amount * controlA
    + 3 * inverse * amount ** 2 * controlB
    + amount ** 3 * end
}

function sampleBezierAtY(points, y) {
  let low = 0
  let high = 1

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const amount = (low + high) / 2
    const currentY = cubicBezier(
      points[0][1],
      points[1][1],
      points[2][1],
      points[3][1],
      amount
    )
    if (currentY < y) low = amount
    else high = amount
  }

  return cubicBezier(
    points[0][0],
    points[1][0],
    points[2][0],
    points[3][0],
    (low + high) / 2
  )
}

function bezierContactBoundary(y) {
  const upper = [
    [738, 645],
    [662, 665],
    [590, 700],
    [564, 719]
  ]
  const lower = [
    [564, 719],
    [595, 727],
    [670, 740],
    [680, 760]
  ]

  if (y >= 645 && y <= 719) return sampleBezierAtY(upper, y)
  if (y > 719 && y <= 760) return sampleBezierAtY(lower, y)
  return null
}

function bezierContactCoverage(x, y) {
  const boundary = bezierContactBoundary(y)
  if (boundary === null || x > 820 || x < boundary - 0.5) return 0
  return clamp(x - boundary + 0.5)
}

async function addSoftShadow(output, width, height) {
  const alpha = await sharp(output, {
    raw: { width, height, channels: 4 }
  })
    .extractChannel(3)
    .blur(13)
    .raw()
    .toBuffer()
  const shadow = Buffer.alloc(output.length)
  const offsetY = 8

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const targetIndex = (y * width + x) * 4
      const sourceY = y - offsetY
      const shadowAlpha = sourceY >= 0 ? alpha[sourceY * width + x] : 0
      shadow[targetIndex] = 58
      shadow[targetIndex + 1] = 35
      shadow[targetIndex + 2] = 92
      shadow[targetIndex + 3] = Math.round(shadowAlpha * 0.14)
    }
  }

  return sharp(shadow, {
    raw: { width, height, channels: 4 }
  })
    .composite([{ input: output, raw: { width, height, channels: 4 } }])
    .png()
    .toBuffer()
}

async function addDirectionalDepth(output, width, height, compact = false) {
  const lit = Buffer.from(output)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      if (lit[index + 3] === 0) continue

      const lightPosition = clamp((x / width - 0.22) / 0.62)
      const highlight = 0.045 * (1 - lightPosition) ** 1.8
      const shade = 0.12 * lightPosition ** 1.65

      for (let channel = 0; channel < 3; channel += 1) {
        const highlighted = lerp(lit[index + channel], 255, highlight)
        lit[index + channel] = Math.round(highlighted * (1 - shade))
      }
    }
  }

  const source = sharp(lit, { raw: { width, height, channels: 4 } })
  const broadBlur = compact ? 11 : 18
  const tightBlur = compact ? 4 : 6
  const [broadAlpha, tightAlpha] = await Promise.all([
    source.clone().extractChannel(3).blur(broadBlur).raw().toBuffer(),
    source.clone().extractChannel(3).blur(tightBlur).raw().toBuffer()
  ])
  const shadow = Buffer.alloc(output.length)
  const broadOffsetX = compact ? 9 : 14
  const broadOffsetY = compact ? 4 : 6
  const tightOffsetX = compact ? 4 : 7
  const tightOffsetY = compact ? 2 : 3

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const broadX = x - broadOffsetX
      const broadY = y - broadOffsetY
      const tightX = x - tightOffsetX
      const tightY = y - tightOffsetY
      const broad = broadX >= 0 && broadY >= 0
        ? broadAlpha[broadY * width + broadX]
        : 0
      const tight = tightX >= 0 && tightY >= 0
        ? tightAlpha[tightY * width + tightX]
        : 0

      shadow[index] = 52
      shadow[index + 1] = 39
      shadow[index + 2] = 82
      shadow[index + 3] = Math.min(255, Math.round(broad * 0.17 + tight * 0.12))
    }
  }

  return sharp(shadow, {
    raw: { width, height, channels: 4 }
  })
    .composite([{ input: lit, raw: { width, height, channels: 4 } }])
    .png()
    .toBuffer()
}

function classify(r, g, b, x, y) {
  if (r > 80 && r > g * 1.3 && r > b * 1.25) return y > 0.535 ? 'lower' : 'upper'
  if (g > 70 && b > 80 && g > r * 1.2 && b > r * 1.2) return 'center'
  return (x < 0.47 && y < 0.64) || (y < 0.48 && x < 0.54) ? 'left' : 'lower'
}

function createCleanLabels(data, width, height) {
  const total = width * height
  const labels = new Int32Array(total)
  const queue = new Int32Array(total)
  const sizes = [0]
  let nextLabel = 0

  for (let start = 0; start < total; start += 1) {
    if (labels[start] !== 0 || data[start * 4 + 3] <= 8) continue

    nextLabel += 1
    let head = 0
    let tail = 0
    let size = 0
    queue[tail++] = start
    labels[start] = nextLabel

    while (head < tail) {
      const pixel = queue[head++]
      size += 1
      const x = pixel % width
      const y = Math.floor(pixel / width)

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue
          const nextX = x + offsetX
          const nextY = y + offsetY
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
          const nextPixel = nextY * width + nextX
          if (labels[nextPixel] !== 0 || data[nextPixel * 4 + 3] <= 8) continue
          labels[nextPixel] = nextLabel
          queue[tail++] = nextPixel
        }
      }
    }

    sizes[nextLabel] = size
  }

  return { labels, sizes }
}

const source = sharp(sourcePath).ensureAlpha()
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true })
const { labels, sizes } = createCleanLabels(data, info.width, info.height)

for (const variant of variants) {
  const output = Buffer.alloc(data.length)
  const center = parseHex(variant.center)

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4
    const x = (pixel % info.width) / info.width
    const y = Math.floor(pixel / info.width) / info.height
    const alpha = data[index + 3]
    const label = labels[pixel]
    const centerDistance = Math.hypot(x - 504 / info.width, y - 719 / info.height)
    const centerRadius = 60 / info.width
    const centerFeather = 1.5 / info.width
    const connectorAlpha = variant.sharpContact
      ? triangleCoverage(pixel % info.width, Math.floor(pixel / info.width), [
          [560, 707],
          [591, 679],
          [675, 735]
        ])
      : 0
    const curvedAlpha = variant.curvedContact
      ? curvedContactCoverage(pixel % info.width, Math.floor(pixel / info.width))
      : 0
    const bezierAlpha = variant.bezierContact
      ? bezierContactCoverage(pixel % info.width, Math.floor(pixel / info.width))
      : 0
    const contactAlpha = Math.max(connectorAlpha, curvedAlpha, bezierAlpha)

    if (centerDistance <= centerRadius + centerFeather) {
      output[index] = center[0]
      output[index + 1] = center[1]
      output[index + 2] = center[2]
      output[index + 3] = Math.round(clamp((centerRadius + centerFeather - centerDistance) / (centerFeather * 2)) * 255)
      continue
    }

    const originalGroup = alpha > 8
      ? classify(data[index], data[index + 1], data[index + 2], x, y)
      : null
    const contactBoundary = variant.bezierContact
      ? bezierContactBoundary(Math.floor(pixel / info.width))
      : variant.curvedContact
        ? curvedContactBoundary(Math.floor(pixel / info.width))
        : null

    if (
      variant.bezierContact
      && contactAlpha === 0
      && pixel % info.width > 650
      && pixel % info.width < 720
      && Math.floor(pixel / info.width) > 640
      && Math.floor(pixel / info.width) < 680
    ) {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      output[index + 3] = 0
      continue
    }

    if (
      contactBoundary !== null
      && originalGroup === 'lower'
      && pixel % info.width < contactBoundary - 0.5
    ) {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      output[index + 3] = 0
      continue
    }

    if (contactAlpha === 0 && (alpha <= 8 || label === 0 || sizes[label] < 200)) {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      output[index + 3] = 0
      continue
    }

    const group = contactAlpha > 0
      ? 'lower'
      : originalGroup
    let color

    if (
      group === 'left'
      && ((x > 0.43 && y > 0.53) || (x > 0.5 && y > 0.5))
    ) {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      output[index + 3] = 0
      continue
    }

    if (group === 'center') {
      output[index] = 0
      output[index + 1] = 0
      output[index + 2] = 0
      output[index + 3] = 0
      continue
    } else if (group === 'left') {
      color = sampleGradient(variant.left, (y - 0.16) / 0.46)
    } else if (group === 'upper') {
      color = sampleGradient(variant.upper, (x - 0.4) / 0.42)
    } else {
      color = sampleGradient(variant.lower, (x - 0.28) / 0.55)
    }

    output[index] = color[0]
    output[index + 1] = color[1]
    output[index + 2] = color[2]
    output[index + 3] = Math.max(
      Math.round(clamp((alpha - 8) / 247) * 255),
      Math.round(contactAlpha * 255)
    )
  }

  const rendered = variant.compactDirectionalDepth
    ? await addDirectionalDepth(output, info.width, info.height, true)
    : variant.directionalDepth
      ? await addDirectionalDepth(output, info.width, info.height)
    : variant.shadow
      ? await addSoftShadow(output, info.width, info.height)
      : output
  const renderedOptions = variant.shadow
    || variant.directionalDepth
    || variant.compactDirectionalDepth
    ? {}
    : { raw: { width: info.width, height: info.height, channels: 4 } }

  await sharp(rendered, renderedOptions).png().toFile(join(directory, `07-${variant.id}.png`))
}
