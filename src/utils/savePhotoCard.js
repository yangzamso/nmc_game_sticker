import html2canvas from 'html2canvas'

// 밝기(0~255) — 배경이 밝을수록(파스텔 등) 흰색 아웃그로우의 대비가 약해지므로 보정에 사용
function luminance(r, g, b) {
  return (r * 299 + g * 587 + b * 114) / 1000
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// 이미지를 16x16으로 축소해 평균 밝기 계산
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
  // 라이브 미리보기용 배경(색/이미지)이 .board(스테이지의 부모)에 인라인 스타일로 걸려있어서,
  // html2canvas로 스테이지를 그대로 캡처하면 배경까지 같이 찍혀 캐릭터 바운딩박스가 캔버스
  // 전체로 오염되는 문제가 있었음. 캡처 직전 스테이지 자신과 부모의 배경을 잠깐 지웠다가
  // 즉시 복원해서 캐릭터/의상만 순수하게 캡처
  const elsToClear = [stageEl, stageEl.parentElement].filter(Boolean)
  const prevStyles = elsToClear.map((el) => ({
    background: el.style.background,
    backgroundImage: el.style.backgroundImage,
    backgroundColor: el.style.backgroundColor,
  }))
  for (const el of elsToClear) {
    el.style.background = 'none'
    el.style.backgroundImage = 'none'
    el.style.backgroundColor = 'transparent'
  }

  let captured
  try {
    captured = await html2canvas(stageEl, {
      backgroundColor: null,
      useCORS: true,
      scale: 2,
      logging: false,
    })
  } finally {
    elsToClear.forEach((el, i) => {
      el.style.background = prevStyles[i].background
      el.style.backgroundImage = prevStyles[i].backgroundImage
      el.style.backgroundColor = prevStyles[i].backgroundColor
    })
  }

  const sw = captured.width
  const sh = captured.height
  // 사진 영역은 코디 스테이지(1:1)의 실제 캡처 비율과 무관하게 항상 3:4 고정
  // — 코디 편집 화면 모양이 바뀌어도 인쇄되는 포토카드 비율은 흔들리지 않도록 분리
  const photoH = Math.round(sw * 4 / 3)

  const padH   = Math.round(sw * 0.06)
  const padTop  = Math.round(sw * 0.14)
  const padBot  = Math.round(sw * 0.30)
  const cardW   = sw + padH * 2
  const cardH   = photoH + padTop + padBot

  const canvas = document.createElement('canvas')
  canvas.width  = cardW
  canvas.height = cardH
  const ctx = canvas.getContext('2d')

  // 카드 전체 배경 — "기본"(흰색) 배경 선택 시에만 사진 영역과 구분되도록 라이트 그레이 사용
  const isDefaultWhiteBg = !bgImage && bgColor === '#ffffff'
  ctx.fillStyle = isDefaultWhiteBg ? '#eeeeec' : '#ffffff'
  ctx.fillRect(0, 0, cardW, cardH)

  // 스테이지 영역에 배경 적용 — 너비에 비율을 맞추고, 세로는 넘치는 만큼 잘라 가운데 정렬(cover 방식)
  // bgBrightness는 아래 아웃그로우 강도를 배경 밝기에 맞춰 보정하는 데 사용
  let bgBrightness = 255
  if (bgImage) {
    await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
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
        resolve()
      }
      img.onerror = resolve
      img.src = bgImage
    })
  } else if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(padH, padTop, sw, photoH)
    bgBrightness = luminance(...hexToRgb(bgColor))
  }

  // 사진 상단 중앙 로고 워터마크 — 사진 폭의 30%
  const logo = await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo-1.png'
  })
  const logoMargin = Math.round(sw * 0.04)
  const logoW = logo ? Math.round(sw * 0.40) : 0
  const logoH = logo ? Math.round(logoW * logo.naturalHeight / logo.naturalWidth) : 0
  // 로고 하단(padTop 기준 상대좌표) ~ 사진 하단 사이의 정중앙에 캐릭터를 배치.
  // 의상에 따라 캐릭터 높이(scaledH)가 달라져도 항상 이 구간의 중앙에 오도록 매번 재계산됨
  const logoBottomY = logo ? logoMargin + logoH : 0
  const charAreaCenterY = (logoBottomY + photoH) / 2

  // 캐릭터 실제 픽셀 bounding box 계산 → 의상 포함 실제 높이/너비 기준으로 중앙 배치
  const bounds = getNonTransparentBounds(captured)
  // 인쇄 캐릭터 크기도 코디 화면과 동일한 SCALE(0.5) 기준으로 맞춤 — 카드 밖으로 벗어나던 문제 수정
  const CHAR_SCALE = 1.2

  let drawX, drawY, scaledW, scaledH, srcX, srcY, srcW, srcH
  if (bounds) {
    srcX = bounds.x; srcY = bounds.y; srcW = bounds.w; srcH = bounds.h
    scaledW = Math.round(srcW * CHAR_SCALE)
    scaledH = Math.round(srcH * CHAR_SCALE)
    // 로고 하단 ~ 사진 하단 구간의 정중앙에 배치 (카드 폭 기준 가운데 정렬)
    drawX = padH + Math.round((sw - scaledW) / 2)
    drawY = padTop + Math.round(charAreaCenterY - scaledH / 2)
  } else {
    // 캐릭터 없을 때 fallback
    srcX = 0; srcY = 0; srcW = sw; srcH = sh
    scaledW = Math.round(sw * CHAR_SCALE)
    scaledH = Math.round(sh * CHAR_SCALE)
    drawX = padH - Math.round((scaledW - sw) / 2)
    drawY = padTop + Math.round(charAreaCenterY - scaledH / 2)
  }

  // 아웃그로우 — 흰색 shadow 여러 단계로 캐릭터 윤곽 따라 발광
  // 배경이 밝을수록(파스텔 등) 흰 글로우와의 대비가 약해지므로, 밝기에 비례해 번짐 범위/농도를 보정.
  // alpha는 레이어당 1.0이 최대라 그것만으론 더 진해지지 않으므로, 가까운 레이어를 여러 번 겹쳐
  // 그려서(합성 누적) 테두리 바로 옆이 실제로 더 뽀얗게 채워지도록 함
  const glowBoost = bgBrightness > 235 ? 1.6
    : bgBrightness > 200 ? 1.35
    : bgBrightness > 160 ? 1.1
    : 1.0
  const closeRepeat = glowBoost > 1.3 ? 3 : glowBoost > 1.05 ? 2 : 1
  const glowLayers = [
    ...Array(closeRepeat).fill({ blur: 3,  alpha: 1.0 }),
    ...Array(closeRepeat).fill({ blur: 10, alpha: 1.0 }),
    { blur: 22 * glowBoost, alpha: Math.min(1, 0.8 * glowBoost) },
    { blur: 40 * glowBoost, alpha: Math.min(1, 0.5 * glowBoost) },
    { blur: 60 * glowBoost, alpha: Math.min(1, 0.3 * glowBoost) },
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

  // 로고를 사진 상단 정중앙에 합성 (여백 4%)
  if (logo) {
    ctx.drawImage(logo, padH + Math.round((sw - logoW) / 2), padTop + logoMargin, logoW, logoH)
  }

  // 사진 영역 연한 회색 테두리 — 흰/색 배경 모두와 자연스럽게 구분
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth   = 1
  ctx.strokeRect(padH + 0.5, padTop + 0.5, sw - 1, photoH - 1)

  // 글자 크기는 여백 확장 전 비율(0.20) 기준으로 고정 — 흰 영역만 넓어지고 글자 크기는 그대로
  const captionFontSize = Math.round(sw * 0.20 * 0.28 * 2)
  const centerX = cardW / 2
  const textY   = photoH + padTop + padBot / 2
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle  = '#222'
  // 캔버스는 @font-face 로드를 자동으로 기다리지 않으므로 그리기 전에 명시적으로 로드
  await document.fonts.load(`${captionFontSize}px OngleipEoyeonce`).catch(() => {})
  ctx.font = `${captionFontSize}px OngleipEoyeonce, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
  ctx.fillText('닛몰캐쉬 30살 생일 축하해!', centerX, textY)

  return canvas.toDataURL('image/png')
}

export function downloadPhotoCard(dataUrl) {
  const link = document.createElement('a')
  link.download = `nmc-photocard-${Date.now()}.png`
  link.href = dataUrl
  link.click()
}
