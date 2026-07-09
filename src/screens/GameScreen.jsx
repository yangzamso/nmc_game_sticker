import { useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { SLOTS } from '../data/slots'
import { COSTUMES } from '../data/costumes'
import { CapsuleReveal } from '../components/common/CapsuleReveal'
import { Modal } from '../components/common/Modal'
import { LuckyDrawPanel } from '../components/common/LuckyDrawPanel'
import { CardFlipGame } from '../games/CardFlipGame'
import { QuizGame } from '../games/QuizGame'
import { RouletteGame } from '../games/RouletteGame'
import { CatchGame } from '../games/CatchGame'
import styles from './GameScreen.module.css'
import dusty from '../styles/dustyBg.module.css'

const costumeById = Object.fromEntries(COSTUMES.map((c) => [c.id, c]))

// 슬롯1(카드뒤집기)/슬롯2(퀴즈)/슬롯3(룰렛)/슬롯4(캐치캐치)/슬롯6(럭키드로우)는 실제 화면으로 완성됨.
// 슬롯5(흔들기)는 PRD상 미니게임 자체(폰 흔들기 연출)는 개발 보류 상태지만, 탭하면 바로 남은 옷 중
// 하나를 랜덤 지급하도록 임시로 열어둠 (아래 fallback 화면이 그 최소 버전 — 2026-07-09).
export function GameScreen() {
  const activeSlotId = useSessionStore((s) => s.activeSlotId)
  const slots = useSessionStore((s) => s.slots)
  const backToHub = useSessionStore((s) => s.backToHub)
  const clearSlot = useSessionStore((s) => s.clearSlot)
  const adminClearSlot6 = useSessionStore((s) => s.adminClearSlot6)
  const getRandomUnownedFromPool = useSessionStore((s) => s.getRandomUnownedFromPool)
  const [reward, setReward] = useState(null)
  const [showQuizFail, setShowQuizFail] = useState(false)

  const slot = SLOTS.find((s) => s.id === activeSlotId)

  function handleGameClear() {
    // 이미 클리어된 슬롯을 재도전해서 성공해도 새 옷이 아니라 원래 획득했던 옷 그대로 리빌
    const costumeId = slots[slot.id] || getRandomUnownedFromPool()
    if (!costumeId) return
    setReward(costumeId)
  }

  async function handleLuckyDrawVerify(adminPassword) {
    await adminClearSlot6(adminPassword)
    setReward('strawberry')
  }

  function handleConfirmReveal() {
    if (!slot.special) {
      clearSlot(slot.id, reward)
    }
    setReward(null)
    backToHub()
  }

  if (reward) {
    // 룰렛(3)/캐치캐치(4)는 게임 자체 연출로 이미 결과를 보여주므로 가챠 캡슐 연출 없이 바로 아이템 등장
    const instant = slot?.id === 3 || slot?.id === 4
    return <CapsuleReveal costume={costumeById[reward]} onConfirm={handleConfirmReveal} instant={instant} />
  }

  if (slot?.id === 1) {
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>{slot.label}</h2>
        <CardFlipGame onClear={handleGameClear} />
      </div>
    )
  }

  if (slot?.id === 2) {
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>닛몰퀴즈</h2>
        <QuizGame onClear={handleGameClear} onFail={() => setShowQuizFail(true)} />
        {showQuizFail && (
          <Modal title="땡! 모두 맞추지 못하셨네요!" onConfirm={backToHub}>
            재도전 해주세요
          </Modal>
        )}
      </div>
    )
  }

  if (slot?.id === 3) {
    const ownedIds = Object.values(slots).filter(Boolean)
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>{slot.label}</h2>
        <RouletteGame
          ownedIds={ownedIds}
          alreadyCleared={slots[3]}
          onResult={(costumeId) => setReward(costumeId)}
        />
      </div>
    )
  }

  if (slot?.id === 4) {
    const ownedIds = Object.values(slots).filter(Boolean)
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>{slot.label}</h2>
        <CatchGame
          ownedIds={ownedIds}
          alreadyCleared={slots[4]}
          onResult={(costumeId) => setReward(costumeId)}
        />
      </div>
    )
  }

  if (slot?.id === 6) {
    if (slots[6]) {
      return (
        <div className={`${styles.screen} ${dusty.dustyBg}`}>
          <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
          <h2 className={styles.title}>{slot.label}</h2>
          <p className={styles.notice}>이미 받으셨어요! 코디 화면에서 확인해보세요.</p>
        </div>
      )
    }
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>{slot.label}</h2>
        <LuckyDrawPanel onVerify={handleLuckyDrawVerify} />
      </div>
    )
  }

  return (
    <div className={`${styles.screen} ${dusty.dustyBg}`}>
      <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
      <h2 className={styles.title}>{slot?.label}</h2>
      <p className={styles.notice}>미니게임은 준비 중이에요! 지금은 눌러서 바로 옷을 받아보세요.</p>
      <button className={styles.testClearBtn} onClick={handleGameClear}>아이템 받기</button>
    </div>
  )
}
