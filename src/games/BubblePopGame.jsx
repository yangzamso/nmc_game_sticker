import { useEffect, useRef, useState } from 'react'
import { COSTUMES } from '../data/costumes'
import styles from './BubblePopGame.module.css'

// 목표(제시) 옷 후보 — 딸기 포함 6종 전부
const TARGET_ITEMS = COSTUMES
// 방울로 나타날 수 있는 옷 — 딸기 포함 6종 전부
const BUBBLE_ITEMS = COSTUMES
const GOAL = 20
const TIME_LIMIT_MS = 20000
const SPAWN_INTERVAL_MS = 267 // 20초 ÷ 267ms ≈ 총 방울 75개 (70~80개 대비용 여유분)
const BUBBLE_LIFETIME_MS = 3200 // 동시 체공 개수 ≈ LIFETIME/SPAWN_INTERVAL = 12개
const TARGET_PROB = 0.4 // 목표 옷 방울이 나올 확률 (나머지 60%는 디코이 5종에 고르게 분배)

// 하드 모드: 10초 시점에 제시 옷이 한 번 바뀌고, 동시에 목표 확률이 30%로 낮아짐(디코이 비중 증가)
const HARD_PHASE_START_MS = 10000
const HARD_TARGET_PROB = 0.3

function pickBubbleCostumeId(targetId, prob) {
  if (Math.random() < prob) return targetId
  const decoys = BUBBLE_ITEMS.filter((c) => c.id !== targetId)
  return decoys[Math.floor(Math.random() * decoys.length)].id
}

function randomTarget() {
  return TARGET_ITEMS[Math.floor(Math.random() * TARGET_ITEMS.length)]
}

