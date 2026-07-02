import { useCallback, useEffect, useRef, useState } from 'react'
import { downloadPhotoCard } from '../utils/savePhotoCard'
import styles from './PrintOverlay.module.css'

// 원본 앞부분 무음(~1.45s)의 절반 지점부터 재생해 무음 체감 시간을 절반으로 줄임
const PRINT_SOUND_START = 0.725

function playPrinterSound() {
  const audio = new Audio('/printer-audio.mp3')
  const start = () => {
    audio.currentTime = PRINT_SOUND_START
    audio.play().catch(() => {})
  }
  if (audio.readyState >= 1) start()
  else audio.addEventListener('loadedmetadata', start, { once: true })
}

export function PrintOverlay({ printData, boardRef, onClose }) {
  const [replayKey, setReplayKey] = useState(0)

  // 오버레이가 처음 나타날 때 프린트 효과음 재생
  useEffect(() => {
    playPrinterSound()
  }, [])

  // 오버레이가 열려있는 동안 히스토리 항목을 하나 추가해 두고, 모바일 브라우저의
  // 뒤로가기(제스처/버튼)가 페이지 이탈 대신 오버레이 닫기로 이어지도록 popstate를 가로챔
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    window.history.pushState({ printOverlay: true }, '')
    const handlePopState = () => onCloseRef.current()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // UI 버튼으로 닫을 때도 history.back()을 거쳐, 위에서 추가해둔 히스토리 항목을 정리
  const handleClose = useCallback(() => {
    window.history.back()
  }, [])

  const onReplay = useCallback((e) => {
    e.stopPropagation()
    setReplayKey((k) => k + 1)
    playPrinterSound()
  }, [])

  const onPrintDownload = useCallback(() => {
    if (printData) downloadPhotoCard(printData)
    handleClose()
  }, [printData, handleClose])

  // 프린터 이미지 비율: 265×302
  // 슬롯 너비 비율: 200/265 ≈ 75.5%  /  슬롯 위치: y=95/302 ≈ 31.5%
  const SLOT_Y_RATIO = 95 / 302
  const printerW = boardRef.current?.getBoundingClientRect().width ?? window.innerWidth
  const printerH = Math.round(printerW * 302 / 265)
  // 카드: 프린터(printerW)와 같은 기준으로 계산 — 기기별 스테이지 비율 차이와 무관하게
  // 슬롯(320px)보다 항상 좁게 유지되도록 printerW 대비 비율(0.6276 ≈ 기준폭 478px에서 300px)로 고정
  const cardW    = Math.round(printerW * 0.6276)
  const cardH    = Math.round(cardW * 4 / 3)
  const slotY    = Math.round(printerH * SLOT_Y_RATIO)
  // 씬 전체 높이 = 슬롯 위치 + 카드 높이
  const sceneH   = slotY + cardH

  return (
    <div className={styles.printOverlay} onClick={handleClose}>
      <div
        className={styles.printScene}
        style={{ position: 'relative', width: printerW, height: sceneH }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Layer 4 (back): printer.svg — 카드 뒤에 위치 */}
        <img src="/printer.svg" alt=""
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 1, display: 'block' }} />

        {/* Layer 3: 커버 배경 — 화면 상단부터 슬롯 위치까지 전체를 가림 (28 = printOverlay의 padding-top과 동기화) */}
        <div className={styles.printCover} style={{ height: 28 + slotY }} />

        {/* 포토카드 — 슬롯(slotY)에서 나옴, z=2 */}
        <div style={{
          position: 'absolute', top: slotY,
          left: '50%', transform: 'translateX(-50%)',
          width: cardW, zIndex: 2,
        }}>
          <img key={replayKey} src={printData} alt="포토카드"
            className={styles.printCard} onClick={onPrintDownload} />
        </div>

        {/* Layer 1 (front): printer-top.svg — 슬롯 투명 영역으로 카드가 보임 */}
        <img src="/printer-top.svg" alt=""
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 4, display: 'block' }} />
      </div>
      <button type="button" className={styles.replayBtn} onClick={onReplay} aria-label="애니메이션 다시 재생">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 1 3 6.7" />
          <path d="M3 16v-4h4" />
        </svg>
      </button>
      <div className={styles.printActions}>
        <button type="button" className={styles.printSaveBtn} onClick={onPrintDownload}>저장</button>
        <button type="button" className={styles.printBackBtn} onClick={handleClose}>돌아가기</button>
      </div>
    </div>
  )
}
