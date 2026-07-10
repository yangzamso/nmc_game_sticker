function luminance(r, g, b) {
  return (r * 299 + g * 587 + b * 114) / 1000
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function imageBrightness(img) {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 16
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, 16, 16)
  const data = ctx.getImageData(0, 0, 16, 16).data
  let total = 0
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    total += luminance(data[i], data[i + 1], data[i + 2])
    count++
  }
  return total / count
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function getRotatedBounds(width, height, rotationDeg = 0) {
  const rad = rotationDeg * Math.PI / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  }
}

function clampItemCenter(centerX, centerY, width, height, rotationDeg, minX, minY, maxX, maxY) {
  const bounds = getRotatedBounds(width, height, rotationDeg)
  const halfW = bounds.width / 2
  const halfH = bounds.height / 2

  return {
    x: clamp(centerX, minX + halfW, maxX - halfW),
    y: clamp(centerY, minY + halfH, maxY - halfH),
  }
}

const PRINT_CHARACTER_SCALE = 1.2
const DEFAULT_PRINT_CHARACTER_SHIFT_LIMIT_X = 0
const WATERGUN_PRINT_CHARACTER_SHIFT_LIMIT_X = 0
const PRINT_CHARACTER_SHIFT_LIMIT_Y = 0
const STRAWBERRY_PRINT_CHARACTER_SHIFT_Y = 30 // 딸기 착용 시에만 적용되는 고정 하향 보정(자동 중앙정렬과는 무관)

function getPrintCharacterShiftLimitX(layout) {
  return layout.props.some((prop) => prop.id === 'item_watergun')
    ? WATERGUN_PRINT_CHARACTER_SHIFT_LIMIT_X
    : DEFAULT_PRINT_CHARACTER_SHIFT_LIMIT_X
}

function getElementBounds(centerX, centerY, width, height, rotationDeg = 0) {
  const rotated = getRotatedBounds(width, height, rotationDeg)
  return {
    left: centerX - rotated.width / 2,
    right: centerX + rotated.width / 2,
    top: centerY - rotated.height / 2,
    bottom: centerY + rotated.height / 2,
  }
}

function getCharacterShift(layout, area, center, renderScale) {
  const shiftLimitX = getPrintCharacterShiftLimitX(layout)
  const boundsList = []
  const charW = Math.round(layout.character.width * renderScale * PRINT_CHARACTER_SCALE)
  const charH = Math.round(layout.character.height * renderScale * PRINT_CHARACTER_SCALE)
  boundsList.push(getElementBounds(center.x, center.y, charW, charH))

  if (layout.costume) {
    boundsList.push(
      getElementBounds(
        center.x + layout.costume.relX * renderScale * PRINT_CHARACTER_SCALE,
        center.y + layout.costume.relY * renderScale * PRINT_CHARACTER_SCALE,
        Math.round(layout.costume.width * renderScale * PRINT_CHARACTER_SCALE),
        Math.round(layout.costume.height * renderScale * PRINT_CHARACTER_SCALE)
      )
    )
  }

  for (const prop of layout.props) {
    const width = Math.round(prop.width * renderScale * PRINT_CHARACTER_SCALE)
    const height = prop.height
      ? Math.round(prop.height * renderScale * PRINT_CHARACTER_SCALE)
      : width
    boundsList.push(
      getElementBounds(
        center.x + prop.relX * renderScale * PRINT_CHARACTER_SCALE,
        center.y + prop.relY * renderScale * PRINT_CHARACTER_SCALE,
        width,
        height,
        prop.rotate ?? 0
      )
    )
  }

  const union = boundsList.reduce((acc, bounds) => ({
    left: Math.min(acc.left, bounds.left),
    right: Math.max(acc.right, bounds.right),
    top: Math.min(acc.top, bounds.top),
    bottom: Math.max(acc.bottom, bounds.bottom),
  }))

  const areaRight = area.x + area.width
  const areaBottom = area.y + area.height
  const allowedDxMin = area.x - union.left
  const allowedDxMax = areaRight - union.right
  const allowedDyMin = area.y - union.top
  const allowedDyMax = areaBottom - union.bottom

  const unionCenterX = (union.left + union.right) / 2
  const unionCenterY = (union.top + union.bottom) / 2
  const desiredDx = center.x - unionCenterX
  const desiredDy = center.y - unionCenterY

  const shiftX = clamp(
    clamp(desiredDx, allowedDxMin, allowedDxMax),
    -shiftLimitX * renderScale,
    shiftLimitX * renderScale
  )
  const shiftY = layout.costume?.id === 'strawberry'
    ? STRAWBERRY_PRINT_CHARACTER_SHIFT_Y * renderScale
    : clamp(
      clamp(desiredDy, allowedDyMin, allowedDyMax),
      -PRINT_CHARACTER_SHIFT_LIMIT_Y * renderScale,
      PRINT_CHARACTER_SHIFT_LIMIT_Y * renderScale
    )

  return { x: shiftX, y: shiftY }
}

async function drawItem(ctx, item, area, printCharacterCenter, renderScale, itemScale = 1) {
  const img = await loadImage(item.image)
  if (!img) return

  const width = Math.round(item.width * renderScale * itemScale)
  const height = item.height
    ? Math.round(item.height * renderScale * itemScale)
    : Math.round(width * (img.naturalHeight / img.naturalWidth))
  const rotation = item.rotate ?? 0
  const flipX = Boolean(item.flipX)

  const unclampedX = printCharacterCenter.x + item.relX * renderScale * itemScale
  const unclampedY = printCharacterCenter.y + item.relY * renderScale * itemScale
  const clampedCenter = clampItemCenter(
    unclampedX,
    unclampedY,
    width,
    height,
    rotation,
    area.x,
    area.y,
    area.x + area.width,
    area.y + area.height
  )

  ctx.save()
  ctx.translate(clampedCenter.x, clampedCenter.y)
  if (flipX) ctx.scale(-1, 1)
  if (rotation) ctx.rotate(rotation * Math.PI / 180)
  ctx.drawImage(img, -width / 2, -height / 2, width, height)
  ctx.restore()
}

