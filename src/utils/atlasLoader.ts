import type { AtlasFrame } from '@/types/animation'
import { Rectangle, Texture } from 'pixi.js'

export interface ParsedAtlasFrame {
  name: string
  bounds: AtlasFrame
  offsets?: AtlasFrame
  rotate?: number
}

export interface AtlasInfo {
  imagePath: string
  size: { w: number; h: number }
  scale: number
  frames: ParsedAtlasFrame[]
}

export async function loadAtlas(atlasPath: string): Promise<AtlasInfo> {
  try {
    const response = await fetch(atlasPath)
    const atlasText = await response.text()

    return parseAtlasText(atlasText)
  } catch (error) {
    console.error('Failed to load atlas:', error)
    throw new Error(`Failed to load atlas from ${atlasPath}`)
  }
}

export function parseAtlasText(atlasText: string): AtlasInfo {
  const lines = atlasText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let imagePath = ''
  let size = { w: 0, h: 0 }
  let scale = 1
  const frames: ParsedAtlasFrame[] = []

  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.endsWith('.png')) {
      imagePath = line
    } else if (line.startsWith('size:')) {
      const [w, h] = line.substring(5).split(',').map(Number)
      size = { w, h }
    } else if (line.startsWith('scale:')) {
      scale = parseFloat(line.substring(6))
    } else if (line.startsWith('filter:') || line.startsWith('repeat:')) {
    } else {
      break
    }
    i++
  }

  while (i < lines.length) {
    const frameName = lines[i]
    i++

    let bounds: AtlasFrame | null = null
    let offsets: AtlasFrame | undefined
    let rotate: number | undefined

    while (i < lines.length && lines[i].includes(':')) {
      const line = lines[i]

      if (line.startsWith('bounds:')) {
        const [x, y, w, h] = line.substring(7).split(',').map(Number)
        bounds = { x, y, w, h }
      } else if (line.startsWith('offsets:')) {
        const [x, y, w, h] = line.substring(8).split(',').map(Number)
        offsets = { x, y, w, h }
      } else if (line.startsWith('rotate:')) {
        rotate = parseInt(line.substring(7))
      }

      i++
    }

    if (bounds) {
      frames.push({
        name: frameName,
        bounds,
        offsets,
        rotate,
      })
    }
  }

  return {
    imagePath,
    size,
    scale,
    frames,
  }
}

export function createPixiTextures(
  baseTexture: Texture,
  atlasInfo: AtlasInfo,
): Record<string, Texture> {
  const textures: Record<string, Texture> = {}

  atlasInfo.frames.forEach((frame) => {
    const { name, bounds, rotate } = frame

    const texture = new Texture({
      source: baseTexture.source,
      frame: new Rectangle(bounds.x, bounds.y, bounds.w, bounds.h),
      rotate: rotate === 90 ? 2 : 0,
    })

    textures[name] = texture
  })

  return textures
}

export function groupFramesByPrefix(frames: ParsedAtlasFrame[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}

  frames.forEach((frame) => {
    const match = frame.name.match(/^(.+?)(\d+)$/)
    if (match) {
      const prefix = match[1]
      if (!groups[prefix]) {
        groups[prefix] = []
      }
      groups[prefix].push(frame.name)
    } else {
      if (!groups[frame.name]) {
        groups[frame.name] = []
      }
      groups[frame.name].push(frame.name)
    }
  })

  Object.keys(groups).forEach((key) => {
    groups[key].sort()
  })

  return groups
}
