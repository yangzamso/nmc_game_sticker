import { create } from 'zustand'

export const useGameStore = create((set) => ({
  equippedId: null,
  bgColor: '#ffffff',
  bgImage: null,

  equip: (id) => set({ equippedId: id }),
  unequip: () => set({ equippedId: null }),
  setBg: (color) => set({ bgColor: color, bgImage: null }),
  setBgImage: (url) => set({ bgImage: url, bgColor: '#000000' }),
  reset: () => set({ equippedId: null, bgColor: '#ffffff', bgImage: null }),
}))
