// 닛몰퀴즈 — 3개 그룹(캐릭터/부산/갤럭시키즈), 그룹별로 여러 변형 중 랜덤 1개씩 출제
// docs/PRD-collection-game.md 6절
export const QUIZ_GROUPS = [
  {
    id: 'character',
    variants: [
      {
        type: 'choice',
        question: '다음 중 25년 8월 ~ 26년 7월까지 새롭게 등장한 캐릭터가 아닌 것은?',
        options: ['하얀늑대', '아담', '탐정', '아저씨'],
        answerIndex: 3,
      },
      {
        type: 'choice',
        question: '다음 중 25년 8월 ~ 26년 7월까지 새롭게 등장한 캐릭터는?',
        options: ['류헤이', '하얀늑대', '야바위 라이토', 'DM보이'],
        answerIndex: 1,
      },
      {
        type: 'choice',
        question: '다음 중 닛몰캐쉬가 30초 요약한 작품은?',
        options: ['귀멸의 칼날', '진격의 거인', '흑집사', '리제로'],
        answerIndex: 0,
      },
    ],
  },
  {
    id: 'busan',
    variants: [
      {
        type: 'choice',
        question: '닛몰캐쉬가 부산까지 걸어가는데 소요된 총 일수는?',
        options: ['10일', '11일', '12일', '13일'],
        answerIndex: 2,
      },
      {
        type: 'choice',
        question: '닛몰캐쉬가 부산까지 걸어간 거리는?',
        options: ['368km', '468km', '568km', '668km'],
        answerIndex: 1,
      },
      {
        type: 'choice',
        question: '다음 중 닛몰캐쉬가 커버한 댄스가 아닌 것은?',
        options: ['에이티즈 - BAD', '태양 - Live fast die slow', 'CORTIS - 영크크', 'BTS - 2.0'],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'galaxykids',
    variants: [
      {
        type: 'text',
        question: '다음 빈칸을 채우시오.\nStay Close 간주 중 외치는 응원 구호 9글자',
        excerpt: '■■ 밭 길 위에 ■을 춰',
        blanks: ['가시', '춤'],
      },
      {
        type: 'text',
        question: '다음 빈칸을 채우시오.\nStay Close 갤럭시 키즈 앨범 소개 글',
        excerpt: '20살 머큐리와 21살 주피터, ■■에서 ■■으로 가는 길목 어딘가',
        blanks: ['소년', '어른'],
      },
      {
        type: 'text',
        question: '다음 빈칸을 채우시오.\n닛몰캐쉬가 금연하는 분들에게 남긴 한마디는?',
        excerpt: '■■은 시작도 하지 마십쇼',
        blanks: ['흡연'],
      },
    ],
  },
]

export function pickQuizSet() {
  return QUIZ_GROUPS.map((group) => {
    const variant = group.variants[Math.floor(Math.random() * group.variants.length)]
    return { id: group.id, ...variant }
  })
}
