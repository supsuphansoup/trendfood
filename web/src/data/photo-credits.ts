export type PhotoCredit = { title: string; author: string; url: string; license: "CC0" | "Public domain"; note: string; imageUrl: string; verifiedAt: string };

/** 메뉴와 이용 조건을 확인한 사진. 출처와 확인 날짜를 보존한다. */
export const photoCredits: Record<string, PhotoCredit> = {
  "photo-dubai-chocolate": {
    "title": "Food Dubai chocolate 003 (54517970045).jpg",
    "author": "Jan Helebrant",
    "url": "https://commons.wikimedia.org/wiki/File:Food_Dubai_chocolate_003_(54517970045).jpg",
    "license": "CC0",
    "note": "피스타치오 속을 채운 두바이 스타일 초콜릿 참고 사진이에요. 이 레시피를 직접 조리한 사진은 아니에요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Food_Dubai_chocolate_003_%2854517970045%29.jpg/1280px-Food_Dubai_chocolate_003_%2854517970045%29.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-shrimp-rose-tteokbokki": {
    "title": "Rose tteokboki from Oseyo restaurant.jpg",
    "author": "Ser Amantio di Nicolao",
    "url": "https://commons.wikimedia.org/wiki/File:Rose_tteokboki_from_Oseyo_restaurant.jpg",
    "license": "CC0",
    "note": "식당의 로제 떡볶이 참고 사진이에요. 이 페이지의 새우 토핑·배합과는 다를 수 있어요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Rose_tteokboki_from_Oseyo_restaurant.jpg/1280px-Rose_tteokboki_from_Oseyo_restaurant.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-airfryer-gyeranppang": {
    "title": "Gyeranppang (egg bread) (Seoul street food).jpg",
    "author": "tragrpx",
    "url": "https://commons.wikimedia.org/wiki/File:Gyeranppang_(egg_bread)_(Seoul_street_food).jpg",
    "license": "CC0",
    "note": "서울 길거리 계란빵 참고 사진이에요. 에어프라이어로 만든 이번 레시피의 완성 사진은 아니에요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Gyeranppang_%28egg_bread%29_%28Seoul_street_food%29.jpg/1280px-Gyeranppang_%28egg_bread%29_%28Seoul_street_food%29.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-shrimp-cream-risotto": {
    "title": "Grilled shrimp with lemon chive rosotto.jpg",
    "author": "Jon Sullivan",
    "url": "https://commons.wikimedia.org/wiki/File:Grilled_shrimp_with_lemon_chive_rosotto.jpg",
    "license": "Public domain",
    "note": "구운 새우를 곁들인 리조또 참고 사진이에요. 이번 가정용 크림 배합과는 달라요.",
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/2/2b/Grilled_shrimp_with_lemon_chive_rosotto.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-dalgona-coffee": {
    "title": "Homemade Dalgona Coffee - Odisha.jpg",
    "author": "Sangram Keshari Senapati",
    "url": "https://commons.wikimedia.org/wiki/File:Homemade_Dalgona_Coffee_-_Odisha.jpg",
    "license": "CC0",
    "note": "집에서 만든 달고나 커피 참고 사진이에요. 이번 배합으로 직접 조리한 사진은 아니에요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Homemade_Dalgona_Coffee_-_Odisha.jpg/1280px-Homemade_Dalgona_Coffee_-_Odisha.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-croffle": {
    "title": "Oreo Croffle - Fluffy Fluffy Dessert Cafe 2025-06-10.jpg",
    "author": "Andy Li",
    "url": "https://commons.wikimedia.org/wiki/File:Oreo_Croffle_-_Fluffy_Fluffy_Dessert_Cafe_2025-06-10.jpg",
    "license": "CC0",
    "note": "오레오와 크림을 올린 크로플 참고 사진이에요. 기본 레시피와 토핑이 달라요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Oreo_Croffle_-_Fluffy_Fluffy_Dessert_Cafe_2025-06-10.jpg/1280px-Oreo_Croffle_-_Fluffy_Fluffy_Dessert_Cafe_2025-06-10.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-salt-bread": {
    "title": "Salt bread (sold at supermarkets in Otaru).jpg",
    "author": "User:逃亡者 (ja:利用者:逃亡者)",
    "url": "https://commons.wikimedia.org/wiki/File:Salt_bread_(sold_at_supermarkets_in_Otaru).jpg",
    "license": "Public domain",
    "note": "매장에서 판매하는 소금빵 참고 사진이에요. 이번 레시피를 직접 구운 사진은 아니에요.",
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/e/ed/Salt_bread_%28sold_at_supermarkets_in_Otaru%29.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-tanghulu": {
    "title": "TangHuLu.JPG",
    "author": "Popo le Chien",
    "url": "https://commons.wikimedia.org/wiki/File:TangHuLu.JPG",
    "license": "CC0",
    "note": "매대에 놓인 과일 탕후루 참고 사진이에요. 과일 종류는 이번 청포도 배합과 달라요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/TangHuLu.JPG/1280px-TangHuLu.JPG",
    "verifiedAt": "2026-11-12"
  },
  "photo-matcha-latte": {
    "title": "Iced Hojicha Latte and Iced Matcha Latte - Rawlab Juice & Tea 2025-07-12.jpg",
    "author": "Andy Li",
    "url": "https://commons.wikimedia.org/wiki/File:Iced_Hojicha_Latte_and_Iced_Matcha_Latte_-_Rawlab_Juice_%26_Tea_2025-07-12.jpg",
    "license": "CC0",
    "note": "사진 오른쪽 잔은 아이스 말차 라떼이고 왼쪽은 호지차 라떼예요. 안내하는 따뜻한 배합과는 달라요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Iced_Hojicha_Latte_and_Iced_Matcha_Latte_-_Rawlab_Juice_%26_Tea_2025-07-12.jpg/1280px-Iced_Hojicha_Latte_and_Iced_Matcha_Latte_-_Rawlab_Juice_%26_Tea_2025-07-12.jpg",
    "verifiedAt": "2026-11-12"
  },
  "photo-mala-tang": {
    "title": "Malatang2025.jpg",
    "author": "Lukas010109",
    "url": "https://commons.wikimedia.org/wiki/File:Malatang2025.jpg",
    "license": "CC0",
    "note": "여러 재료를 넣은 마라탕 참고 사진이에요. 매장과 레시피에 따라 재료 구성이 달라요.",
    "imageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Malatang2025.jpg/1280px-Malatang2025.jpg",
    "verifiedAt": "2026-11-12"
  }
};
