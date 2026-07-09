import { useEffect, useRef, useState } from 'react'
import { COSTUMES, CHARACTER_CROP, getCostumeDisplaySize } from '../data/costumes'
import styles from './CatchGame.module.css'

// 옷 5종 (꽝 없이 항상 옷이 나옴 — 룰렛과 달리 재도전은 "이미 보유"인 경우만 발생)
const ITEMS = COSTUMES.filter((c) => c.id !== 'strawberry')
const TICK_MS = 110 // 옷이 바뀌는 간격 (제자리에서 빠르게 순환)
const SETTLE_DELAY_MS = 800

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
  minDy: -28,
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
// START로 시작해 STOP을 누르는 순간 그 시점에 캐릭터가 입고 있던 옷이 결과로 확정된다.
// 재도전/보상 로직은 룰렛(슬롯3)과 유사하되 꽝이 없어, 이미 보유한 옷이면 재도전, 새 옷이면 캡슐 가챠로 확정.
// 이미 클리어된 슬롯(재도전)은 정지 타이밍과 무관하게 항상 원래 옷으로 스냅되어 확정된다.
export function CatchGame({ ownedIds, alreadyCleared, onResult }) {
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
      if (ownedIds.includes(landedId)) {
        setRetryMsg('이미 보유한 옷이에요. 다시 도전해주세요.')
      } else {
        onResult(landedId)
      }
    }, SETTLE_DELAY_MS)
    timeoutsRef.current.push(t)
  }

  const current = ITEMS[index]
  const currentSize = getCostumeDisplaySize(current, CHAR_SCALE)
  const { dx: wornDx = 0, dy: wornDy = 0 } = clampWornOffset(WORN_OFFSET[current.id])

  return (
    <div className={styles.catch}>
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
