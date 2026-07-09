// 컬렉션 허브 6슬롯 정의 — docs/PRD-collection-game.md 참고
// 배열 순서 = 허브 화면에 보여지는 순서. id는 DB 슬롯 컬럼(slot1~6)과 게임 라우팅에 쓰이므로 순서와 무관하게 고정.
export const SLOTS = [
  { id: 1, game: 'card',      label: '카드게임' },
  { id: 3, game: 'roulette',  label: '룰렛' },
  { id: 2, game: 'quiz',      label: '퀴즈' },
  { id: 4, game: 'catch',     label: '캐치캐치' },
  { id: 5, game: 'shake',     label: '흔들기' }, // 흔들기 미니게임 자체는 아직 미구현 — 임시로 탭하면 바로 남은 옷 중 랜덤 지급 (2026-07-09)
  { id: 6, game: 'lucky',     label: '럭키드로우', special: true },  // 포토카드 구매 전용 (딸기)
]

export const EMPTY_SLOTS = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
