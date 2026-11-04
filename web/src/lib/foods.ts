import type { StaticImageData } from "next/image";
import bagel from "@/assets/demo/bagel.jpg";
import deopbap from "@/assets/demo/deopbap.jpg";
import dubai from "@/assets/demo/dubai.jpg";
import dubai2 from "@/assets/demo/dubai2.jpg";
import garaetteok from "@/assets/demo/garaetteok.jpg";
import gimbap from "@/assets/demo/gimbap.jpg";
import gyeranppang from "@/assets/demo/gyeranppang.jpg";
import makguksu from "@/assets/demo/makguksu.jpg";
import ramyeon from "@/assets/demo/ramyeon.jpg";
import risotto from "@/assets/demo/risotto.jpg";
import tteokbokki from "@/assets/demo/tteokbokki.jpg";

// MVP 예시 데이터. Sprint 3(관리자)·4(트렌드 자동화)에서 Supabase 데이터로 바꾼다.
// 사진은 Wikimedia Commons 데모 사진(credits.json) — 실서비스 배포 전 교체 필수.

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

export type Food = {
  slug: string;
  rank: number;
  name: string;
  change: string;
  why: string;
  summary: string;
  category: "디저트" | "밥" | "면" | "분식" | "간식";
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
  image: StaticImageData;
  alt: string;
  heroImage?: StaticImageData;
  heroAlt?: string;
  ingredients: Ingredient[];
  steps: Step[];
  tip: string;
  convenience: { place: string; desc: string }[];
};

const rising = (end: number) =>
  Array.from({ length: 14 }, (_, i) => Math.round(10 + (end - 10) * (i / 13) ** 2.2 + (i % 3) * 2));