export async function capturePhotoCard(stageEl, bgColor = '#ffffff', bgImage = null, layout = null) {
  if (!layout) throw new Error('print layout is required')

  const renderScale = 2
  const sw = Math.round(layout.stageWidth * renderScale)
  const photoH = Math.round(sw * 4 / 3)
  const padH = Math.round(sw * 0.06)
  const padTop = Math.round(sw * 0.14)
  const padBot = Math.round(sw * 0.30)
  const cardW = sw + padH * 2
  const cardH = photoH + padTop + padBot

  const canvas = document.createElement('canvas')
  canvas.width = cardW
  canvas.height = cardH
  const ctx = canvas.getContext('2d')

  const isDefaultWhiteBg = !bgImage && bgColor === '#ffffff'
  ctx.fillStyle = isDefaultWhiteBg ? '#eeeeec' : '#ffffff'
  ctx.fillRect(0, 0, cardW, cardH)

  let bgBrightness = 255
  if (bgImage) {
    const img = await loadImage(bgImage)
    if (img) {
      const scale = sw / img.naturalWidth
      const scaledH = img.naturalHeight * scale
      const drawY = padTop + (photoH - scaledH) / 2
      ctx.save()
      ctx.beginPath()
      ctx.rect(padH, padTop, sw, photoH)
      ctx.clip()
      ctx.drawImage(img, padH, drawY, sw, scaledH)
      ctx.restore()
      bgBrightness = imageBrightness(img)
    }
  } else if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(padH, padTop, sw, photoH)
    bgBrightness = luminance(...hexToRgb(bgColor))
  }

  const logo = await loadImage('/logo-1.png')
  const logoMargin = Math.round(sw * 0.04)
  const logoW = logo ? Math.round(sw * 0.45) : 0
  const logoH = logo ? Math.round(logoW * logo.naturalHeight / logo.naturalWidth) : 0
  const logoBottomY = logo ? logoMargin + logoH : 0
  const charAreaCenterY = (logoBottomY + photoH) / 2 - 10

  const photoArea = { x: padH, y: padTop, width: sw, height: photoH }
  const baseCharacterCenter = {
    x: padH + sw / 2,
    y: padTop + charAreaCenterY,
  }
  const characterShift = getCharacterShift(layout, photoArea, baseCharacterCenter, renderScale)
  const printCharacterCenter = {
    x: baseCharacterCenter.x + characterShift.x,
    y: baseCharacterCenter.y + characterShift.y,
  }

  const charImg = await loadImage('/items/character_base.png')
  const charW = Math.round(layout.character.width * renderScale * PRINT_CHARACTER_SCALE)
  const charH = Math.round(layout.character.height * renderScale * PRINT_CHARACTER_SCALE)
  const charX = printCharacterCenter.x - charW / 2
  const charY = printCharacterCenter.y - charH / 2

  if (charImg) {
    const glowBoost = bgBrightness > 235 ? 1.6
      : bgBrightness > 200 ? 1.35
      : bgBrightness > 160 ? 1.1
      : 1.0
    const closeRepeat = glowBoost > 1.3 ? 3 : glowBoost > 1.05 ? 2 : 1
    const glowLayers = [
      ...Array(closeRepeat).fill({ blur: 3, alpha: 1.0 }),
      ...Array(closeRepeat).fill({ blur: 10, alpha: 1.0 }),
      { blur: 22 * glowBoost, alpha: Math.min(1, 0.8 * glowBoost) },
      { blur: 40 * glowBoost, alpha: Math.min(1, 0.5 * glowBoost) },
      { blur: 60 * glowBoost, alpha: Math.min(1, 0.3 * glowBoost) },
    ]
    for (const { blur, alpha } of glowLayers) {
      ctx.shadowColor = `rgba(255,255,255,${alpha})`
      ctx.shadowBlur = blur
      ctx.drawImage(charImg, charX, charY, charW, charH)
    }
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }

  if (charImg) {
    ctx.drawImage(charImg, charX, charY, charW, charH)
  }

  if (layout.costume) {
    await drawItem(ctx, layout.costume, photoArea, printCharacterCenter, renderScale, PRINT_CHARACTER_SCALE)
  }

  for (const prop of layout.props) {
    await drawItem(ctx, prop, photoArea, printCharacterCenter, renderScale, PRINT_CHARACTER_SCALE)
  }

  if (logo) {
    ctx.drawImage(logo, padH + Math.round((sw - logoW) / 2), padTop + logoMargin, logoW, logoH)
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1
  ctx.strokeRect(padH + 0.5, padTop + 0.5, sw - 1, photoH - 1)

  const captionFontSize = Math.round(sw * 0.20 * 0.28 * 2)
  const centerX = cardW / 2
  const textY = photoH + padTop + padBot / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#222'
  await document.fonts.load(`${captionFontSize}px OngleipEoyeonce`).catch(() => {})
  ctx.font = `${captionFontSize}px OngleipEoyeonce, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
  ctx.fillText('닛몰캐쉬 30번째 생일 축하해', centerX, textY)

  return canvas.toDataURL('image/png')
}

export function downloadPhotoCard(dataUrl) {
  const link = document.createElement('a')
  link.download = `nmc-photocard-${Date.now()}.png`
  link.href = dataUrl
  link.click()
}
