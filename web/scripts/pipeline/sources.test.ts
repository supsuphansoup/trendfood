import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { naverTrend } from "./sources.ts";

const originalUrl = process.env.NAVER_DATALAB_URL;

beforeEach(() => {
  delete process.env.NAVER_DATALAB_URL;
  mock.method(Date, "now", () => new Date("2026-11-10T03:00:00Z").getTime());
});

afterEach(() => {
  mock.restoreAll();
  if (originalUrl === undefined) delete process.env.NAVER_DATALAB_URL;
  else process.env.NAVER_DATALAB_URL = originalUrl;
});

test("네이버 HUB 요청: 주소·인증 헤더·14일 본문과 5개씩 그룹 묶기", async (t) => {
  const names = ["버터떡", "두바이 쫀득쿠키", "마약 계란 장조림", "대패 숙주 볶음", "로제 떡볶이", "탕후루", "약과", "소금빵", "크림 라떼", "감자 전", "치즈\t토스트"];
  const groups: string[][] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, "https://naverapihub.apigw.ntruss.com/search-trend/v1/search");
    assert.equal(init?.method, "POST");
    assert.deepEqual(init.headers, {
      "X-NCP-APIGW-API-KEY-ID": "test-key-id",
      "X-NCP-APIGW-API-KEY": "test-key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(String(init.body));
    assert.equal(body.startDate, "2026-10-27");
    assert.equal(body.endDate, "2026-11-09");
    assert.equal(body.timeUnit, "date");
    const keywordGroups = body.keywordGroups as { groupName: string; keywords: string[] }[];
    assert.ok(keywordGroups.length <= 5);
    for (const group of keywordGroups) assert.ok(group.keywords.length <= 2);
    if (groups.length === 0) {
      assert.deepEqual(keywordGroups[0], { groupName: "버터떡", keywords: ["버터떡"] });
      assert.deepEqual(keywordGroups[1], { groupName: "두바이 쫀득쿠키", keywords: ["두바이 쫀득쿠키", "두바이쫀득쿠키"] });
    }
    if (groups.length === 2) {
      assert.deepEqual(keywordGroups[0], { groupName: "치즈\t토스트", keywords: ["치즈\t토스트", "치즈토스트"] });
    }
    groups.push(keywordGroups.map((group) => group.groupName));
    return Response.json({ results: keywordGroups.map((group) => ({ title: group.groupName, data: [] })) });
  });

  const result = await naverTrend(names, "test-key-id", "test-key");
  assert.deepEqual(groups.map((group) => group.length), [5, 5, 1]);
  assert.deepEqual(groups.flat(), names);
  assert.deepEqual([...result.keys()], names);
});

test("네이버 HUB 응답: 빠진 날짜는 0, 날짜순 14일과 소수 비율 유지", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    results: [
      { title: "버터떡", data: [
        { period: "2026-11-09", ratio: 100 },
        { period: "2026-10-28", ratio: 25.5 },
        { period: "2026-10-26", ratio: 80 },
      ] },
      { title: "탕후루", data: [] },
    ],
  }));

  const result = await naverTrend(["버터떡", "탕후루"], "test-key-id", "test-key");
  assert.deepEqual(result.get("버터떡"), [0, 25.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100]);
  assert.deepEqual(result.get("탕후루"), Array(14).fill(0));
});

test("네이버 HUB 주소: NAVER_DATALAB_URL로 전체 주소 교체", async (t) => {
  process.env.NAVER_DATALAB_URL = "https://example.test/naver-trend";
  const fetch = t.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    assert.equal(url, "https://example.test/naver-trend");
    return Response.json({ results: [] });
  });
  assert.deepEqual(await naverTrend(["버터떡"], "test-key-id", "test-key"), new Map());
  assert.equal(fetch.mock.callCount(), 1);
});

test("네이버 HUB 기간: 지정한 일수로 요청하고 응답을 채움", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.startDate, "2026-11-07");
    assert.equal(body.endDate, "2026-11-09");
    return Response.json({ results: [{ title: "버터떡", data: [{ period: "2026-11-08", ratio: 75 }] }] });
  });
  assert.deepEqual((await naverTrend(["버터떡"], "test-key-id", "test-key", 3)).get("버터떡"), [0, 75, 0]);
});

const errors = [
  {
    name: "Gateway 인증 오류와 상세 설명",
    status: 401,
    body: { error: { errorCode: "200", message: "인증 실패", details: "인증 정보를 확인하세요" } },
    message: "네이버 API HUB 오류 401: 인증 실패: 인증 정보를 확인하세요",
  },
  {
    name: "검색어 트렌드 검증 오류",
    status: 400,
    body: { errMsg: "시작 날짜가 필요합니다", errId: "test-error", body: "요청 본문은 로그에 넣지 않음" },
    message: "네이버 API HUB 오류 400: 시작 날짜가 필요합니다",
  },
  {
    name: "공통 평면 오류",
    status: 403,
    body: { errorCode: "403", errorMessage: "허용되지 않은 호출입니다" },
    message: "네이버 API HUB 오류 403: 허용되지 않은 호출입니다",
  },
  {
    name: "Gateway 429 한도 초과",
    status: 429,
    body: { error: { errorCode: "429", message: "호출 한도를 초과했습니다" } },
    message: "네이버 API HUB 한도 초과 429: 호출 한도를 초과했습니다",
  },
  {
    name: "본문 없는 429 한도 초과",
    status: 429,
    body: {},
    message: "네이버 API HUB 한도 초과 429: 오류 설명 없음",
  },
  {
    name: "Gateway 본문 코드 429 한도 초과",
    status: 400,
    body: { error: { errorCode: "429", message: "월 한도 초과" } },
    message: "네이버 API HUB 한도 초과 400: 월 한도 초과",
  },
  {
    name: "평면 본문 코드 429 한도 초과",
    status: 400,
    body: { errorCode: "429", errorMessage: "일 한도 초과" },
    message: "네이버 API HUB 한도 초과 400: 일 한도 초과",
  },
];

for (const error of errors) {
  test(`네이버 HUB 오류: ${error.name}`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => Response.json(error.body, { status: error.status }));
    await assert.rejects(naverTrend(["버터떡"], "test-key-id", "test-key"), { message: error.message });
  });
}

test("네이버 HUB 오류: JSON이 아니어도 HTTP 상태와 설명 유지", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("서비스 점검 중", { status: 503, statusText: "Service Unavailable" }));
  await assert.rejects(naverTrend(["버터떡"], "test-key-id", "test-key"), { message: "네이버 API HUB 오류 503: Service Unavailable" });
});

test("네이버 HUB 빈 후보: API를 호출하지 않음", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("외부 호출 금지"); });
  assert.deepEqual(await naverTrend([], "test-key-id", "test-key"), new Map());
  assert.equal(fetch.mock.callCount(), 0);
});
