// 상세 페이지 주소 목록. Proxy가 사진 import 없이 가볍게 읽도록 foods.ts와 분리했다.
// foods.ts의 slug와 같아야 한다 (e2e 테스트에서 확인).
export const foodSlugs = [
  "dubai-chocolate",
  "chicken-mayo-deopbap",
  "shrimp-rose-tteokbokki",
  "airfryer-gyeranppang",
  "shrimp-cream-risotto",
  "tuna-gimbap",
  "butter-garaetteok",
  "perilla-makguksu",
  "green-onion-bagel",
  "egg-green-onion-ramyeon",
] as const;
