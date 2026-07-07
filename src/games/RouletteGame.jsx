import { useEffect, useRef, useState } from 'react'
import { COSTUMES } from '../data/costumes'
import styles from './RouletteGame.module.css'

// 옷 5종 + 꽝 1칸 = 총 6칸
const WHEEL_ITEMS = [
  ...COSTUMES.filter((c) => c.id !== 'strawberry'),
  { id: 'blank', name: '꽝', image: null },
]
const SEGMENT_DEG = 360 / WHEEL_ITEMS.length // 60도
const RADIUS = 90 // 중심 방향으로 10px 이동 (기존 100px)
const FAST_SPIN_MS = 1500
const EXTRA_SPINS = 3
const DECEL_MS = 1800
const SETTLE_DELAY_MS = 1000

// 0도 = 12시 방향(위쪽), 시계방향. 각 칸의 정중앙 각도(경계선이 아니라 부채꼴 중앙)
function itemAngle(index) {
  return index * SEGMENT_DEG + SEGMENT_DEG / 2
}

function chipPosition(index) {
  const rad = (itemAngle(index) * Math.PI) / 180
  return { x: RADIUS * Math.sin(rad), y: -RADIUS * Math.cos(rad) }
}

// 시작 시 "아저씨" 칸이 핀에 걸리도록 초기 회전값 계산
const AJUSSI_INDEX = WHEEL_ITEMS.findIndex((c) => c.id === 'ajussi')
const INITIAL_ROTATION = ((-itemAngle(AJUSSI_INDEX)) % 360 + 360) % 360

// 슬롯3 원형 룰렛 — START를 누르면 판이 빠르게 돌다가 일정 시간 후 자동으로 감속하며 멈춘다 (원탭).
// 핀은 12시 방향에 고정. 멈추면 목표 칸을 미리 정해두고 점점 느려지며 자연스럽게 걸리도록 감속 애니메이션 재생.
// 다 멈춘 뒤 1초 정도 결과를 보여준 다음, 꽝이거나 이미 보유한 옷이면 재도전 안내, 새 옷이면 onResult로 확정.
// 이미 클리어된 슬롯(재도전)은 어디서 멈추든 원래 옷 그대로 확정.
export function RouletteGame({ ownedIds, alreadyCleared, onResult }) {
  const [spinning, setSpinning] = useState(false)
  const [settling, setSettling] = useState(false)
  const [showingResult, setShowingResult] = useState(false)
  const [rotation, setRotation] = useState(INITIAL_ROTATION)
  const [retryMsg, setRetryMsg] = useState('')
  const intervalRef = useRef(null)
  const timeoutsRef = useRef([])
  const rotationRef = useRef(INITIAL_ROTATION)

  useEffect(() => () => {
    clearInterval(intervalRef.current)
    timeoutsRef.current.forEach(clearTimeout)
  }, [])

  function handleStart() {
    setRetryMsg('')
    setSpinning(true)
    intervalRef.current = setInterval(() => {
      rotationRef.current += 22
      setRotation(rotationRef.current)
    }, 20)

    const t0 = setTimeout(settleToResult, FAST_SPIN_MS)
    timeoutsRef.current.push(t0)
  }

  function settleToResult() {
    clearInterval(intervalRef.current)
    setSpinning(false)

    // 목표 칸을 미리 정하고, 그 칸에 자연스럽게 걸리도록 회전량을 계산
    // 이미 클리어된 슬롯(재도전)은 반드시 원래 옷에서 멈추도록 목표를 고정
    const targetIndex = alreadyCleared
      ? WHEEL_ITEMS.findIndex((c) => c.id === alreadyCleared)
      : Math.floor(Math.random() * WHEEL_ITEMS.length)
    const currentMod = ((rotationRef.current % 360) + 360) % 360
    const desiredMod = ((-itemAngle(targetIndex)) % 360 + 360) % 360
    let delta = desiredMod - currentMod
    if (delta < 0) delta += 360
    const finalRotation = rotationRef.current + delta + EXTRA_SPINS * 360

    rotationRef.current = finalRotation
    setSettling(true)
    setRotation(finalRotation)

    const t1 = setTimeout(() => {
      setSettling(false)
      setShowingResult(true)

      const t2 = setTimeout(() => {
        setShowingResult(false)
        if (alreadyCleared) {
          onResult(alreadyCleared)
          return
        }
        const landed = WHEEL_ITEMS[targetIndex]
        if (landed.id === 'blank') {
          setRetryMsg('꽝! 다시 돌려주세요')
        } else if (ownedIds.includes(landed.id)) {
          setRetryMsg('이미 보유한 옷이에요! 다시 돌려주세요')
        } else {
          onResult(landed.id)
        }
      }, SETTLE_DELAY_MS)
      timeoutsRef.current.push(t2)
    }, DECEL_MS)
    timeoutsRef.current.push(t1)
  }

  const wheelTransition = settling ? `transform ${DECEL_MS}ms cubic-bezier(0.12, 0.8, 0.24, 1)` : 'none'

  return (
    <div className={styles.roulette}>
      <div className={styles.wheelWrap}>
        <div className={styles.pin} />
        <div className={styles.wheel} style={{ transform: `rotate(${rotation}deg)`, transition: wheelTransition }}>
          {WHEEL_ITEMS.map((c, i) => {
            const { x, y } = chipPosition(i)
            return (
              <div
                key={c.id}
                className={styles.chip}
                style={{
                  // 부채꼴 정중앙 각도를 머리 방향으로 — 판과 함께 돌아가며 항상 중심에서 바깥쪽을 향함
                  transform: `translate(${x}px, ${y}px) rotate(${itemAngle(i)}deg)`,
                }}
              >
                {c.id === 'blank' ? (
                  <span className={styles.blankText}>꽝</span>
                ) : (
                  <img src={c.image} alt={c.name} className={styles.chipImg} />
                )}
              </div>
            )
          })}
        </div>
        <div className={styles.hub} />
      </div>

      {retryMsg && <p className={styles.duplicateMsg}>{retryMsg}</p>}

      <button
        className={styles.startBtn}
        onClick={handleStart}
        disabled={spinning || settling || showingResult}
        style={{ visibility: spinning || settling || showingResult ? 'hidden' : 'visible' }}
      >
        START
      </button>
    </div>
  )
}
