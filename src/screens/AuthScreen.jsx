import { useState } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { checkNicknameExists, registerPlayer, loginPlayer } from '../utils/api'
import { isWeakPassword } from '../utils/password'
import { Modal } from '../components/common/Modal'
import styles from './AuthScreen.module.css'
import dusty from '../styles/dustyBg.module.css'

export function AuthScreen() {
  const login = useSessionStore((s) => s.login)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmingNew, setConfirmingNew] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const name = nickname.trim()
    setError('')

    if (!name) return setError('닉네임을 입력해주세요')
    if (isWeakPassword(password)) return setError('비밀번호를 다시 설정해주세요')

    setLoading(true)
    try {
      const exists = await checkNicknameExists(name)
      if (!exists) {
        setConfirmingNew(true)
        return
      }
      const { slots } = await loginPlayer(name, password)
      login(name, password, slots)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmRegister() {
    setLoading(true)
    try {
      const name = nickname.trim()
      const { slots } = await registerPlayer(name, password)
      setConfirmingNew(false)
      login(name, password, slots)
    } catch (e) {
      setConfirmingNew(false)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.screen} ${dusty.dustyBg}`}>
      <img src="/logo.png" alt="NEED MORE CASH — 2026 HBD CAFE" className={styles.logo} />
      <p className={styles.subtitle}>닉네임과 비밀번호 입력 후<br />시작하기를 눌러주세요.</p>

      <input
        className={styles.input}
        type="text"
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={12}
      />
      <input
        className={styles.input}
        type="password"
        inputMode="numeric"
        placeholder="비밀번호 (숫자 4자리)"
        value={password}
        onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
        maxLength={4}
      />
      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
        {loading ? '확인 중...' : '시작하기'}
      </button>

      {confirmingNew && (
        <Modal
          title="없는 닉네임입니다"
          onConfirm={handleConfirmRegister}
          onCancel={() => setConfirmingNew(false)}
        >
          새로 등록하시겠습니까?
        </Modal>
      )}
    </div>
  )
}
