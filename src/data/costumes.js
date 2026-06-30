export const CHARACTER_CROP = { x1: 10, y1: 8, x2: 224, y2: 328 }

export const COSTUMES = [
  { id: 'raito',      name: '야바위 라이토', image: '/items/raito.png',      crop: { x1: 235, y1: 5,   x2: 450, y2: 344 } },
  { id: 'detective',  name: '탐정',          image: '/items/detective.png',  crop: { x1: 463, y1: 14,  x2: 663, y2: 305 } },
  { id: 'ajussi',     name: '아저씨',        image: '/items/ajussi.png',     crop: { x1: 675, y1: 14,  x2: 925, y2: 321 } },
  { id: 'strawberry', name: '딸기',          image: '/items/strawberry.png', crop: { x1: 9,   y1: 334, x2: 260, y2: 665 } },
  { id: 'bungae',     name: '번개맨',        image: '/items/bungae.png',     crop: { x1: 271, y1: 344, x2: 505, y2: 670 } },
  { id: 'wolf',       name: '하얀늑대',      image: '/items/wolf.png',       crop: { x1: 538, y1: 464, x2: 726, y2: 663 } },
]

export const PROPS = [
  { id: 'item_wand',       name: '파란 완드',  image: '/items/item_wand.png' },
  { id: 'item_chupachups', name: '츄파춥스',   image: '/items/item_chupachups.png' },
]

export const BACKGROUNDS = [
  { id: 'bg_white',   label: '흰색',    color: '#ffffff' },
  { id: 'bg_cream',   label: '크림',    color: '#fff8ee' },
  { id: 'bg_sky',     label: '하늘',    color: '#dff0ff' },
  { id: 'bg_mint',    label: '민트',    color: '#d6f5ee' },
  { id: 'bg_pink',    label: '핑크',    color: '#ffe4f0' },
  { id: 'bg_yellow',  label: '노랑',    color: '#fffbcc' },
  { id: 'bg_lavender',label: '라벤더',  color: '#ede8ff' },
  { id: 'bg_gray',    label: '그레이',  color: '#f0f0f0' },
]

export const CHAR_DISPLAY_W = 160
const charNatW = CHARACTER_CROP.x2 - CHARACTER_CROP.x1
const charNatH = CHARACTER_CROP.y2 - CHARACTER_CROP.y1
export const SCALE = CHAR_DISPLAY_W / charNatW
export const CHAR_DISPLAY_H = Math.round(charNatH * SCALE)

export function getCostumeDisplaySize(costume, scale) {
  const s = scale ?? SCALE
  const { x1, y1, x2, y2 } = costume.crop
  return { w: Math.round((x2 - x1) * s), h: Math.round((y2 - y1) * s) }
}
