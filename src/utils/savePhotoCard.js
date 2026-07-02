import html2canvas from 'html2canvas'

// 캡처된 캔버스에서 불투명 픽셀의 bounding box 계산
function getNonTransparentBounds(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width, minY = height, maxX = 0, maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (minX > maxX || minY > maxY) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

export async function capturePhotoCard(stageEl, bgColor = '#ffffff', bgImage = null) {
  // 스테이지는 transparent이므로 캐릭터/의상만 캡처
  const captured = await html2canvas(stageEl, {
    backgroundColor: null,
    useCORS: true,
    scale: 2,
    logging: false,
  })

  const sw = captured.width
  const sh = captured.height

  const padH   = Math.round(sw * 0.06)
  const padTop  = Math.round(sw * 0.14)
  const padBot  = Math.round(sw * 0.20)
  const cardW   = sw + padH * 2
  const cardH   = sh + padTop + padBot

  const canvas = document.createElement('canvas')
  canvas.width  = cardW
  canvas.height = cardH
  const ctx = canvas.getContext('2d')

  // 카드 전체 흰 배경
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cardW, cardH)

  // 스테이지 영역에 배경 적용
  if (bgImage) {
    await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { ctx.drawImage(img, padH, padTop, sw, sh); resolve() }
      img.onerror = resolve
      img.src = bgImage
    })
  } else if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(padH, padTop, sw, sh)
  }

  // 캐릭터 실제 픽셀 bounding box 계산 → 의상 포함 실제 높이/너비 기준으로 중앙 배치
  const bounds = getNonTransparentBounds(captured)
  const CHAR_SCALE = 1.2

  let drawX, drawY, scaledW, scaledH, srcX, srcY, srcW, srcH
  if (bounds) {
    srcX = bounds.x; srcY = bounds.y; srcW = bounds.w; srcH = bounds.h
    scaledW = Math.round(srcW * CHAR_SCALE)
    scaledH = Math.round(srcH * CHAR_SCALE)
    // 카드 스테이지 영역 중앙에 배치
    drawX = padH + Math.round((sw - scaledW) / 2)
    drawY = padTop + Math.round((sh - scaledH) / 2)
  } else {
    // 캐릭터 없을 때 fallback
    srcX = 0; srcY = 0; srcW = sw; srcH = sh
    scaledW = Math.round(sw * CHAR_SCALE)
    scaledH = Math.round(sh * CHAR_SCALE)
    drawX = padH - Math.round((scaledW - sw) / 2)
    drawY = padTop - Math.round((scaledH - sh) / 2)
  }

  // 아웃그로우 — 흰색 shadow 여러 단계로 캐릭터 윤곽 따라 발광
  const glowLayers = [
    { blur: 3,  alpha: 1.0 },
    { blur: 10, alpha: 1.0 },
    { blur: 22, alpha: 0.8 },
    { blur: 40, alpha: 0.5 },
    { blur: 60, alpha: 0.3 },
  ]
  for (const { blur, alpha } of glowLayers) {
    ctx.shadowColor = `rgba(255,255,255,${alpha})`
    ctx.shadowBlur  = blur
    ctx.drawImage(captured, srcX, srcY, srcW, srcH, drawX, drawY, scaledW, scaledH)
  }
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur  = 0

  // 캐릭터/의상 최종 선명하게 합성
  ctx.drawImage(captured, srcX, srcY, srcW, srcH, drawX, drawY, scaledW, scaledH)

  // 사진 영역 연한 테두리 — 흰 배경과 자연스럽게 구분
  ctx.strokeStyle = 'rgba(0,0,0,0.10)'
  ctx.lineWidth   = 1
  ctx.strokeRect(padH + 1, padTop + 1, sw - 2, sh - 2)

  const centerX = cardW / 2
  const textY   = sh + padTop + padBot * 0.45
  ctx.textAlign  = 'center'
  ctx.fillStyle  = '#222'
  ctx.font       = `bold ${Math.round(padBot * 0.28)}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
  ctx.fillText('2026 닛몰캐쉬 생일축하해!', centerX, textY)

  return canvas.toDataURL('image/png')
}

export function downloadPhotoCard(dataUrl) {
  const link = document.createElement('a')
  link.download = `nmc-photocard-${Date.now()}.png`
  link.href = dataUrl
  link.click()
}
