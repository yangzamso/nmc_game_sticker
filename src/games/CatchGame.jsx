import { useEffect, useRef, useState } from 'react'
import { COSTUMES, CHARACTER_CROP, getCostumeDisplaySize } from '../data/costumes'
import styles from './CatchGame.module.css'

// 옷 5종 (딸기 제외)
const ITEMS = COSTUMES.filter((c) => c.id !== 'strawberry')
const TICK_MS = 180 // 옷이 바뀌는 간격 (제자리에서 빠르게 순환)
const SETTLE_DELAY_MS = 800

// 제시된 목표 옷일 때만 성공 — 아직 안 가진 옷(딸기 제외) 중에서만 목표로 뽑음
function pickTarget(ownedIds) {
  const pool = ITEMS.filter((c) => !ownedIds.includes(c.id))
  const source = pool.length > 0 ? pool : ITEMS
  return source[Math.floor(Math.random() * source.length)]
}

// 시작 시 "아저씨" 칸이 보이도록 초기값 고정
const AJUSSI_INDEX = ITEMS.findIndex((c) => c.id === 'ajussi')

// .characterImg의 실제 표시 너비(CSS)와 동일해야 옷 배율이 캐릭터와 일치함
// CHAR_IMG_W/WORN_OFFSET을 export하는 이유: GameBoard.jsx(코디 화면)에서 옷을 드래그해 캐릭터
// 근처로 가져가면 이 좌표로 자동 스냅되도록 재사용함 (2026-07-09)
export const CHAR_IMG_W = 140
const CHAR_NAT_W = CHARACTER_CROP.x2 - CHARACTER_CROP.x1
const CHAR_SCALE = CHAR_IMG_W / CHAR_NAT_W
const WORN_OFFSET_LIMITS = {
  minDx: -18,
  maxDx: 18,
  minDy: -35,
  maxDy: 24,
}

// 의상별 착용 위치 보정(화면 표시 px 기준, dx: 오른쪽 +, dy: 아래로 +). 기본값(중앙 정렬)은 캐릭터와
// 의상 이미지의 "중심"을 맞추는데, 의상마다 이미지 안에서 모자~옷 여백이 달라 그대로 겹치면 안경/옷깃이
// 몸과 어긋난다. public/dev-tools/worn-offset-tuner.html 에서 실측 후 값을 복사해 붙여넣으면 됨.
export const WORN_OFFSET = {
  raito: { dx: 2, dy: -19 },
  detective: { dx: 9, dy: -19 },
  ajussi: { dx: 2, dy: -6 },
  bungae: { dx: -2, dy: -3 },
  wolf: { dx: 2, dy: 20 },
  // 딸기는 캐치캐치 풀에는 없지만(럭키드로우 전용), GameBoard.jsx 코디 화면 드래그 스냅에 재사용됨
  strawberry: { dx: 1, dy: -35 },
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

export function clampWornOffset(offset = {}) {
  return {
    dx: clamp(offset.dx ?? 0, WORN_OFFSET_LIMITS.minDx, WORN_OFFSET_LIMITS.maxDx),
    dy: clamp(offset.dy ?? 0, WORN_OFFSET_LIMITS.minDy, WORN_OFFSET_LIMITS.maxDy),
  }
}

// 슬롯4 캐치캐치 — 캐릭터 위에 옷이 입혀진 채로 제자리에서 빠르게 순환 전환되고,
// 진입 시 제시된 목표 옷(아직 안 가진 옷 중 랜덤)에 STOP으로 정확히 멈춰야 성공, 다른 옷에서 멈추면 재도전.
// 이미 클리어된 슬롯(재도전)은 목표와 무관하게 정지 타이밍과 상관없이 항상 원래 옷으로 스냅되어 확정된다.
export function CatchGame({ ownedIds, alreadyCleared, onResult }) {
  const [target] = useState(() => pickTarget(ownedIds))
  const [index, setIndex] = useState(AJUSSI_INDEX)
  const [swapKey, setSwapKey] = useState(0)
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [showingResult, setShowingResult] = useState(false)
  const [retryMsg, setRetryMsg] = useState('')
  const intervalRef = useRef(null)
  const timeoutsRef = useRef([])
  const indexRef = useRef(AJUSSI_INDEX)

  useEffect(() => () => {
    clearInterval(intervalRef.current)
    timeoutsRef.current.forEach(clearTimeout)
  }, [])

  function showIndex(nextIndex) {
    indexRef.current = nextIndex
    setIndex(nextIndex)
    setSwapKey((k) => k + 1)
  }

  function handleStart() {
    setRetryMsg('')
    setStarted(true)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      showIndex((indexRef.current + 1) % ITEMS.length)
    }, TICK_MS)
  }

  function handleStop() {
    clearInterval(intervalRef.current)
    setRunning(false)

    // 재도전(이미 클리어된 슬롯)은 정지 타이밍과 무관하게 원래 옷 칸으로 스냅
    if (alreadyCleared) {
      showIndex(ITEMS.findIndex((c) => c.id === alreadyCleared))
    }

    setShowingResult(true)
    const landedId = alreadyCleared || ITEMS[indexRef.current].id

    const t = setTimeout(() => {
      setShowingResult(false)
      if (alreadyCleared) {
        onResult(alreadyCleared)
        return
      }
      if (landedId === target.id) {
        onResult(landedId)
      } else {
        setRetryMsg('목표 옷이 아니에요. 다시 도전해주세요.')
      }
    }, SETTLE_DELAY_MS)
    timeoutsRef.current.push(t)
  }

  const current = ITEMS[index]
  const currentSize = getCostumeDisplaySize(current, CHAR_SCALE)
  const { dx: wornDx = 0, dy: wornDy = 0 } = clampWornOffset(WORN_OFFSET[current.id])
  const displayTarget = alreadyCleared ? ITEMS.find((c) => c.id === alreadyCleared) : target

  return (
    <div className={styles.catch}>
      <div className={styles.targetRow}>
        <span className={styles.targetLabel}>{alreadyCleared ? '이 게임은 클리어 했습니다.' : '이 옷에 멈춰보세요!'}</span>
        <div className={styles.targetChip}>
          <img src={displayTarget.image} alt={displayTarget.name} className={styles.targetImg} />
          <span className={styles.targetName}>{displayTarget.name}</span>
        </div>
      </div>

      <div className={styles.stage}>
        <img src="/items/character_base.png" alt="닛몰캐쉬" className={styles.characterImg} draggable={false} />
        {started && (
          <div
            key={swapKey}
            className={styles.wornItem}
            style={{ '--wornDx': `${wornDx}px`, '--wornDy': `${wornDy}px` }}
          >
            <img
              src={current.image}
              alt={current.name}
              className={styles.wornImg}
              style={{ width: currentSize.w, height: currentSize.h }}
            />
          </div>
        )}
      </div>

      <p className={styles.duplicateMsg} style={{ visibility: retryMsg ? 'visible' : 'hidden' }}>
        {retryMsg || ' '}
      </p>

      {!running && !showingResult && (
        <button className={styles.startBtn} onClick={handleStart}>START</button>
      )}
      {running && (
        <button className={styles.stopBtn} onClick={handleStop}>STOP</button>
      )}
      {!running && showingResult && (
        <button className={styles.startBtn} style={{ visibility: 'hidden' }}>START</button>
      )}
    </div>
  )
}
