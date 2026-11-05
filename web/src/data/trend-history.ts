// 연도는 출시 연도가 아니라 해당 시기의 유행을 확인한 보도 기준이다. 로컬 검토용 자료.
export type TrendHistoryItem = {
  year: number;
  name: string;
  summary: string;
  source: string;
  url: string;
  recipeSlug?: string;
};

export const trendHistory: TrendHistoryItem[] = [
  { year: 2010, name: "막걸리", summary: "전통주에 대한 관심과 함께 막걸리 소비·수출 열기가 이어졌어요.", source: "동아일보 · 2010.12.29", url: "https://www.donga.com/news/Society/article/all/20101229/33588897/1" },
  { year: 2011, name: "꼬꼬면·나가사끼 짬뽕", summary: "닭육수와 하얀 국물을 내세운 라면들이 인기를 모았어요.", source: "파이낸셜뉴스 · 2011.12.21", url: "https://www.fnnews.com/news/201112211746293868" },
  { year: 2012, name: "불닭볶음면", summary: "강한 매운맛을 내세워 등장한 볶음라면이 주목받았어요.", source: "중앙일보 · 라면로드", url: "https://www.joongang.co.kr/article/22988509" },
  { year: 2013, name: "짜파구리", summary: "서로 다른 라면을 섞어 먹는 조합이 인기를 끌었어요.", source: "농심 · 2013년 상반기 라면시장", url: "https://www.nongshim.com/promotion/notice/press_view?groupCode=003&groupId=229&page=3" },
  { year: 2014, name: "허니버터칩", summary: "달콤하고 짭짤한 감자칩이 입소문을 타며 품귀 현상을 빚었어요.", source: "동아일보 · 2014.12.11", url: "https://www.donga.com/news/article/all/20141211/68492556/3" },
  { year: 2015, name: "짜왕", summary: "프리미엄 짜장라면의 인기가 국내에서 해외로도 이어졌어요.", source: "이투데이 · 2015.09.24", url: "https://www.etoday.co.kr/news/view/1205704" },
  { year: 2016, name: "대왕 카스테라", summary: "큼직하고 부드러운 대만식 카스테라가 디저트 시장에서 주목받았어요.", source: "매일경제 · 2016.12.29", url: "https://www.mk.co.kr/news/economy/7639667" },
  { year: 2017, name: "쌀핫도그", summary: "쌀 반죽과 치즈 등 다양한 속재료를 넣은 핫도그가 인기를 끌었어요.", source: "동행미디어 시대 · 2017.08.17", url: "https://www.sidae.com/article/2017081014598092419" },
  { year: 2018, name: "곱창구이", summary: "방송 속 먹방이 화제를 모으며 곱창을 찾는 사람이 늘었어요.", source: "헤럴드경제 · 2018.07.06", url: "https://biz.heraldcorp.com/article/1718568" },
  { year: 2019, name: "흑당 버블티", summary: "진한 흑당 시럽이 보이는 달콤한 음료가 관심을 모았어요.", source: "서울신문 · 2019.08.01", url: "https://m.seoul.co.kr/news/economy/2019/08/01/20190801018026" },
  { year: 2019, name: "마라탕", summary: "얼얼하고 매운 마라 풍미를 즐기는 흐름이 외식 시장으로 퍼졌어요.", source: "한국경제 · 2019.09.01", url: "https://www.hankyung.com/article/2019090120601" },
  { year: 2020, name: "달고나 커피", summary: "집에서 커피를 휘저어 만드는 놀이가 온라인에서 확산됐어요.", source: "한국경제 · 2020.03.19", url: "https://www.hankyung.com/article/202003194552i" },
  { year: 2021, name: "로제 떡볶이", summary: "매콤한 양념에 크림을 더한 떡볶이가 배달 메뉴로 인기를 끌었어요.", source: "식품외식경제 · 2021.03.30", url: "https://www.foodbank.co.kr/news/articleView.html?idxno=61222" },
  { year: 2022, name: "포켓몬빵", summary: "재출시된 빵과 동봉 스티커를 모으는 열기가 함께 커졌어요.", source: "연합뉴스 · 2022.03.12", url: "https://www.yna.co.kr/view/AKR20220311075900505" },
  { year: 2023, name: "탕후루", summary: "과일을 바삭한 설탕 코팅으로 감싼 간식이 화제가 됐어요.", source: "노컷뉴스 · 2023.09.12", url: "https://www.nocutnews.co.kr/news/6011209" },
  { year: 2023, name: "먹태깡", summary: "먹태 풍미를 넣은 과자가 출시 직후 품귀 현상으로 주목받았어요.", source: "뉴스핌 · 2023.07.10", url: "https://www.newspim.com/news/view/20230710000880" },
  { year: 2024, name: "두바이 초콜릿", summary: "피스타치오와 바삭한 카다이프를 넣은 초콜릿이 관심을 모았어요.", source: "국민일보 · 2024.07.14", url: "https://www.kmib.co.kr/article/view.asp?arcid=0020305303", recipeSlug: "dubai-chocolate" },
  { year: 2025, name: "말차 음료·디저트", summary: "말차를 넣은 음료와 디저트가 국내 식품·외식업계로 넓게 퍼졌어요.", source: "연합뉴스 · 2025.08.28", url: "https://www.yna.co.kr/view/AKR20250827144400030" },
];
