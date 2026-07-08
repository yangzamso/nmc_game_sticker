import { useEffect, useState } from 'react'
import styles from './CapsuleReveal.module.css'

const SUCCESS_MS = 700
const CRANK_MS = 1000
const DROP_MS = 600

// 모든 미니게임이 클리어 후 공유하는 뽑기(가챠) 리빌 연출
// 성공! → 뽑기 기계 크랭크 돌리기 → 캡슐 배출+낙하 → 자동으로 열리며 아이템 짠! 등장
// instant=true면 캡슐 연출(크랭크/낙하) 없이 바로 'opened' 단계로 열려 아이템만 짠! 등장한다
// (룰렛/캐치캐치는 이미 자체 연출로 결과를 보여주므로 가챠 연출이 중복이라 생략 — 2026-07-08)
export function CapsuleReveal({ costume, onConfirm, instant = false }) {
  const [phase, setPhase] = useState(instant ? 'opened' : 'success') // 'success' | 'cranking' | 'dropping' | 'opened'
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    if (instant) {
      setPhase('opened')
      return
    }
    setPhase('success')
    const toCranking = setTimeout(() => setPhase('cranking'), SUCCESS_MS)
    const toDropping = setTimeout(() => setPhase('dropping'), SUCCESS_MS + CRANK_MS)
    const toOpened = setTimeout(() => setPhase('opened'), SUCCESS_MS + CRANK_MS + DROP_MS)
    return () => {
      clearTimeout(toCranking)
      clearTimeout(toDropping)
      clearTimeout(toOpened)
    }
  }, [replayKey, instant])

  return (
    <div className={styles.overlay}>
      {/* 개발 중 애니메이션 확인용 — 프로덕션 빌드에서는 렌더링되지 않음 */}
      {import.meta.env.DEV && (
        <button
          type="button"
          className={styles.replayBtn}
          onClick={() => setReplayKey((k) => k + 1)}
          aria-label="애니메이션 다시 재생 (개발용)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 1 3 6.7" />
            <path d="M3 16v-4h4" />
          </svg>
        </button>
      )}

      {phase === 'success' && <p className={styles.successText}>성공!</p>}

      {(phase === 'cranking' || phase === 'dropping') && (
        <div className={styles.stage}>
          <div
            className={[
              styles.machine,
              phase === 'cranking' ? styles.machineShake : '',
            ].join(' ')}
          />
          {phase === 'dropping' && (
            <div className={styles.capsuleDrop}>
              <span className={styles.capsuleTop} />
              <span className={styles.capsuleBottom} />
            </div>
          )}
        </div>
      )}

      {phase === 'opened' && (
        <div className={styles.reveal}>
          <div className={styles.imageWrap}>
            <span className={styles.burst} />
            <img src={costume.image} alt={costume.name} className={styles.revealImg} />
          </div>
          <p className={styles.revealName}>{costume.name} 획득!</p>
        </div>
      )}

      {phase === 'opened' && (
        <button className={styles.confirmBtn} onClick={onConfirm}>확인</button>
      )}
    </div>
  )
}
