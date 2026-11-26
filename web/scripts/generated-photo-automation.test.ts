import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { ContentSnapshot } from "../src/data/content.ts";
import type { PhotoCredit } from "../src/data/photo-credits.ts";
import { appendGeneratedPhotos, editReference, generatedPhotoFactory, imageDate, readImageState, type ImageState } from "./generated-photo-automation.ts";
import { imageReservationSaved, releaseUnusedImageReservation } from "./check-image-reservation.ts";

const snapshot = JSON.parse(await readFile(new URL("../src/data/content/foods.json", import.meta.url), "utf8")) as ContentSnapshot;
const food = { ...snapshot.foods[0], slug: "test-food", image: "pending", heroImage: undefined, summary: '원문에서 "특별한 음식"으로 소개했어요.\n소개와 같은 모습이에요.' };
const reference: PhotoCredit = { title: "Test food", author: "작가", url: "https://commons.wikimedia.org/wiki/File:Test_food.jpg", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Test.jpg", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", verifiedAt: "2026-11-23", note: "" };
const now = new Date("2026-11-22T23:00:00Z");
const bytes = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "orange" } }).webp().toBuffer();
const approved = { match: true, referenceMatches: true, distinctComposition: true, recipeMatches: true, presentationSuitable: true, naturalAppearance: true, noText: true, confidence: 0.99, reason: "일치" };

test("이미지 API는 실제 참고 파일·고정 모델·1장만 보내며 유료 재시도를 하지 않는다", async () => {
  let calls = 0;
  const output = await editReference("생성 요청", bytes, "test-key", (async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/images/edits");
    assert.equal(init?.redirect, "error");
    const form = init!.body as FormData;
    assert.equal(form.get("model"), "gpt-image-2"); assert.equal(form.get("n"), "1");
    assert.equal(form.get("size"), "1536x1024"); assert.equal(form.get("quality"), "medium");
    assert.ok(form.get("image[]") instanceof Blob);
    assert.deepEqual(Buffer.from(await (form.get("image[]") as Blob).arrayBuffer()), bytes);
    return Response.json({ data: [{ b64_json: bytes.toString("base64") }] });
  }) as typeof fetch);
  assert.deepEqual(output, bytes); assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(editReference("요청", bytes, "test-key", (async () => { calls++; return new Response("비밀 응답", { status: 429 }); }) as typeof fetch), /429.*재시도하지/);
  assert.equal(calls, 1);
  for (const data of [[], [{ url: "https://example.com/image" }], [{ b64_json: "%%%" }], [{ b64_json: "AAAA" }, { b64_json: "AAAA" }]]) {
    await assert.rejects(editReference("요청", bytes, "test-key", (async () => Response.json({ data })) as typeof fetch), /응답 형식/);
  }
});

test("출처·판별·크롭을 통과한 생성 결과만 별도 등록하고 KST 일일 호출을 먼저 저장한다", async () => {
  const state: ImageState = { version: 1, attempts: [] };
  const saved: ImageState[] = [];
  const generate = generatedPhotoFactory({ state, now,
    saveState: async (value) => { saved.push(structuredClone(value)); },
    edit: async (prompt, referenceBytes) => {
      assert.equal(saved[0].attempts[0].status, "reserved");
      assert.match(prompt, /정확한 음식/); assert.match(prompt, /접시·카메라 각도·조명·배치·배경/);
      assert.match(prompt, /굽기 편차·칼로 썬 단면·소스 두께/);
      assert.match(prompt, /배경 여백을 늘려 음식이 작아지지 않게/);
      assert.ok(referenceBytes?.length); return bytes;
    },
    inspect: async (prompt, schema, images) => {
      assert.equal(images?.length, 5);
      assert.ok((schema.required as string[]).includes("referenceMatches"));
      assert.ok((schema.required as string[]).includes("distinctComposition"));
      assert.ok((schema.required as string[]).includes("naturalAppearance"));
      assert.match(prompt, /같은 크기와 색으로 반복된 재료/);
      assert.match(prompt, /과도한 여백으로 음식이 작거나/);
      const sizes = await Promise.all(images!.slice(1).map(async ({ data }) => {
        const { width, height } = await sharp(Buffer.from(data, "base64")).metadata();
        return [width, height];
      }));
      assert.deepEqual(sizes, [[768, 512], [568, 240], [540, 540], [352, 264]]);
      return approved;
    },
  });
  const result = await generate(food, reference, bytes);
  assert.equal(result.key, "photo-ai-auto-test-food-20261123");
  assert.equal(result.record.tool, "OpenAI Images API");
  assert.deepEqual(result.record.reference, reference);
  assert.match(result.record.note, /AI 생성.*CC BY-SA 4.0/);
  assert.equal(saved.at(-1)!.attempts[0].status, "generated");
  const meta = await sharp(result.bytes).metadata();
  assert.equal(meta.width, 1200); assert.equal(meta.height, 800); assert.equal(meta.format, "webp");
  await assert.rejects(generate(food, reference, bytes), /오늘 이미 처리/);
  assert.equal(imageDate(new Date("2026-11-23T15:00:00Z")), "2026-11-24");
});

