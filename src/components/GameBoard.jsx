import { useRef, useState, useCallback, useEffect } from 'react'
import { COSTUMES, PROPS, BACKGROUNDS, CHARACTER_CROP, CHAR_DISPLAY_W, CHAR_DISPLAY_H, CHAR_WIDTH_RATIO, SCALE, getCostumeDisplaySize, COSTUME_SCALE_FACTOR } from '../data/costumes'
import { useGameStore } from '../store/gameStore'
import { useSessionStore } from '../store/sessionStore'
import { capturePhotoCard } from '../utils/savePhotoCard'
import { PrintOverlay } from './PrintOverlay'
import { WORN_OFFSET, CHAR_IMG_W as CATCH_CHAR_IMG_W, clampWornOffset } from '../games/CatchGame'
import styles from './GameBoard.module.css'

const charNatW = CHARACTER_CROP.x2 - CHARACTER_CROP.x1
const charNatH = CHARACTER_CROP.y2 - CHARACTER_CROP.y1

const SNAP_RADIUS = 12 // 캐릭터의 "정위치"에서 이 반경(px) 안으로 드래그하면 자동으로 착 붙음 (모바일 터치 오차 감안)

// 캐릭터 중심 좌표 — .character의 CSS(left:50%, top:calc(57.99% + 25px))와 반드시 동일해야 함
function getCharacterCenter(stageR) {
  return { x: stageR.width / 2, y: stageR.height * 0.5799 + 25 }
}

// 캐치캐치(WORN_OFFSET)에 저장된 옷별 착용 좌표를, 현재 스테이지의 캐릭터 크기(charW)에 맞게
// 환산해 "정위치"를 구하고, 드래그 좌표가 SNAP_RADIUS 안이면 그 정위치로 스냅한다.
// WORN_OFFSET은 캐치캐치 캐릭터 표시폭(CATCH_CHAR_IMG_W=140px) 기준이라 charW/140 비율로 스케일링.
function snapToWornPosition(costumeId, pos, stageR, charW) {
  const offset = WORN_OFFSET[costumeId]
  if (!offset) return pos
  const clampedOffset = clampWornOffset(offset)
  const scale = charW / CATCH_CHAR_IMG_W
  const center = getCharacterCenter(stageR)
  const target = {
    x: center.x + clampedOffset.dx * scale,
    y: center.y + clampedOffset.dy * scale,
  }
  const dist = Math.hypot(pos.x - target.x, pos.y - target.y)
  return dist <= SNAP_RADIUS ? target : pos
}

// 스테이지 실측 폭 기준으로 캐릭터 크기를 계산 — 기기마다 스테이지 크기가 달라도 항상 같은 비율로 보이게 함
// (stageWidth가 아직 측정되지 않은 첫 렌더에서는 고정값(CHAR_DISPLAY_W/H)으로 폴백)
function useCharSize(stageWidth) {
  if (!stageWidth) return { w: CHAR_DISPLAY_W, h: CHAR_DISPLAY_H, scale: CHAR_DISPLAY_W / charNatW }
  const w = Math.round(stageWidth * CHAR_WIDTH_RATIO)
  const h = Math.round(w * (charNatH / charNatW))
  return { w, h, scale: w / charNatW }
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
  const slots = useSessionStore((s) => s.slots)
  const backToHub = useSessionStore((s) => s.backToHub)
  const ownedIds = Object.values(slots).filter(Boolean)
  const ownedCostumes = COSTUMES.filter((c) => ownedIds.includes(c.id))
  const stageRef = useRef(null)
  const boardRef = useRef(null)

  const [placed, setPlaced] = useState(null)
  const [saving, setSaving] = useState(false)
  const [printData, setPrintData] = useState(null)
  const [placedProps, setPlacedProps] = useState([])  // 최대 2개
  const [stageDrag, setStageDrag] = useState(null)
  const [propDrag, setPropDrag] = useState(null)      // { propId, offsetX, offsetY }
  const [stageWidth, setStageWidth] = useState(null)

  const { w: charW, h: charH, scale: charScale } = useCharSize(stageWidth)

  const getStageRect = () => stageRef.current?.getBoundingClientRect()

  // 스테이지 실측 폭 추적 — svh 기반이라 기기별로 값이 다르고, 리사이즈/방향전환 시에도 갱신
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => setStageWidth(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
      const clamped = clampToStage(raw.x, raw.y, stageR)
      const snapped = snapToWornPosition(placed.costumeId, clamped, stageR, charW)
      setPlaced((p) => ({ ...p, ...snapped }))
    } else if (propDrag) {
      const raw = { x: e.clientX - propDrag.offsetX - stageR.left, y: e.clientY - propDrag.offsetY - stageR.top }
      const clamped = clampToStage(raw.x, raw.y, stageR)
      setPlacedProps((prev) => prev.map((p) => p.propId === propDrag.propId ? { ...p, ...clamped } : p))
    }
  }, [stageDrag, placed, propDrag, charW])

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
      const dataUrl = await capturePhotoCard(stageRef.current, bgColor, bgImage)
      setPrintData(dataUrl)
    } finally {
      setSaving(false)
    }
  }, [bgColor, bgImage, saving])

  return (
    <div ref={boardRef} className={styles.board}
      style={bgImage
        ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat' }
        : { backgroundColor: bgColor ?? '#ffffff' }
      }
    >

      {/* 코디 영역 로고 — 스테이지가 아니라 board 기준 좌측 상단 (화면 비율에 따라 스테이지가 좁아져도 위치 고정) */}
      <img src="/logo-1.png" alt="NEED MORE CASH — 2026 HBD CAFE"
        className={styles.boardLogo} draggable={false} />

      {/* 스테이지 (5.5×8.5cm 포토카드 비율) — 배경은 화면 폭 전체에 깔고(.board), 스테이지 자체는 투명하게 유지 */}
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

      {/* 초기화 버튼 — 스테이지 우측 하단 원형 리셋 아이콘 (스테이지는 4:5라 stageHeight = stageWidth*5/4) */}
      {(placed || placedProps.length > 0 || bgColor !== '#ffffff' || bgImage) && (
        <button
          className={`${styles.removeBtn} ${saving ? styles.hidden : ''}`}
          style={{ top: stageWidth ? Math.round(stageWidth * 5 / 4) - 52 : undefined }}
          onClick={() => { reset(); setPlaced(null); setPlacedProps([]) }}
          aria-label="초기화"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 1 3 6.7" />
            <path d="M3 16v-4h4" />
          </svg>
        </button>
      )}

      {/* 패널 */}
      <div className={styles.panel}>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>의상</p>
          <div className={styles.row}>
            {ownedCostumes.map((costume) => {
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
          <button className={styles.prevBtn} disabled={saving} onClick={backToHub}>이전</button>
          <button className={styles.saveBtn} disabled={saving} onClick={onSave}>
            {saving ? '인쇄 중...' : '📸 인쇄!'}
          </button>
        </div>

      </div>

      {/* 프린트 애니메이션 오버레이 */}
      {printData && (
        <PrintOverlay
          printData={printData}
          boardRef={boardRef}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  )
}
