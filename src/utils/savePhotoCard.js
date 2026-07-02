import html2canvas from 'html2canvas'

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
    ctx.drawImage(captured, padH, padTop, sw, sh)
  }
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur  = 0

  // 캐릭터/의상 최종 선명하게 합성
  ctx.drawImage(captured, padH, padTop, sw, sh)

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
