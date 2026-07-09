// 닛몰퀴즈 — 3개 그룹(캐릭터/부산/갤럭시키즈), 그룹별로 여러 변형 중 랜덤 1개씩 출제
// docs/PRD-collection-game.md 6절
export const QUIZ_GROUPS = [
  {
    id: 'character',
    variants: [
      {
        type: 'choice',
        question: '다음 중 2025년 8월~2026년 7월까지 새롭게 나타난 캐릭터가 아닌 것은?',
        options: ['하얀늑대', '아담', '탐정', '오타쿠군'],
        answerIndex: 3,
      },
      {
        type: 'choice',
        question: '다음 중 2025년 8월~2026년 7월까지 새롭게 나타난 캐릭터는?',
        options: ['마법소녀', '연상남', '오타쿠군', '하얀늑대'],
        answerIndex: 3,
      },
      {
        type: 'choice',
        question: '다음 중 닛몰캐쉬가 요약한 작품이 아닌 것은?',
        options: ['왕과 사는 남자', '레제', '귀멸의 칼날', '프로젝트 헤일메리'],
        answerIndex: 1,
      },
    ],
  },
  {
    id: 'busan',
    variants: [
      {
        type: 'choice',
        question: '닛몰캐쉬가 부산까지 걸어가는데 총 소요된 일수는?',
        options: ['10일', '11일', '12일', '13일'],
        answerIndex: 2,
      },
      {
        type: 'choice',
        question: '닛몰캐쉬가 부산까지 걸어간 거리는?',
        options: ['468km', '472km', '488km', '492km'],
        answerIndex: 0,
      },
      {
        type: 'choice',
        question: '다음 중 닛몰캐쉬가 커버한 댄스가 아닌 것은?',
        options: ['에이티즈 - BAD', '태양 - Live fast die slow', 'BTS - SWIM', 'CORTIS - RED RED'],
        answerIndex: 2,
      },
    ],
  },
  {
    id: 'galaxykids',
    variants: [
      {
        type: 'text',
        question: 'Stay Close 간주 중에 하는 응원법 구호 9글자는?',
        blanks: ['가시밭길위에춤을춰'],
      },
      {
        type: 'text',
        question: '(Stay Close 갤럭시 키즈 앨범 소개 글) 다음 빈칸을 채우시오',
        excerpt: '202509xx 20살 머큐리와 21살 주피터,\n□□에서 □□으로 가는 길목 어딘가',
        blanks: ['소년', '어른'],
      },
      {
        type: 'text',
        question: '닛몰캐쉬가 금연 실패 후 금연하시는 분들에게 남긴 한마디는?',
        blanks: ['흡연을 시작도 하지마십쇼'],
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