test("API 오류는 재시도하지 않고 품질 탈락은 최대 두 번 차감하며 복원 후 한도를 유지한다", async () => {
  for (const failure of ["api", "match", "referenceMatches", "distinctComposition", "recipeMatches", "presentationSuitable", "naturalAppearance", "noText", "confidence"]) {
    const state: ImageState = { version: 1, attempts: [] };
    let calls = 0;
    const options = { state, now, saveState: async () => {},
      edit: async () => { calls++; if (failure === "api") throw new Error("API 실패"); return bytes; },
      inspect: async () => ({ ...approved, [failure]: failure === "confidence" ? 0.94 : false }),
    };
    await assert.rejects(generatedPhotoFactory(options)(food, reference, bytes));
    assert.equal(state.attempts[0].status, failure === "api" ? "failed" : "rejected");
    await assert.rejects(generatedPhotoFactory({ ...options, state: readImageState(JSON.parse(JSON.stringify(state))) })(food, reference, bytes), /2회 한도|오늘 이미 처리/);
    assert.equal(calls, failure === "api" ? 1 : 2);
    assert.equal(state.attempts.length, calls);
  }
});

test("참고 사진이 없어도 검증된 설명으로 생성하고 사진 출처를 꾸미지 않으며 같은 일일 한도를 쓴다", async () => {
  const output = await editReference("음식 설명", undefined, "test-key", (async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/images/generations");
    assert.equal((init!.headers as Record<string, string>)["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(init!.body as string), { model: "gpt-image-2", prompt: "음식 설명", n: 1, size: "1536x1024", quality: "medium", output_format: "webp" });
    return Response.json({ data: [{ b64_json: bytes.toString("base64") }] });
  }) as typeof fetch);
  assert.deepEqual(output, bytes);
  const state: ImageState = { version: 1, attempts: [] };
  let calls = 0;
  const generate = generatedPhotoFactory({ state, now, saveState: async () => {},
    edit: async (prompt, original) => {
      calls++; assert.equal(original, undefined); assert.match(prompt, /참고 사진은 없어요/);
      assert.equal(JSON.parse(prompt.split("\n").at(-1)!).summary, food.summary);
      assert.match(prompt, /별도의 치즈 토핑을 의미하지/);
      assert.match(prompt, /PC 목록 카드.*PC 상세.*모바일 상세/);
      assert.equal(state.attempts[0].status, "reserved"); return bytes;
    },
    inspect: async (prompt, schema, images) => {
      assert.equal(images?.length, 4); assert.match(prompt, /설명만으로 일치를 판단할 수 없으면 거절/);
      assert.ok(!(schema.required as string[]).includes("referenceMatches"));
      assert.ok(!("referenceMatches" in (schema.properties as object)));
      assert.ok(!(schema.required as string[]).includes("distinctComposition"));
      assert.ok(!("distinctComposition" in (schema.properties as object)));
      const { referenceMatches: _referenceMatches, distinctComposition: _distinctComposition, ...verdict } = approved;
      void _referenceMatches; void _distinctComposition; return verdict;
    },
  });
  const result = await generate(food);
  assert.equal(result.record.basis, "description"); assert.equal(result.record.reference, undefined);
  assert.match(result.record.note, /참고 사진 없이/); assert.doesNotMatch(result.record.note, /CC BY/);
  await assert.rejects(generate(food, reference, bytes), /오늘 이미 처리/); assert.equal(calls, 1);
  for (const failure of ["match", "recipeMatches", "presentationSuitable", "naturalAppearance", "noText", "confidence"]) {
    const state: ImageState = { version: 1, attempts: [] };
    const generate = generatedPhotoFactory({ state, now, saveState: async () => {}, edit: async () => bytes,
      inspect: async () => ({ ...approved, [failure]: failure === "confidence" ? 0.94 : false }),
    });
    await assert.rejects(generate(food), /판별 보류/); assert.equal(state.attempts[0].status, "rejected");
    await assert.rejects(generate(food), /2회 한도/);
  }
});

test("세 음식이 각각 첫 품질 검사에서 탈락해도 사유를 보완해 모두 생성하며 총 6회에서 멈춘다", async () => {
  const state: ImageState = { version: 1, attempts: [] };
  let calls = 0;
  const generate = generatedPhotoFactory({ state, now, saveState: async () => {},
    edit: async (prompt) => {
      calls++;
      if (calls % 2 === 0) assert.match(prompt, /검사 지적.*모바일에서 음식의 주요 부분이 잘림/);
      else assert.doesNotMatch(prompt, /이전 생성 결과의 검사/);
      return bytes;
    },
    inspect: async () => calls % 2 ? { ...approved, presentationSuitable: false, reason: "모바일에서 음식의 주요 부분이 잘림" } : approved,
  });
  for (let index = 0; index < 3; index++) {
    const result = await generate({ ...food, slug: `new-food-${index}` });
    assert.equal(result.record.slug, `new-food-${index}`);
    assert.match(result.record.prompt, /모바일에서 음식의 주요 부분이 잘림/);
  }
  assert.equal(calls, 6);
  assert.deepEqual(state.attempts.map((item) => item.status), ["rejected", "generated", "rejected", "generated", "rejected", "generated"]);
  await assert.rejects(generate({ ...food, slug: "fourth-food" }), /총|요청 6회/);
  assert.equal(calls, 6);
});

test("생성 세 장이 첫 시도에 통과하면 남은 요청 예산으로 네 번째 음식을 만들지 않는다", async () => {
  const state: ImageState = { version: 1, attempts: [] };
  let calls = 0;
  const generate = generatedPhotoFactory({ state, now, saveState: async () => {}, edit: async () => { calls++; return bytes; }, inspect: async () => approved });
  for (let index = 0; index < 3; index++) await generate({ ...food, slug: `food-${index}` });
  await assert.rejects(generate({ ...food, slug: "food-four" }), /하루 이미지 생성 3개/);
  assert.equal(calls, 3);
});

test("기록 저장 실패·비허용 출처·실사 보유 음식은 유료 API를 호출하지 않는다", async () => {
  let calls = 0;
  const options = { state: { version: 1 as const, attempts: [] }, now,
    saveState: async () => { throw new Error("디스크 실패"); },
    edit: async () => { calls++; return bytes; }, inspect: async () => approved,
  };
  await assert.rejects(generatedPhotoFactory(options)(food, reference, bytes), /디스크 실패/);
  await assert.rejects(generatedPhotoFactory(options)({ ...food, image: "photo-existing" }, reference, bytes), /빈 대표 사진/);
  await assert.rejects(generatedPhotoFactory(options)(food, { ...reference, imageUrl: "https://localhost/a.webp" }, bytes), /출처/);
  await assert.rejects(generatedPhotoFactory(options)({ ...food, summary: " " }), /검증된 음식 설명/);
  await assert.rejects(generatedPhotoFactory(options)(food, reference), /출처/);
  assert.equal(calls, 0);
  for (const value of [null, {}, { version: 1, attempts: [{}] }, { version: 1, attempts: [{ date: "2026-11-23", slug: "test", reference: "url", status: "unknown" }] }]) assert.throws(() => readImageState(value), /호출 기록/);
});

test("전날 호출은 다음 날 생성 한도를 막지 않으며 기존 생성 번들 경로를 보존한다", async () => {
  const state: ImageState = { version: 1, attempts: [{ date: "2026-11-22", slug: "old-food", reference: reference.url, status: "failed" }] };
  await generatedPhotoFactory({ state, now, saveState: async () => {}, edit: async () => bytes, inspect: async () => approved })(food, reference, bytes);
  assert.equal(state.attempts.length, 2);
  const old = 'import image0 from "@/assets/generated/old-ref-v2.webp";\nexport const generatedPhotos = {\n  "photo-old": image0,\n};\n';
  const result = appendGeneratedPhotos(old, ["photo-ai-auto-test-food-20261123"]);
  assert.ok(result.includes('"@/assets/generated/old-ref-v2.webp"'));
  assert.ok(result.includes('"photo-old": image0'));
  assert.match(result, /photo-ai-auto-test-food-20261123.webp/);
  assert.throws(() => appendGeneratedPhotos(result, ["photo-ai-auto-test-food-20261123"]), /중복/);
  assert.throws(() => appendGeneratedPhotos(old, ["../evil"]), /잘못/);
});

test("일일 예약 캐시를 서버에서 확인하지 못하면 유료 생성을 허용하지 않는다", async () => {
  const key = "food-image-generation-day-v1-2026-11-23";
  for (const result of [new Response("", { status: 403 }), Response.json({ actions_caches: [] }), Response.json({ actions_caches: [{ key: `${key}-other`, ref: "refs/heads/main" }] }), Response.json({ actions_caches: [{ key, ref: "refs/heads/branch" }] })]) {
    assert.equal(await imageReservationSaved("owner/repo", key, "test-token", (async () => result) as typeof fetch), false);
  }
  assert.equal(await imageReservationSaved("owner/repo", key, "test-token", (async (url, init) => {
    assert.equal(new URL(String(url)).hostname, "api.github.com"); assert.equal(init?.redirect, "error");
    return Response.json({ actions_caches: [{ key, ref: "refs/heads/main" }] });
  }) as typeof fetch), true);
});

test("생성 시도 0회가 확인된 당일 main 예약만 반환하고 실패·생성·불명확한 기록은 보존한다", async () => {
  const key = "food-image-generation-day-v1-2026-11-23";
  const unused = { checkedAt: now.toISOString(), generated: [], imageGeneration: { enabled: true, attempts: [] } };
  let calls = 0;
  const fetcher = (async (url, init) => {
    calls++;
    if (init?.method === "DELETE") {
      assert.equal(url, "https://api.github.com/repos/owner/repo/actions/caches/123");
      return new Response(null, { status: 204 });
    }
    return Response.json({ actions_caches: [{ id: 999, key: `${key}-other`, ref: "refs/heads/main" }, { id: 123, key, ref: "refs/heads/main" }] });
  }) as typeof fetch;
  assert.equal(await releaseUnusedImageReservation("owner/repo", key, "test-token", unused, now, fetcher), true);
  assert.equal(calls, 2);
  for (const report of [null, {}, { ...unused, checkedAt: "invalid" }, { ...unused, checkedAt: "2026-11-21T00:00:00Z" }, { ...unused, generated: [{}] },
    ...["reserved", "failed", "rejected", "generated"].map((status) => ({ ...unused, imageGeneration: { enabled: true, attempts: [{ status }] } })),
    { ...unused, imageGeneration: { enabled: false, attempts: [] } },
  ]) assert.equal(await releaseUnusedImageReservation("owner/repo", key, "test-token", report, now, fetcher), false);
  assert.equal(calls, 2);
  for (const caches of [[], [{ id: 123, key, ref: "refs/heads/other" }], [{ id: "123", key, ref: "refs/heads/main" }]]) {
    assert.equal(await releaseUnusedImageReservation("owner/repo", key, "test-token", unused, now, (async () => Response.json({ actions_caches: caches })) as typeof fetch), false);
  }
  assert.equal(await releaseUnusedImageReservation("owner/repo", key, "test-token", unused, now, (async () => new Response("", { status: 403 })) as typeof fetch), false);
  assert.equal(await releaseUnusedImageReservation("owner/repo", key, "test-token", unused, now, (async (_url, init) => init?.method === "DELETE" ? new Response("", { status: 500 }) : Response.json({ actions_caches: [{ id: 123, key, ref: "refs/heads/main" }] })) as typeof fetch), false);
});

test("사진 전용 준비는 AI 키 없이 기준 목록을 보존하고 대기 원고의 공식 원문 확인을 생략하지 않는다", async () => {
  const directory = await mkdtemp(join(tmpdir(), "trendfood-photo-prepare-"));
  await mkdir(join(directory, "src/data/content"), { recursive: true });
  await mkdir(join(directory, "data"));
  const target = join(directory, "src/data/content/foods.json");
  await writeFile(target, JSON.stringify(snapshot));
  const script = fileURLToPath(new URL("./restore-pending-photos.ts", import.meta.url));
  const env = { ...process.env, YOUTUBE_API_KEY: "", OPENAI_API_KEY: "", GEMINI_API_KEY: "" };
  const output = execFileSync(process.execPath, [script, "--prepare"], { cwd: directory, env, encoding: "utf8" });
  assert.match(output, /통과 0개.*AI 원고 생성 없음/);
  assert.deepEqual(JSON.parse(await readFile(target, "utf8")), snapshot);
  assert.deepEqual(JSON.parse(await readFile(join(directory, "data/recommendation-input.json"), "utf8")).baseline, snapshot);
  const pending = snapshot.foods.find((food) => food.sources.some((source) => source.url.startsWith("https://www.youtube.com/watch?v=")))!;
  await writeFile(join(directory, "data/discovery-state.json"), JSON.stringify({ version: 1, observations: [], channels: [], pending: [{ food: { ...pending, slug: "new-pending", image: "pending", heroImage: undefined }, savedAt: new Date().toISOString().slice(0, 10) }] }));
  const result = spawnSync(process.execPath, [script, "--prepare"], { cwd: directory, env, encoding: "utf8" });
  assert.equal(result.status, 1); assert.match(result.stderr, /YOUTUBE_API_KEY/);
  assert.deepEqual(JSON.parse(await readFile(target, "utf8")), snapshot);
});
