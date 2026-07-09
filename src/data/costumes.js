export const CHARACTER_CROP = { x1: 29, y1: 25, x2: 414, y2: 624 }

export const COSTUMES = [
  { id: 'raito',      name: '야바위 라이토', image: '/items/raito.png',      crop: { x1: 591,  y1: 11,  x2: 987,  y2: 679  } },
  { id: 'detective',  name: '탐정',          image: '/items/detective.png',  crop: { x1: 1160, y1: 27,  x2: 1575, y2: 648  } },
  { id: 'ajussi',     name: '아저씨',        image: '/items/ajussi.png',     crop: { x1: 1816, y1: 3,   x2: 2244, y2: 666  } },
  { id: 'bungae',     name: '번개보이',      image: '/items/bungae.png',     crop: { x1: 587,  y1: 806, x2: 1027, y2: 1546 } },
  { id: 'wolf',       name: '하얀늑대',      image: '/items/wolf.png',       crop: { x1: 1144, y1: 936, x2: 1475, y2: 1372 } },
  { id: 'strawberry', name: '딸기',          image: '/items/strawberry.png', crop: { x1: 21,   y1: 831, x2: 538,  y2: 1558 } },
]

// propScale = SCALE × (아이템 파일 전체 너비 / 80) — nmc.png 원본 대비 캐릭터와 동일한 비율로 보정 (2026-07-03 실측)
export const PROPS = [
  { id: 'item_hat',        name: '모자',      image: '/items/item_hat.png',        propScale: 3.3 },
  { id: 'item_rose',       name: '장미',      image: '/items/item_rose.png',       propScale: 2.2 },
  { id: 'item_sword',      name: '장난감검',  image: '/items/item_sword.png',      propScale: 1.6, rotate: 10 },
  { id: 'item_watergun',   name: '물총',      image: '/items/item_watergun.png',   propScale:1.4 },
  { id: 'item_chupachups', name: '츄팝츕스',  image: '/items/item_chupachups.png', propScale: 1.3 },
  { id: 'item_magnifier',  name: '돋보기',    image: '/items/item_magnifier.png', rotate: -10, propScale: 1.2 },
]

export const BACKGROUNDS = [
  { id: 'bg_white',    label: '기본',   color: '#ffffff' },
  { id: 'bg_pink',     label: '핑크',   image: '/bg-pink.jpg' },
  { id: 'bg_sky',      label: '하늘',   image: '/bg-sky.jpg' },
  { id: 'bg_yellow',   label: '노랑',   image: '/bg-yellow.jpg' },
  { id: 'bg_mint',     label: '민트',   image: '/bg-mint.jpg' },
  { id: 'bg_lavender', label: '라벤더', image: '/bg-lavender.jpg' },
  { id: 'bg_pastel',   label: '파스텔', image: '/bg-pastel.jpg' },
]

export const SCALE = 0.5
const charNatW = CHARACTER_CROP.x2 - CHARACTER_CROP.x1
const charNatH = CHARACTER_CROP.y2 - CHARACTER_CROP.y1
// 고정 px 대신 스테이지 실측 폭 기준 비율로 캐릭터 크기를 계산 — 기기마다 dvh/svh 기반
// 스테이지 크기가 달라도 캐릭터가 항상 같은 비율로 보이도록 함
export const CHAR_WIDTH_RATIO = 0.4534
export const CHAR_DISPLAY_W = Math.round(charNatW * SCALE)
export const CHAR_DISPLAY_H = Math.round(charNatH * SCALE)

// 의상/아이템 크기 보정 — 캐릭터 대비 의상이 크면 낮추고 작으면 높임
export const COSTUME_SCALE_FACTOR = 1.0

export function getCostumeDisplaySize(costume, scale) {
  const s = (scale ?? SCALE) * COSTUME_SCALE_FACTOR
  const { x1, y1, x2, y2 } = costume.crop
  return { w: Math.round((x2 - x1) * s), h: Math.round((y2 - y1) * s) }
}
