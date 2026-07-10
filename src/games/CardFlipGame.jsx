import { useEffect, useState } from 'react'
import styles from './CardFlipGame.module.css'

// 3x4(12칸) 그리드라 6쌍 필요 — public/card/card-{그룹}-{순번}.jpg, 그룹 1~6 각 2장(변형).
// 게임 시작마다 그룹당 1장씩만 랜덤으로 골라 6장을 확정하고, 그 6장으로 짝을 맞춤(같은 그룹에서 2장이 동시에 나오지 않음).
const CARD_GROUPS = {
  1: ['/card/card-1-1.jpg', '/card/card-1-2.jpg'],
  2: ['/card/card-2-1.jpg', '/card/card-2-2.jpg'],
  3: ['/card/card-3-1.jpg', '/card/card-3-2.jpg'],
  4: ['/card/card-4-1.jpg', '/card/card-4-2.jpg'],
  5: ['/card/card-5-1.jpg', '/card/card-5-2.jpg'],
  6: ['/card/card-6-1.jpg', '/card/card-6-2.jpg'],
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pickCardImages() {
  return Object.values(CARD_GROUPS).map((variants) => variants[Math.floor(Math.random() * variants.length)])
}

function buildDeck() {
  return shuffle(
    pickCardImages().flatMap((image, i) => [
      { key: `${i}-a`, image },
      { key: `${i}-b`, image },
    ])
  )
}

export function CardFlipGame({ onClear }) {
  const [deck] = useState(buildDeck)
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [locked, setLocked] = useState(false)

  // 카드를 뒤집는 순간 로딩이 시작되면 늦으므로, 이번 판에 실제로 뽑힌 6장만 미리 브라우저 캐시에 받아둠
  useEffect(() => {
    const uniqueImages = [...new Set(deck.map((c) => c.image))]
    uniqueImages.forEach((src) => { const img = new Image(); img.src = src })
  }, [deck])

  useEffect(() => {
    if (matched.length !== deck.length) return
    const t = setTimeout(onClear, 2000) // 다 맞춘 카드를 잠깐 보여준 뒤 성공 화면으로 전환
    return () => clearTimeout(t)
  }, [matched, deck.length, onClear])

  function handleCardClick(index) {
    if (locked || flipped.includes(index) || matched.includes(index)) return

    const next = [...flipped, index]
    setFlipped(next)
    if (next.length < 2) return

    setLocked(true)
    const [a, b] = next
    if (deck[a].image === deck[b].image) {
      setTimeout(() => {
        setMatched((m) => [...m, a, b])
        setFlipped([])
        setLocked(false)
      }, 400)
    } else {
      setTimeout(() => {
        setFlipped([])
        setLocked(false)
      }, 700)
    }
  }

  return (
    <div className={styles.grid}>
      {deck.map((card, index) => {
        const isMatched = matched.includes(index)
        const isFaceUp = isMatched || flipped.includes(index)
        return (
          <button
            key={card.key}
            className={[styles.card, isFaceUp ? styles.faceUp : '', isMatched ? styles.matched : ''].join(' ')}
            onClick={() => handleCardClick(index)}
          >
            {isFaceUp
              ? <img src={card.image} alt="" className={styles.cardImg} draggable={false} />
              : '?'}
          </button>
        )
      })}
    </div>
  )
}
