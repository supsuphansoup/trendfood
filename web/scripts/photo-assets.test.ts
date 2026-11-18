import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { renderCuratedPhoto } from "./photo-assets.ts";

test("사진 재동기화는 검토한 음식 영역을 같은 구도로 저장한다", async () => {
  const input = await sharp({ create: { width: 400, height: 400, channels: 3, background: "red" } }).composite([
    { input: await sharp({ create: { width: 200, height: 400, channels: 3, background: "blue" } }).png().toBuffer(), left: 200, top: 0 },
  ]).png().toBuffer();
  const crop = { left: 0.5, top: 0, width: 0.5, height: 1 };
  const first = await renderCuratedPhoto(input, crop);
  assert.deepEqual(await renderCuratedPhoto(input, crop), first);
  const { data, info } = await sharp(first).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 200);
  assert.equal(info.height, 400);
  assert.ok(data[0] < 40 && data[2] > 200, "제외한 빨간 영역 대신 파란 음식 영역을 보존한다");
  assert.equal((await sharp(await renderCuratedPhoto(input)).metadata()).width, 400);
});

test("사진 구도가 음수·빈 영역·원본 밖·유한하지 않은 값이면 저장하지 않는다", async () => {
  const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).png().toBuffer();
  for (const crop of [
    { left: -0.1, top: 0, width: 1, height: 1 },
    { left: 0, top: 0, width: 0, height: 1 },
    { left: 0.5, top: 0, width: 1, height: 1 },
    { left: 0, top: 0.8, width: 1, height: 0.3 },
    { left: 0, top: 0, width: Number.NaN, height: 1 },
  ]) await assert.rejects(renderCuratedPhoto(input, crop), /사진 자르기 범위/);
});