// 슬롯5 방울 터트리기 — 제시된 옷 방울만 골라 터뜨려 제한시간(20초) 안에 목표 개수(GOAL)를 채우면 클리어.
// 디코이(목표가 아닌 나머지 옷) 방울을 터뜨리면 -1 페널티(0 밑으로는 안 내려감).
// 실패해도(시간 내 미달성) 진행 자체는 막히지 않고, 퀴즈(슬롯2)와 동일하게 재도전 안내 후 바로 재시작 가능.
export function BubblePopGame({ difficulty = 'easy', onClear, onFail }) {
  const [target, setTarget] = useState(randomTarget)
  const [targetChangeKey, setTargetChangeKey] = useState(0) // 바뀔 때마다 증가 — 제시 칩 등장 애니메이션 재생용
  const [phase, setPhase] = useState('ready') // 'ready' | 'playing' | 'done'
  const [bubbles, setBubbles] = useState([])
  const [hits, setHits] = useState(0)
  const [timeLeftMs, setTimeLeftMs] = useState(TIME_LIMIT_MS)

  const spawnIntervalRef = useRef(null)
  const tickIntervalRef = useRef(null)
  const bubbleTimeoutsRef = useRef([])
  const rotateTimeoutsRef = useRef([])
  const finishTimeoutRef = useRef(null)
  const deadlineRef = useRef(0)
  const hitsRef = useRef(0)
  const targetIdRef = useRef(target.id)
  const nextIdRef = useRef(0)
  const targetProbRef = useRef(TARGET_PROB)

  useEffect(() => () => {
    clearInterval(spawnIntervalRef.current)
    clearInterval(tickIntervalRef.current)
    bubbleTimeoutsRef.current.forEach(clearTimeout)
    rotateTimeoutsRef.current.forEach(clearTimeout)
    clearTimeout(finishTimeoutRef.current)
  }, [])

  function removeBubble(id) {
    setBubbles((prev) => prev.filter((b) => b.id !== id))
  }

  function spawnBubble() {
    const id = nextIdRef.current++
    const costumeId = pickBubbleCostumeId(targetIdRef.current, targetProbRef.current)
    const x = 8 + Math.random() * 78 // 8%~86% (버블 자체 너비만큼 오른쪽 여유를 둠)
    setBubbles((prev) => [...prev, { id, costumeId, x }])
    const t = setTimeout(() => removeBubble(id), BUBBLE_LIFETIME_MS)
    bubbleTimeoutsRef.current.push(t)
  }

  // 제시 옷 교체 — 화면에 이미 떠 있던 이전 목표 방울은 targetIdRef가 바뀌는 순간 자동으로 디코이 취급됨
  function rotateTarget() {
    const next = TARGET_ITEMS.filter((c) => c.id !== targetIdRef.current)
    const picked = next[Math.floor(Math.random() * next.length)]
    targetIdRef.current = picked.id
    setTarget(picked)
    setTargetChangeKey((k) => k + 1)
  }

  function finish(success) {
    clearInterval(spawnIntervalRef.current)
    clearInterval(tickIntervalRef.current)
    bubbleTimeoutsRef.current.forEach(clearTimeout)
    bubbleTimeoutsRef.current = []
    rotateTimeoutsRef.current.forEach(clearTimeout)
    rotateTimeoutsRef.current = []
    setPhase('done')
    setBubbles([])
    finishTimeoutRef.current = setTimeout(() => {
      if (success) {
        onClear()
      } else {
        setPhase('ready')
        setHits(0)
        setTimeLeftMs(TIME_LIMIT_MS)
        onFail()
      }
    }, 500)
  }

  function handleStart() {
    // 슬롯 진입 시 처음 제시된 옷을 그대로 유지 — START를 눌러도(재도전 포함) 목표가 바뀌지 않음
    setTargetChangeKey(0)
    hitsRef.current = 0
    setHits(0)
    setBubbles([])
    setPhase('playing')
    deadlineRef.current = Date.now() + TIME_LIMIT_MS
    setTimeLeftMs(TIME_LIMIT_MS)
    targetProbRef.current = TARGET_PROB

    // 하드 모드: 10초 시점에 제시 옷 교체 + 목표 확률 하락. 이지 모드는 기존과 동일(끝까지 유지)
    rotateTimeoutsRef.current = difficulty === 'hard'
      ? [setTimeout(() => {
          rotateTarget()
          targetProbRef.current = HARD_TARGET_PROB
        }, HARD_PHASE_START_MS)]
      : []

    spawnIntervalRef.current = setInterval(spawnBubble, SPAWN_INTERVAL_MS)
    tickIntervalRef.current = setInterval(() => {
      const remain = deadlineRef.current - Date.now()
      if (remain <= 0) {
        finish(false)
        return
      }
      setTimeLeftMs(remain)
    }, 100)
  }

  function popBubble(bubble) {
    removeBubble(bubble.id)
    if (bubble.costumeId !== targetIdRef.current) {
      hitsRef.current = Math.max(0, hitsRef.current - 1) // 디코이 오답 — 카운트 -1 (0 밑으로는 안 내려감)
      setHits(hitsRef.current)
      return
    }
    hitsRef.current += 1
    setHits(hitsRef.current)
    if (hitsRef.current >= GOAL) finish(true)
  }

  const timeLeftSec = Math.max(0, Math.ceil(timeLeftMs / 1000))

  return (
    <div className={styles.wrap}>
      <div className={styles.targetRow}>
        <span className={styles.targetLabel}>이 옷을 찾아 터뜨리세요!</span>
        <div key={targetChangeKey} className={styles.targetChip}>
          <img src={target.image} alt={target.name} className={styles.targetImg} />
          <span className={styles.targetName}>{target.name}</span>
        </div>
      </div>

      <div className={styles.hud}>
        <span className={styles.timer}>⏱ {timeLeftSec}초</span>
        <span className={styles.progress}>{hits} / {GOAL}</span>
      </div>

      <div className={styles.stage}>
        {bubbles.map((b) => {
          const costume = BUBBLE_ITEMS.find((c) => c.id === b.costumeId)
          return (
            <button
              key={b.id}
              className={styles.bubble}
              style={{ left: `${b.x}%`, animationDuration: `${BUBBLE_LIFETIME_MS}ms` }}
              onClick={() => popBubble(b)}
            >
              <img src={costume.image} alt={costume.name} className={styles.bubbleImg} draggable={false} />
            </button>
          )
        })}

        {phase === 'ready' && (
          <button className={styles.startBtn} onClick={handleStart}>START</button>
        )}
      </div>
    </div>
  )
}
