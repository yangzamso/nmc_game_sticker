import { useRef, useState, useCallback, useEffect } from 'react'
import { COSTUMES, PROPS, BACKGROUNDS, CHARACTER_CROP, CHAR_DISPLAY_W, CHAR_DISPLAY_H, SCALE, getCostumeDisplaySize, COSTUME_SCALE_FACTOR } from '../data/costumes'
import { useGameStore } from '../store/gameStore'
import { capturePhotoCard, downloadPhotoCard } from '../utils/savePhotoCard'
import styles from './GameBoard.module.css'

function useCharSize() {
  return { w: CHAR_DISPLAY_W, h: CHAR_DISPLAY_H, scale: SCALE }
}

// 스테이지 경계 내로 좌표 클램핑
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)) }
function clampToStage(x, y, stageR, margin = 20) {
  return {
    x: clamp(x, margin, stageR.width - margin),
    y: clamp(y, margin, stageR.height - margin),
  }
}

// 코너 중 캐릭터에서 가장 먼 곳 랜덤 선택
function farCorner(stageR) {
  const mx = stageR.width * 0.15, my = stageR.height * 0.15
  const corners = [
    { x: mx,                y: my },
    { x: stageR.width - mx, y: my },
    { x: mx,                y: stageR.height - my },
    { x: stageR.width - mx, y: stageR.height - my },
  ]
  const cx = stageR.width / 2, cy = stageR.height / 2
  const sorted = corners.map((c) => ({ ...c, d: Math.hypot(c.x - cx, c.y - cy) })).sort((a, b) => b.d - a.d)
  const best = sorted.filter((c) => c.d >= sorted[0].d - 1)
  const pick = best[Math.floor(Math.random() * best.length)]
  return { x: pick.x + (Math.random() - 0.5) * 30, y: pick.y + (Math.random() - 0.5) * 30 }
}

