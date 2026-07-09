import { useState } from 'react'
import styles from './LuckyDrawPanel.module.css'

// 슬롯6(럭키드로우) 전용 패널 — PRD 7절. 별도 모달이 아니라 슬롯 화면에 바로 이어지는 콘텐츠로 렌더링됨
// (GameScreen.jsx에서 backBtn/title이 있는 .screen 안에 넣어서 사용).
// 1) 안내 메시지 + 관리자 확인 버튼
// 2) 관리자 비밀번호 입력 → 서버 검증(adminVerifySlot6, api/admin-verify.js) 통과 시에만 지급
// 클라이언트에서는 절대 통과 여부를 판단하지 않고, 서버 응답(성공/실패)만 그대로 반영한다
export function LuckyDrawPanel({ onVerify }) {
  const [step, setStep] = useState('info') // 'info' | 'password'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirmPassword() {
    if (!password) {
      setError('비밀번호를 입력해주세요')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onVerify(password)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCancelPassword() {
    setStep('info')
    setPassword('')
    setError('')
  }

  if (step === 'info') {
    return (
      <div className={styles.wrap}>
        <p className={styles.message}>
          포토카드 구매후<br />
          관리자에게 아이템을 요청하세요!<br />
          관리자 확인 후,<br />
          딸기 의상을 받을 수 있어요!
        </p>
        <button className={styles.confirmBtn} onClick={() => setStep('password')}>관리자 확인</button>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <input
        type="password"
        className={styles.pwInput}
        value={password}
        onChange={(e) => { setPassword(e.target.value); setError('') }}
        placeholder="관리자 비밀번호"
        autoFocus
        disabled={loading}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button className={styles.cancelBtn} onClick={handleCancelPassword} disabled={loading}>취소</button>
        <button className={styles.confirmBtn} onClick={handleConfirmPassword} disabled={loading}>
          {loading ? '확인 중...' : '확인'}
        </button>
      </div>
    </div>
  )
}
