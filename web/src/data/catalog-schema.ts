// 음식 데이터 형식. 사이트(Next.js)·수집 스크립트(scripts/)·Supabase 가 같이 쓴다.
// 사진 import 같은 Next.js 전용 코드를 넣지 않는다 (Node 로 바로 실행되도록).

export const sortOptions = ["급상승순", "좋아요순", "조리시간순"] as const;
export const tagOptions = ["10분컷", "자취생", "디저트", "안주"] as const;
export const categoryOptions = ["디저트", "밥", "면", "분식", "간식"] as const;
export type Category = (typeof categoryOptions)[number];

export type Ingredient = {
  name: string;
  /** 참고 가격(원). 없으면 집에 흔한 재료 */
  price?: number;
  /** 구하기 어려운 핵심 재료 */
  hard?: boolean;
  /** 기본으로 '집에 있어요' 처리할 재료 (설탕·소금 등) */
  pantry?: boolean;
  /** 운영자가 등록한 쿠팡 파트너스 링크. 없으면 쿠팡 검색 링크로 대체 */
  url?: string;
};

export type Step = { text: string; timerMinutes?: number };

export type FoodRecord = {
  slug: string;
  rank: number;
  name: string;
  change: string;
  why: string;
  summary: string;
  category: Category;
  tags: string[];
  cookMinutes: number;
  cookLabel: string;
  difficulty: "쉬움" | "보통" | "어려움";
  servings: string;
  likes: number;
  videos: number;
  multiplier: number;
  /** 최근 14일 검색량 지수 */
  trend: number[];
  /** 사진 키 (web/src/lib/foods.ts 의 사진 목록) */
  image: string;
  alt: string;
  heroImage?: string;
  heroAlt?: string;
  ingredients: Ingredient[];
  steps: Step[];
  tip: string;
  convenience: { place: string; desc: string }[];
};

