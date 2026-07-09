import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COSTUMES } from '../data/costumes'
import { EMPTY_SLOTS } from '../data/slots'
import { updateSlot, adminVerifySlot6, resetSlots as resetSlotsApi } from '../utils/api'

const GAME_POOL = COSTUMES.filter((c) => c.id !== 'strawberry').map((c) => c.id)

export const useSessionStore = create(
  persist(
    (set, get) => ({
      screen: 'auth', // 'auth' | 'hub' | 'game' | 'dressup'
      nickname: '',
      password: '', // 인증된 슬롯 갱신 요청에 재사용 — localStorage에 nickname/slots와 함께 저장돼 새로고침해도 로그인 유지됨
      activeSlotId: null,
      slots: EMPTY_SLOTS,

      login: (nickname, password, slots) => set({ nickname, password, slots: slots ?? EMPTY_SLOTS, screen: 'hub' }),
      openSlot: (slotId) => set({ activeSlotId: slotId, screen: 'game' }),
      backToHub: () => set({ activeSlotId: null, screen: 'hub' }),
      goToDressup: () => set({ screen: 'dressup' }),

      clearSlot: async (slotId, costumeId) => {
        const { nickname, password } = get()
        const { slots } = await updateSlot(nickname, password, slotId, costumeId)
        set({ slots })
      },

      adminClearSlot6: async (adminPassword) => {
        const { nickname } = get()
        const { slots } = await adminVerifySlot6(nickname, adminPassword)
        set({ slots })
      },

      // 로컬 개발용 — 슬롯 전체 초기화
      resetSlots: async () => {
        const { nickname, password } = get()
        const { slots } = await resetSlotsApi(nickname, password)
        set({ slots })
      },

      getRandomUnownedFromPool: () => {
        const owned = Object.values(get().slots).filter(Boolean)
        const remaining = GAME_POOL.filter((id) => !owned.includes(id))
        if (remaining.length === 0) return null
        return remaining[Math.floor(Math.random() * remaining.length)]
      },
    }),
    {
      name: 'nmc-session',
      // screen/activeSlotId는 저장하지 않음 — 새로고침 시 특정 게임 화면 한가운데로 복귀하면 어색하므로
      // 항상 허브로 복귀시키고(닉네임이 있으면), 그 판단은 아래 onRehydrateStorage에서 처리
      partialize: (state) => ({ nickname: state.nickname, password: state.password, slots: state.slots }),
      onRehydrateStorage: () => (state) => {
        if (state?.nickname) state.screen = 'hub'
      },
    }
  )
)
