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
import { BubblePopGame } from '../games/BubblePopGame'
import styles from './GameScreen.module.css'
import dusty from '../styles/dustyBg.module.css'

const costumeById = Object.fromEntries(COSTUMES.map((c) => [c.id, c]))

export function GameScreen() {
  const activeSlotId = useSessionStore((s) => s.activeSlotId)
  const slots = useSessionStore((s) => s.slots)
  const backToHub = useSessionStore((s) => s.backToHub)
  const clearSlot = useSessionStore((s) => s.clearSlot)
  const adminClearSlot6 = useSessionStore((s) => s.adminClearSlot6)
  const getRandomUnownedFromPool = useSessionStore((s) => s.getRandomUnownedFromPool)
  const [reward, setReward] = useState(null)
  const [showQuizFail, setShowQuizFail] = useState(false)
  const [showBubbleFail, setShowBubbleFail] = useState(false)

  const slot = SLOTS.find((s) => s.id === activeSlotId)

  function handleGameClear() {
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
    const instant = slot?.id === 2 || slot?.id === 4
    return (
      <CapsuleReveal
        costume={costumeById[reward]}
        onConfirm={handleConfirmReveal}
        onCancel={backToHub}
        instant={instant}
      />
    )
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
    const ownedIds = Object.values(slots).filter(Boolean)
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>{slot.label}</h2>
        <RouletteGame
          ownedIds={ownedIds}
          alreadyCleared={slots[2]}
          onResult={(costumeId) => setReward(costumeId)}
        />
      </div>
    )
  }

  if (slot?.id === 3) {
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>닛몰퀴즈</h2>
        <QuizGame onClear={handleGameClear} onFail={() => setShowQuizFail(true)} />
        {showQuizFail && (
          <Modal title="문제를 모두 맞추지 못했네요" onConfirm={backToHub}>
            다시 도전해주세요
          </Modal>
        )}
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

  if (slot?.id === 5) {
    return (
      <div className={`${styles.screen} ${dusty.dustyBg}`}>
        <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
        <h2 className={styles.title}>{slot.label}</h2>
        <BubblePopGame onClear={handleGameClear} onFail={() => setShowBubbleFail(true)} />
        {showBubbleFail && (
          <Modal title="시간 안에 다 못 찾았네요" onConfirm={() => setShowBubbleFail(false)}>
            다시 도전해주세요
          </Modal>
        )}
      </div>
    )
  }

  if (slot?.id === 6) {
    if (slots[6]) {
      return (
        <div className={`${styles.screen} ${dusty.dustyBg}`}>
          <button className={styles.backBtn} onClick={backToHub}>← 이전으로</button>
          <h2 className={styles.title}>{slot.label}</h2>
          <p className={styles.notice}>이미 받았어요. 코디 화면에서 확인해보세요.</p>
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
      <p className={styles.notice}>미니게임은 준비 중이에요. 지금은 눌러서 바로 옷을 받아보세요.</p>
      <button className={styles.testClearBtn} onClick={handleGameClear}>아이템 받기</button>
    </div>
  )
}
