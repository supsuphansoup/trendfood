import assert from "node:assert/strict";
import { test } from "node:test";
import { youtubeId } from "../src/data/admin-food-edit.ts";
import { recordToRow, rowToRecord } from "../src/data/db-mapping.ts";
import { seedFoods } from "../src/data/seed-foods.ts";

const id = "AbCdEfGhI_1";

test("영상 주소 해석: 빈 값·공백은 내림, 11자 ID는 그대로 저장", () => {
  for (const input of ["", " \n\t "]) assert.deepEqual(youtubeId(input), { value: null });
  for (const input of [id, ` ${id} `, "a-b_Cd01234"]) assert.deepEqual(youtubeId(input), { value: input.trim() });
});

test("영상 주소 해석: 공식 호스트의 watch·shorts·embed·live·짧은 주소, http(s)와 부가 쿼리", () => {
  for (const host of ["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"]) {
    for (const path of [`watch?v=${id}&t=30`, `shorts/${id}?si=x`, `embed/${id}?start=30`, `live/${id}?si=x`]) {
      for (const protocol of ["http", "https"]) {
        const input = `${protocol}://${host}/${path}`;
        assert.deepEqual(youtubeId(input), { value: id }, input);
      }
    }
  }
  assert.deepEqual(youtubeId(`https://youtu.be/${id}?si=x`), { value: id });
  assert.deepEqual(youtubeId(`http://youtu.be/${id}?t=30`), { value: id });
});

for (const [kind, inputs] of [
  ["다른 호스트", [`https://example.com/watch?v=${id}`, `https://www.youtu.be/${id}`, `https://youtube-nocookie.com/embed/${id}`]],
  ["위장 호스트", [`https://youtube.com.evil.com/watch?v=${id}`, `https://youtu.be.evil.com/${id}`, `https://youtube.com@evil.com/watch?v=${id}`]],
  ["11자가 아닌 ID·허용하지 않는 문자", ["short", "AbCdEfGhI_12", "AbCdEfGhI!1", "https://youtu.be/short", "https://youtube.com/watch?v=short", "https://youtube.com/embed/AbCdEfGhI_12", `https://youtube.com/watch?v=${id}%0A`]],
  ["주소 꼴·프로토콜·경로 오류", [`youtube.com/watch?v=${id}`, `https:youtube.com/watch?v=${id}`, `https:/youtube.com/watch?v=${id}`, `ftp://youtube.com/watch?v=${id}`, `https://youtube.com/unknown/${id}`, "https://youtube.com/watch", `https://youtu.be/${id}/extra`, "주소 아님"]],
] as const) {
  test(`영상 주소 해석 오류: ${kind}`, () => {
    for (const input of inputs) assert.deepEqual(youtubeId(input), { error: "YouTube 주소나 11자 영상 ID를 적어 주세요." }, input);
  });
}

test("DB 영상 변환: 정상 ID·열 없음·undefined·null·형식 오류", () => {
  const row = recordToRow(seedFoods[0]);
  assert.equal(rowToRecord({ ...row, video_id: id }).videoId, id);
  const missing = { ...row };
  delete missing.video_id;
  assert.equal(rowToRecord(missing).videoId, null);
  for (const video_id of [undefined, null, "", "short", "AbCdEfGhI_12", "AbCdEfGhI!1", ` ${id} `, `${id}\n`]) {
    assert.equal(rowToRecord({ ...row, video_id }).videoId, null);
  }
});

test("예시 영상 변환: 치킨마요만 테스트 ID, 행에도 video_id 저장", () => {
  assert.deepEqual(seedFoods.filter((food) => food.videoId).map((food) => [food.slug, food.videoId]), [["chicken-mayo-deopbap", "trendfood01"]]);
  for (const food of seedFoods) assert.equal(recordToRow(food).video_id, food.videoId);
});