export function GameBoard() {
  const { equippedId, equip, unequip, bgColor, bgImage, setBg, setBgImage, reset } = useGameStore()
  const stageRef = useRef(null)
  const { w: charW, h: charH, scale: charScale } = useCharSize()

  const [placed, setPlaced] = useState(null)
  const [saving, setSaving] = useState(false)
  const [printData, setPrintData] = useState(null)
  const [stageVisualWidth, setStageVisualWidth] = useState(null)
  const [placedProps, setPlacedProps] = useState([])  // 최대 2개
  const [stageDrag, setStageDrag] = useState(null)
  const [propDrag, setPropDrag] = useState(null)      // { propId, offsetX, offsetY }

  const getStageRect = () => stageRef.current?.getBoundingClientRect()

  // ── 의상 탭: 같은 거 누르면 해제, 다른 거 누르면 교체 ──
  const onCardClick = useCallback((costumeId) => {
    if (placed?.costumeId === costumeId) { unequip(); setPlaced(null); return }
    const stageR = getStageRect()
    if (!stageR) return
    unequip(); equip(costumeId)
    const pos = clampToStage(farCorner(stageR).x, farCorner(stageR).y, stageR)
    setPlaced({ costumeId, ...pos })
  }, [placed, equip, unequip])

  // ── 스테이지 내 의상 드래그 시작 ──
  const onPlacedPointerDown = useCallback((e) => {
    if (!placed) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const stageR = getStageRect()
    setStageDrag({ offsetX: e.clientX - (stageR.left + placed.x), offsetY: e.clientY - (stageR.top + placed.y) })
  }, [placed])

  // ── 소품 탭: 최대 2개, 같은 거 누르면 제거 ──
  const onPropClick = useCallback((propId) => {
    setPlacedProps((prev) => {
      const exists = prev.find((p) => p.propId === propId)
      if (exists) return prev.filter((p) => p.propId !== propId)
      if (prev.length >= 2) return prev
      const stageR = stageRef.current?.getBoundingClientRect()
      if (!stageR) return prev
      const pos = clampToStage(farCorner(stageR).x, farCorner(stageR).y, stageR)
      return [...prev, { propId, ...pos }]
    })
  }, [])

  // ── 스테이지 내 소품 드래그 시작 ──
  const onPropPointerDown = useCallback((e, propId) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const stageR = stageRef.current?.getBoundingClientRect()
    if (!stageR) return
    const prop = placedProps.find((p) => p.propId === propId)
    if (!prop) return
    setPropDrag({ propId, offsetX: e.clientX - (stageR.left + prop.x), offsetY: e.clientY - (stageR.top + prop.y) })
  }, [placedProps])

  // ── 스테이지 내 포인터 이동 ──
  const onStagePointerMove = useCallback((e) => {
    const stageR = getStageRect()
    if (!stageR) return
    if (stageDrag && placed) {
      const raw = { x: e.clientX - stageDrag.offsetX - stageR.left, y: e.clientY - stageDrag.offsetY - stageR.top }
      setPlaced((p) => ({ ...p, ...clampToStage(raw.x, raw.y, stageR) }))
    } else if (propDrag) {
      const raw = { x: e.clientX - propDrag.offsetX - stageR.left, y: e.clientY - propDrag.offsetY - stageR.top }
      const clamped = clampToStage(raw.x, raw.y, stageR)
      setPlacedProps((prev) => prev.map((p) => p.propId === propDrag.propId ? { ...p, ...clamped } : p))
    }
  }, [stageDrag, placed, propDrag])

  // ── 스테이지 내 포인터 업 ──
  const onStagePointerUp = useCallback(() => {
    setStageDrag(null)
    setPropDrag(null)
  }, [])

  const placedCostume = placed ? COSTUMES.find((c) => c.id === placed.costumeId) : null

  const onSave = useCallback(async () => {
    if (!stageRef.current || saving) return
    setSaving(true)
    try {
      const visualW = stageRef.current.getBoundingClientRect().width
      setStageVisualWidth(visualW)
      const dataUrl = await capturePhotoCard(stageRef.current, bgColor, bgImage)
      setPrintData(dataUrl)
    } finally {
      setSaving(false)
    }
  }, [bgColor, bgImage, saving])

  const onPrintDownload = useCallback(() => {
    if (printData) downloadPhotoCard(printData)
    setPrintData(null)
  }, [printData])

  return (
    <div className={styles.board}
      style={bgImage
        ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: bgColor ?? '#2a2a2a' }
      }
    >

      {/* 스테이지 (5.5×8.5cm 포토카드 비율) — 배경 투명 */}
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerLeave={onStagePointerUp}
      >
        {/* 캡처 시 전체 콘텐츠 1.2배 스케일 wrapper */}
        <div className={styles.stageContent}>
          {/* 캐릭터 */}
          <div className={styles.character} style={{ width: charW, height: charH }}>
            <img src="/items/character_base.png" alt="닛몰캐쉬"
              style={{ width: charW, height: charH, objectFit: 'contain', display: 'block' }} />
          </div>

          {/* 배치된 의상 */}
          {placed && placedCostume && (() => {
            const { w, h } = getCostumeDisplaySize(placedCostume, charScale)
            return (
              <img
                src={placedCostume.image} alt=""
                onPointerDown={onPlacedPointerDown}
                style={{
                  position: 'absolute',
                  left: placed.x,
                  top: placed.y,
                  transform: 'translate(-50%,-50%)',
                  width: w, height: h, objectFit: 'fill',
                  cursor: stageDrag ? 'grabbing' : 'grab',
                  touchAction: 'none', userSelect: 'none', zIndex: 10,
                }}
              />
            )
          })()}

          {/* 배치된 소품들 (최대 2개) */}
          {placedProps.map((pp) => {
            const prop = PROPS.find((p) => p.id === pp.propId)
            if (!prop) return null
            return (
              <img key={pp.propId} src={prop.image} alt={prop.name}
                onPointerDown={(e) => onPropPointerDown(e, pp.propId)}
                style={{
                  position: 'absolute',
                  left: pp.x,
                  top: pp.y,
                  transform: `translate(-50%,-50%) rotate(${prop.rotate ?? 0}deg)`,
                  width: Math.round(80 * charScale / SCALE * COSTUME_SCALE_FACTOR * (prop.propScale ?? 1)),
                  objectFit: 'contain',
                  cursor: propDrag?.propId === pp.propId ? 'grabbing' : 'grab',
                  touchAction: 'none', userSelect: 'none', zIndex: 20,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* 초기화 버튼 */}
      {(placed || placedProps.length > 0 || bgColor !== '#ffffff' || bgImage) && (
        <button
          className={`${styles.removeBtn} ${saving ? styles.hidden : ''}`}
          onClick={() => { reset(); setPlaced(null); setPlacedProps([]) }}
        >
          초기화
        </button>
      )}

      {/* 패널 */}
      <div className={styles.panel}>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>의상</p>
          <div className={styles.row}>
            {COSTUMES.map((costume) => {
              const isPlaced = placed?.costumeId === costume.id
              return (
                <div key={costume.id}
                  className={`${styles.card} ${isPlaced ? styles.cardActive : ''}`}
                  onClick={() => onCardClick(costume.id)}>
                  <img src={costume.image} alt={costume.name} className={styles.cardImg} draggable={false} />
                  <span className={styles.cardName}>{costume.name}</span>
                  {isPlaced && <span className={styles.badge}>ON</span>}
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>아이템</p>
          <div className={styles.row}>
            {PROPS.map((prop) => {
              const isPlaced = placedProps.some((p) => p.propId === prop.id)
              const isDisabled = !isPlaced && placedProps.length >= 2
              return (
                <div key={prop.id}
                  className={`${styles.card} ${isPlaced ? styles.cardActive : ''} ${isDisabled ? styles.cardDisabled : ''}`}
                  onClick={() => !isDisabled && onPropClick(prop.id)}>
                  <img src={prop.image} alt={prop.name} className={styles.cardImg} draggable={false} />
                  <span className={styles.cardName}>{prop.name}</span>
                  {isPlaced && <span className={styles.badge}>ON</span>}
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>배경</p>
          <div className={styles.row}>
            {BACKGROUNDS.map((bg) => {
              const isActive = bg.image ? bgImage === bg.image : bgColor === bg.color
              return (
                <div key={bg.id}
                  className={`${styles.bgCard} ${isActive ? styles.bgActive : ''}`}
                  onClick={() => bg.image ? setBgImage(bg.image) : setBg(bg.color)}>
                  {bg.image
                    ? <img src={bg.image} alt={bg.label} className={styles.bgImgThumb} />
                    : <div className={styles.bgSwatch} style={{ background: bg.color }} />
                  }
                  <span className={styles.cardName}>{bg.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.saveSection}>
          <button className={styles.saveBtn} disabled={saving} onClick={onSave}>
            {saving ? '저장 중...' : '📸 저장!'}
          </button>
        </div>

      </div>

      {/* 프린트 애니메이션 오버레이 */}
      {printData && (() => {
        // 프린터 이미지 비율: 265×302
        // 슬롯 너비 비율: 200/265 ≈ 75.5%  /  슬롯 위치: y=95/302 ≈ 31.5%
        const SLOT_W_RATIO = 200 / 265
        const SLOT_Y_RATIO = 95 / 302
        // 카드: 스테이지 너비 고정 / 프린터: 카드 대비 독립적으로 크게
        const cardW    = Math.round((stageVisualWidth ?? 160) * 0.8)
        const printerW = Math.round(window.innerWidth * 0.92)
        const printerH = Math.round(printerW * 302 / 265)
        const cardH    = Math.round(cardW * 4 / 3)
        const slotY    = Math.round(printerH * SLOT_Y_RATIO)
        // 씬 전체 높이 = 슬롯 위치 + 카드 높이
        const sceneH   = slotY + cardH
        return (
          <div className={styles.printOverlay} onClick={() => setPrintData(null)}>
            <div
              className={styles.printScene}
              style={{ position: 'relative', width: printerW, height: sceneH }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Layer 4 (back): printer.png — 카드 뒤에 위치 */}
              <img src="/printer.png" alt=""
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 1, display: 'block' }} />

              {/* Layer 3: 커버 배경 — 슬롯 위 영역을 가려 카드가 프린터 안에 있는 느낌 */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: slotY, background: 'transparent', zIndex: 3,
              }} />

              {/* 포토카드 — 슬롯(slotY)에서 나옴, z=2 */}
              <div style={{
                position: 'absolute', top: slotY,
                left: '50%', transform: 'translateX(-50%)',
                width: cardW, zIndex: 2,
              }}>
                <img src={printData} alt="포토카드"
                  className={styles.printCard} onClick={onPrintDownload} />
              </div>

              {/* Layer 1 (front): printer-top.png — 슬롯 투명 영역으로 카드가 보임 */}
              <img src="/printer-top.png" alt=""
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 4, display: 'block' }} />
            </div>
            <p className={styles.printHint}>탭해서 저장</p>
          </div>
        )
      })()}
    </div>
  )
}
