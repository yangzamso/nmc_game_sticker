import { useEffect, useState } from 'react'
import styles from './CardFlipGame.module.css'

// 3x4(12칸) 그리드라 6쌍 필요 — public/card/card-1.jpg ~ card-6.jpg
const CARD_IMAGES = Array.from({ length: 6 }, (_, i) => `/card/card-${i + 1}.jpg`)

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildDeck() {
  return shuffle(
    CARD_IMAGES.flatMap((image, i) => [
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

  useEffect(() => {
    if (matched.length === deck.length) onClear()
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