export const foods: Food[] = [
  {
    slug: "dubai-chocolate",
    rank: 1,
    name: "두바이 초콜릿",
    change: "오늘 급상승 1위",
    why: "피스타치오 크림과 바삭한 카다이프를 채운 초콜릿. 일주일 새 검색량이 세 배로 늘었어요.",
    summary:
      "초콜릿 안에 피스타치오 크림과 바삭하게 볶은 카다이프 면을 채운 디저트예요. 해외에서 먼저 유행했고, 이번 주 국내에서 집에서 만드는 영상이 48개 올라오며 검색량이 지난주의 3.2배가 됐어요. 편의점에도 비슷한 제품이 나오기 시작했어요.",
    category: "디저트",
    tags: ["디저트"],
    cookMinutes: 40,
    cookLabel: "조리 40분, 굳히기 1시간",
    difficulty: "보통",
    servings: "8조각 분량",
    likes: 1240,
    videos: 48,
    multiplier: 3.2,
    trend: [12, 13, 12, 15, 14, 18, 20, 24, 31, 40, 47, 56, 65, 76],
    image: dubai,
    alt: "접시에 놓인 두바이 초콜릿 조각, 단면에 초록 피스타치오 속이 보인다",
    heroImage: dubai2,
    heroAlt: "초록 포장지 위에 놓인 한입 베어 문 두바이 초콜릿, 피스타치오 속이 보인다",
    ingredients: [
      { name: "피스타치오 스프레드 200g", price: 12900 },
      { name: "카다이프 면 250g", price: 8500, hard: true },
      { name: "다크 초콜릿 커버춰 300g", price: 9800 },
      { name: "무염 버터 200g", price: 6200 },
      { name: "설탕", pantry: true },
      { name: "소금", pantry: true },
    ],
    steps: [
      { text: "카다이프 면을 2cm 길이로 자르고, 버터를 녹인 팬에서 약불로 노릇해질 때까지 볶아요.", timerMinutes: 8 },
      { text: "볶은 카다이프를 한 김 식힌 뒤 피스타치오 스프레드, 소금 한 꼬집과 섞어요." },
      { text: "다크 초콜릿을 중탕으로 녹여 틀 안쪽에 얇게 바르고 냉동실에서 굳혀요.", timerMinutes: 10 },
      { text: "2번 필링을 꾹꾹 눌러 채우고, 남은 초콜릿으로 윗면을 덮어요." },
      { text: "냉장실에서 1시간 굳힌 뒤 틀에서 꺼내 잘라요.", timerMinutes: 60 },
    ],
    tip: "카다이프를 덜 볶으면 금방 눅눅해져요. 갈색이 돌고 바스락 소리가 날 때까지 볶아 주세요.",
    convenience: [
      { place: "편의점 디저트 코너", desc: "'두바이 스타일' 초콜릿 바, 쿠키 제품이 나와 있어요" },
      { place: "대형마트 수입과자 코너", desc: "피스타치오 크림 초콜릿을 찾아보세요" },
    ],
  },
  {
    slug: "chicken-mayo-deopbap",
    rank: 2,
    name: "치킨마요 덮밥",
    change: "어제보다 2계단 올라왔어요",
    why: "남은 치킨을 잘게 찢어 마요네즈, 데리야끼 소스와 함께 밥 위에. 배달 치킨 다음 날 메뉴로 많이 찾아요.",
    summary:
      "배달 치킨이 남았을 때 만드는 덮밥이에요. 주말 다음 날 검색이 몰리는 패턴이 이번 주 더 커졌고, '남은 치킨 활용' 영상이 31개 올라왔어요.",
    category: "밥",
    tags: ["10분컷", "자취생"],
    cookMinutes: 10,
    cookLabel: "조리 10분",
    difficulty: "쉬움",
    servings: "1인분",
    likes: 8410,
    videos: 31,
    multiplier: 2.1,
    trend: rising(48),
    image: deopbap,
    alt: "치킨 위에 마요네즈와 채소를 올린 덮밥",
    ingredients: [
      { name: "데리야끼 소스 250g", price: 3900 },
      { name: "마요네즈 500g", price: 4500 },
      { name: "조미김 플레이크 70g", price: 3200 },
      { name: "즉석밥 210g 6개", price: 7900 },
      { name: "계란", pantry: true },
    ],
    steps: [
      { text: "남은 치킨은 살만 발라 잘게 찢고, 팬에 데리야끼 소스 2큰술과 함께 1분 볶아요.", timerMinutes: 1 },
      { text: "계란 1개를 스크램블로 부드럽게 익혀요." },
      { text: "밥 위에 계란, 치킨 순으로 올리고 마요네즈와 김 플레이크를 뿌려요." },
    ],
    tip: "치킨 껍질은 따로 바삭하게 구워 올리면 식감이 살아나요.",
    convenience: [{ place: "편의점 도시락 코너", desc: "치킨마요 덮밥 도시락이 대부분 매장에 있어요" }],
  },
  {
    slug: "shrimp-rose-tteokbokki",
    rank: 3,
    name: "새우 로제 떡볶이",
    change: "1계단 올라왔어요",
    why: "고추장 소스에 우유와 크림치즈를 더해 덜 맵고 고소하게. 분식집 인기 메뉴를 집에서.",
    summary: "프랜차이즈 신메뉴 출시 뒤 '집에서 로제 떡볶이' 검색이 늘었어요. 이번 주 관련 영상 27개.",
    category: "분식",
    tags: ["안주"],
    cookMinutes: 20,
    cookLabel: "조리 20분",
    difficulty: "쉬움",
    servings: "2인분",
    likes: 6920,
    videos: 27,
    multiplier: 1.8,
    trend: rising(41),
    image: tteokbokki,
    alt: "새우와 떡이 들어간 주황빛 로제 떡볶이",
    ingredients: [
      { name: "밀떡 500g", price: 2900 },
      { name: "냉동 새우 300g", price: 8900 },
      { name: "크림치즈 200g", price: 5400 },
      { name: "우유 900ml", price: 2800 },
      { name: "고추장 500g", price: 4200 },
      { name: "체다 슬라이스 치즈 10매", price: 4900 },
    ],
    steps: [
      { text: "떡은 물에 10분 불리고, 새우는 찬물에 해동해요.", timerMinutes: 10 },
      { text: "팬에 우유 300ml, 고추장 2큰술, 크림치즈 2큰술을 넣고 저어 가며 끓여요." },
      { text: "떡과 새우를 넣고 중불에서 7분 졸인 뒤 치즈 1장을 올려 녹여요.", timerMinutes: 7 },
    ],
    tip: "우유가 끓어 넘치기 쉬우니 중약불을 유지하세요.",
    convenience: [{ place: "편의점 즉석식품 코너", desc: "컵 로제 떡볶이가 나와 있어요" }],
  },
  {
    slug: "airfryer-gyeranppang",
    rank: 4,
    name: "에어프라이어 계란빵",
    change: "순위 그대로",
    why: "핫케이크 가루 반죽에 계란을 하나씩. 에어프라이어 15분이면 길거리 그 맛이에요.",
    summary: "날씨가 추워지며 길거리 간식 검색이 함께 늘었어요. 에어프라이어 버전 영상이 22개.",
    category: "간식",
    tags: ["10분컷", "자취생"],
    cookMinutes: 15,
    cookLabel: "조리 15분",
    difficulty: "쉬움",
    servings: "4개",
    likes: 5130,
    videos: 22,
    multiplier: 1.5,
    trend: rising(33),
    image: gyeranppang,
    alt: "철판 위에 줄지어 구워지는 계란빵",
    ingredients: [
      { name: "핫케이크 가루 500g", price: 3500 },
      { name: "실리콘 머핀컵 6구", price: 6900 },
      { name: "슬라이스 햄 200g", price: 3900 },
      { name: "계란", pantry: true },
      { name: "우유", pantry: true },
    ],
    steps: [
      { text: "핫케이크 가루 200g, 우유 150ml, 계란 1개를 섞어 반죽해요." },
      { text: "머핀컵에 반죽을 절반 채우고 햄 조각과 계란 1개를 올려요." },
      { text: "170도 에어프라이어에서 15분 구워요.", timerMinutes: 15 },
    ],
    tip: "노른자에 이쑤시개로 구멍을 한 번 내면 터지지 않아요.",
    convenience: [{ place: "편의점 베이커리 코너", desc: "계란빵·계란 머핀 제품을 찾아보세요" }],
  },
  {
    slug: "shrimp-cream-risotto",
    rank: 5,
    name: "새우 크림 리조또",
    change: "1계단 내려갔어요",
    why: "즉석밥에 우유와 치즈를 넣고 졸이면 끝. 냉동 새우로 충분해요.",
    summary: "'즉석밥 리조또' 영상이 꾸준히 올라오고 있어요. 이번 주 19개.",
    category: "밥",
    tags: ["자취생"],
    cookMinutes: 25,
    cookLabel: "조리 25분",
    difficulty: "보통",
    servings: "1인분",
    likes: 4870,
    videos: 19,
    multiplier: 1.3,
    trend: rising(28),
    image: risotto,
    alt: "새우와 채소를 올린 크림 리조또",
    ingredients: [
      { name: "냉동 새우 300g", price: 8900 },
      { name: "파마산 치즈 가루 227g", price: 9900 },
      { name: "즉석밥 210g 6개", price: 7900 },
      { name: "양송이버섯 200g", price: 3500 },
      { name: "우유 900ml", price: 2800 },
      { name: "버터", pantry: true },
    ],
    steps: [
      { text: "버터를 녹인 팬에 새우와 버섯을 넣고 3분 볶아요.", timerMinutes: 3 },
      { text: "즉석밥과 우유 200ml를 넣고 저어 가며 8분 졸여요.", timerMinutes: 8 },
      { text: "불을 끄고 치즈 가루 2큰술을 넣어 섞어요." },
    ],
    tip: "우유를 한 번에 다 넣지 말고 두 번에 나눠 넣으면 덜 뭉쳐요.",
    convenience: [{ place: "편의점 냉동식품 코너", desc: "냉동 크림 리조또를 데워 맛볼 수 있어요" }],
  },
  {
    slug: "tuna-gimbap",
    rank: 6,
    name: "참치 김밥",
    change: "2계단 내려갔어요",
    why: "깻잎으로 참치마요를 감싸 말면 물기 없이 깔끔해요.",
    summary: "소풍철이 지나며 조금 내려왔지만 '깻잎 참치김밥' 검색은 여전히 높아요.",
    category: "밥",
    tags: ["자취생"],
    cookMinutes: 20,
    cookLabel: "조리 20분",
    difficulty: "보통",
    servings: "3줄",
    likes: 3960,
    videos: 15,
    multiplier: 1.1,
    trend: rising(22),
    image: gimbap,
    alt: "접시에 썰어 놓은 김밥",
    ingredients: [
      { name: "김밥김 10매", price: 3900 },
      { name: "참치 캔 150g 3개", price: 7900 },
      { name: "깻잎 30장", price: 2500 },
      { name: "단무지·우엉 세트", price: 3200 },
      { name: "마요네즈 500g", price: 4500 },
      { name: "즉석밥 210g 6개", price: 7900 },
    ],
    steps: [
      { text: "참치는 기름을 꼭 짜고 마요네즈 2큰술과 섞어요." },
      { text: "김 위에 밥을 얇게 펴고 깻잎 2장, 참치마요, 단무지·우엉을 올려요." },
      { text: "단단히 말아 참기름을 바르고 잘라요." },
    ],
    tip: "칼에 물을 묻혀 가며 썰면 단면이 깔끔해요.",
    convenience: [{ place: "편의점 김밥 코너", desc: "참치마요 삼각김밥·김밥이 늘 있어요" }],
  },
  {
    slug: "butter-garaetteok",
    rank: 7,
    name: "버터 가래떡구이",
    change: "새로 들어왔어요",
    why: "가래떡을 버터에 노릇하게 굽고 꿀을 한 줄. 겨울 간식으로 다시 뜨고 있어요.",
    summary: "카페 신메뉴로 소개된 뒤 검색이 이번 주 새로 올라왔어요. 영상 12개.",
    category: "간식",
    tags: ["10분컷", "디저트"],
    cookMinutes: 10,
    cookLabel: "조리 10분",
    difficulty: "쉬움",
    servings: "2인분",
    likes: 3720,
    videos: 12,
    multiplier: 2.4,
    trend: rising(36),
    image: garaetteok,
    alt: "접시에 가지런히 놓인 가래떡",
    ingredients: [
      { name: "가래떡 1kg", price: 6900 },
      { name: "무염 버터 200g", price: 6200 },
      { name: "꿀 500g", price: 9800 },
    ],
    steps: [
      { text: "굳은 가래떡은 끓는 물에 1분 데쳐 말랑하게 해요.", timerMinutes: 1 },
      { text: "버터를 녹인 팬에서 앞뒤로 노릇하게 5분 구워요.", timerMinutes: 5 },
      { text: "꿀을 한 줄 뿌려 바로 먹어요." },
    ],
    tip: "소금을 아주 조금 뿌리면 단맛이 더 살아나요.",
    convenience: [{ place: "떡집·마트 떡 코너", desc: "말랑한 가래떡을 사면 데치지 않아도 돼요" }],
  },
  {
    slug: "perilla-makguksu",
    rank: 8,
    name: "들기름 막국수",
    change: "3계단 올라왔어요",
    why: "메밀면에 들기름, 간장, 김가루. 양념 세 가지로 끝나는 국수예요.",
    summary: "유명 식당 레시피 공개 영상 뒤 다시 올라왔어요. 이번 주 영상 14개.",
    category: "면",
    tags: ["10분컷", "자취생"],
    cookMinutes: 15,
    cookLabel: "조리 15분",
    difficulty: "쉬움",
    servings: "1인분",
    likes: 3410,
    videos: 14,
    multiplier: 1.7,
    trend: rising(30),
    image: makguksu,
    alt: "김가루와 계란을 올린 막국수",
    ingredients: [
      { name: "메밀면 1kg", price: 5900 },
      { name: "들기름 300ml", price: 11900 },
      { name: "조미김 플레이크 70g", price: 3200 },
      { name: "간장", pantry: true },
      { name: "설탕", pantry: true },
    ],
    steps: [
      { text: "메밀면을 끓는 물에 4분 삶아요.", timerMinutes: 4 },
      { text: "찬물에 비벼 전분기를 빼고 물기를 꼭 짜요." },
      { text: "들기름 2큰술, 간장 1큰술, 설탕 반 큰술에 버무리고 김가루를 듬뿍 올려요." },
    ],
    tip: "면을 얼음물에 한 번 더 헹구면 훨씬 쫄깃해요.",
    convenience: [{ place: "편의점 면 코너", desc: "들기름 막국수 컵 제품을 찾아보세요" }],
  },
  {
    slug: "green-onion-bagel",
    rank: 9,
    name: "대파 크림치즈 베이글",
    change: "1계단 올라왔어요",
    why: "구운 대파를 다져 크림치즈에 섞으면 베이글 가게 맛.",
    summary: "베이글 전문점 유행이 이어지며 '대파 크림치즈 만들기' 검색이 늘었어요.",
    category: "간식",
    tags: ["10분컷"],
    cookMinutes: 10,
    cookLabel: "조리 10분",
    difficulty: "쉬움",
    servings: "2개",
    likes: 2980,
    videos: 11,
    multiplier: 1.4,
    trend: rising(25),
    image: bagel,
    alt: "크림치즈를 곁들인 참깨 베이글",
    ingredients: [
      { name: "냉동 베이글 4개", price: 8900 },
      { name: "크림치즈 200g", price: 5400 },
      { name: "대파 1단", price: 2900 },
    ],
    steps: [
      { text: "대파 흰 부분을 마른 팬에 5분 구워 잘게 다져요.", timerMinutes: 5 },
      { text: "실온에 둔 크림치즈와 대파, 꿀 한 작은술을 섞어요." },
      { text: "반 갈라 구운 베이글에 듬뿍 발라요." },
    ],
    tip: "대파를 충분히 구워야 매운맛 없이 달아져요.",
    convenience: [{ place: "편의점 베이커리 코너", desc: "베이글과 크림치즈 세트가 있어요" }],
  },
  {
    slug: "egg-green-onion-ramyeon",
    rank: 10,
    name: "계란 파 라면",
    change: "순위 그대로",
    why: "계란은 불 끄기 30초 전에, 파는 아끼지 말고.",
    summary: "늘 상위권인 메뉴예요. 이번 주 '라면 맛있게 끓이는 법' 영상 9개.",
    category: "면",
    tags: ["10분컷", "자취생", "안주"],
    cookMinutes: 8,
    cookLabel: "조리 8분",
    difficulty: "쉬움",
    servings: "1인분",
    likes: 2550,
    videos: 9,
    multiplier: 1.0,
    trend: rising(18),
    image: ramyeon,
    alt: "계란과 파를 올린 라면",
    ingredients: [
      { name: "라면 5개입", price: 4500 },
      { name: "대파 1단", price: 2900 },
      { name: "계란", pantry: true },
    ],
    steps: [
      { text: "물 550ml를 끓이고 면과 스프를 넣어요." },
      { text: "4분 끓인 뒤 대파를 듬뿍 넣어요.", timerMinutes: 4 },
      { text: "불 끄기 30초 전에 계란을 넣고 휘젓지 않아요." },
    ],
    tip: "파는 흰 부분을 먼저, 초록 부분은 마지막에 넣으면 향이 살아요.",
    convenience: [{ place: "편의점 라면 코너", desc: "즉석 조리기로 바로 끓여 먹을 수 있어요" }],
  },
];

export const buyable = (food: Food) => food.ingredients.filter((i) => !i.pantry);

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 쿠팡 파트너스 링크 자리. 승인 전에는 운영자가 수동 등록(CLAUDE.md), MVP는 쿠팡 검색 링크로 대신한다 */
export const coupangUrl = (name: string) =>
  `https://www.coupang.com/np/search?q=${encodeURIComponent(name.replace(/\s[\d.]+\s?(g|kg|ml|매|개|개입|구|장|단).*$/, ""))}`;

export const sortOptions = ["급상승순", "좋아요순", "조리시간순"] as const;
export const tagOptions = ["10분컷", "자취생", "디저트", "안주"] as const;
export const categoryOptions = ["디저트", "밥", "면", "분식", "간식"] as const;
