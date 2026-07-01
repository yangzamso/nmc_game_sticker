export const CHARACTER_CROP = { x1: 29, y1: 25, x2: 414, y2: 624 }

export const COSTUMES = [
  { id: 'raito',      name: '야바위 라이토', image: '/items/raito.png',      crop: { x1: 591,  y1: 11,  x2: 987,  y2: 679  } },
  { id: 'detective',  name: '탐정',          image: '/items/detective.png',  crop: { x1: 1160, y1: 27,  x2: 1575, y2: 648  } },
  { id: 'ajussi',     name: '아저씨',        image: '/items/ajussi.png',     crop: { x1: 1816, y1: 3,   x2: 2244, y2: 666  } },
  { id: 'strawberry', name: '딸기',          image: '/items/strawberry.png', crop: { x1: 21,   y1: 831, x2: 538,  y2: 1558 } },
  { id: 'bungae',     name: '번개맨',        image: '/items/bungae.png',     crop: { x1: 587,  y1: 806, x2: 1027, y2: 1546 } },
  { id: 'wolf',       name: '하얀늑대',      image: '/items/wolf.png',       crop: { x1: 1144, y1: 936, x2: 1475, y2: 1372 } },
]

export const PROPS = [
  { id: 'item_sword',      name: '장난감검',  image: '/items/item_sword.png' },
  { id: 'item_rose',       name: '장미',      image: '/items/item_rose.png',       propScale: 1.3 },
  { id: 'item_hat',        name: '모자',      image: '/items/item_hat.png',        propScale: 1.3 },
  { id: 'item_chupachups', name: '츄팝츕스',  image: '/items/item_chupachups.png' },
  { id: 'item_magnifier',  name: '돋보기',    image: '/items/item_magnifier.png' },
]

export const BACKGROUNDS = [
  { id: 'bg_stage',    label: '무대',    image: '/bg_stage.jpg' },
  { id: 'bg_white',    label: '흰색',    color: '#ffffff' },
  { id: 'bg_cream',    label: '크림',    color: '#fff8ee' },
  { id: 'bg_sky',      label: '하늘',    color: '#dff0ff' },
  { id: 'bg_mint',     label: '민트',    color: '#d6f5ee' },
  { id: 'bg_pink',     label: '핑크',    color: '#ffe4f0' },
  { id: 'bg_yellow',   label: '노랑',    color: '#fffbcc' },
  { id: 'bg_lavender', label: '라벤더',  color: '#ede8ff' },
  { id: 'bg_gray',     label: '그레이',  color: '#f0f0f0' },
]

export const CHAR_DISPLAY_W = 160
const charNatW = CHARACTER_CROP.x2 - CHARACTER_CROP.x1
const charNatH = CHARACTER_CROP.y2 - CHARACTER_CROP.y1
export const SCALE = CHAR_DISPLAY_W / charNatW
export const CHAR_DISPLAY_H = Math.round(charNatH * SCALE)

// 의상/아이템 크기 보정 — 캐릭터 대비 의상이 크면 낮추고 작으면 높임
export const COSTUME_SCALE_FACTOR = 1.0

export function getCostumeDisplaySize(costume, scale) {
  const s = (scale ?? SCALE) * COSTUME_SCALE_FACTOR
  const { x1, y1, x2, y2 } = costume.crop
  return { w: Math.round((x2 - x1) * s), h: Math.round((y2 - y1) * s) }
}
