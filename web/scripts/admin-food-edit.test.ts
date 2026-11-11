import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanBasicInfo, cleanConvenience, cleanSteps, cleanTakedownNote, convenienceDrafts, cookLabelInput, ingredientChanges, moveItem, photoChanges, takedownReasons, type BasicInfoDraft } from "../src/data/admin-food-edit.ts";

test("내림 사유 정리: 허용 사유·선택 안 함·메모 공백 제거·200자 경계", () => {
  for (const reason of takedownReasons) assert.deepEqual(cleanTakedownNote({ reason, memo: "  확인 중  " }).value, { reason, memo: "확인 중" });
  assert.deepEqual(cleanTakedownNote({ reason: "", memo: " " }).value, { reason: "", memo: "" });
  assert.equal(cleanTakedownNote({ reason: "기타", memo: "가".repeat(200) }).value?.memo.length, 200);
  assert.equal(cleanTakedownNote({ reason: "기타", memo: "😀".repeat(200) }).value?.memo, "😀".repeat(200));
});

test("내림 사유 검증: 목록 밖 사유 거부", () => {
  assert.equal(cleanTakedownNote({ reason: "목록 밖", memo: "" }).error, "내림 사유를 목록에서 골라 주세요.");
});

test("내림 사유 검증: 메모 201자 거부", () => {
  assert.equal(cleanTakedownNote({ reason: "내용 오류", memo: "가".repeat(201) }).error, "메모는 200자까지 적을 수 있어요.");
});

const basicInfo: BasicInfoDraft = {
  name: "  두바이 초콜릿  ", category: "디저트", tags: ["안주", "목록 밖", "10분컷", "안주"],
  cook_minutes: " 10 ", cook_label: "  ", difficulty: "쉬움", servings: " 2인분 ", change_label: " 새로 들어왔어요 ",
};

test("기본 정보 정리: 공백 제거·태그 순서·목록 밖 태그 제거·빈 표시 문구와 정확한 8개 열", () => {
  const before = structuredClone(basicInfo);
  assert.deepEqual(cleanBasicInfo(basicInfo).value, {
    name: "두바이 초콜릿", category: "디저트", tags: ["10분컷", "안주"], cook_minutes: 10,
    cook_label: "", difficulty: "쉬움", servings: "2인분", change_label: "새로 들어왔어요",
  });
  assert.deepEqual(basicInfo, before);
  assert.deepEqual(cleanBasicInfo({ ...basicInfo, tags: [] }).value?.tags, []);
  assert.equal(cleanBasicInfo({ ...basicInfo, cook_label: " 조리 40분, 굳히기 1시간 ", servings: " " }).value?.cook_label, "조리 40분, 굳히기 1시간");
  for (const cook_minutes of ["1", "1440"]) assert.equal(cleanBasicInfo({ ...basicInfo, cook_minutes }).value?.cook_minutes, Number(cook_minutes));
  assert.equal(cleanBasicInfo({ ...basicInfo, name: "가".repeat(30) }).value?.name.length, 30);
});

test("기본 정보 검증: 이름 1~30자·조리 시간 1~1440 정수·순위 변동 문구 필수", () => {
  for (const name of ["", "  ", "가".repeat(31)]) assert.equal(cleanBasicInfo({ ...basicInfo, name }).error, "이름을 1~30자로 적어 주세요.");
  for (const cook_minutes of ["", " ", "0", "1441", "1.5", "-1", "abc", "1e2"]) {
    assert.equal(cleanBasicInfo({ ...basicInfo, cook_minutes }).error, "조리 시간은 1~1440 사이의 분으로 적어 주세요.");
  }
  assert.equal(cleanBasicInfo({ ...basicInfo, change_label: " " }).error, "순위 변동 문구를 적어 주세요.");
});

test("조리 시간 표시 입력: 현재 분과 같은 자동 문구만 비우고 직접 쓴 문구 유지", () => {
  assert.equal(cookLabelInput("조리 10분", 10), "");
  assert.equal(cookLabelInput("조리 10분", 15), "조리 10분");
  assert.equal(cookLabelInput("조리 40분, 굳히기 1시간", 40), "조리 40분, 굳히기 1시간");
  assert.equal(cookLabelInput(" 조리 10분 ", 10), " 조리 10분 ");
  assert.equal(cookLabelInput("", 10), "");
});

test("조리법 정리: 공백 제거, 빈 타이머 키 생략, 타이머 경계값", () => {
  assert.deepEqual(cleanSteps([{ text: " 섞어요 ", timer: " " }, { text: "굽기", timer: " 1 " }, { text: "숙성", timer: "1440" }]).value,
    [{ text: "섞어요" }, { text: "굽기", timerMinutes: 1 }, { text: "숙성", timerMinutes: 1440 }]);
});

test("조리법 검증: 빈 목록·빈 단계·범위 밖 또는 정수가 아닌 타이머 거부", () => {
  assert.equal(cleanSteps([]).error, "조리 단계를 하나 이상 적어 주세요.");
  assert.equal(cleanSteps([{ text: "  ", timer: "" }]).error, "비어 있는 단계가 있어요. 내용을 적거나 삭제해 주세요.");
  for (const timer of ["0", "1441", "1.5", "-1", "abc", "1e2"]) {
    assert.equal(cleanSteps([{ text: "섞어요", timer }]).error, "타이머는 1~1440 사이의 분으로 적어 주세요.");
  }
});

test("재료 변경분: 삭제는 빠진 ID만, 기존 수정은 가격·링크를 포함하지 않고 순서를 0부터 부여", () => {
  const original = [{ id: 1, name: "가루", hard: true, pantry: false, position: 0, url: "https://link.coupang.com/a/test", price: 1000 }, { id: 2, name: "설탕", hard: false, pantry: true, position: 1 }];
  const before = structuredClone(original);
  assert.deepEqual(ingredientChanges(original, [{ name: " 우유 ", hard: false, pantry: true }, { ...original[0], name: "쌀가루" }]).value, {
    removed: [2], updated: [{ id: 1, patch: { name: "쌀가루", hard: true, pantry: false, position: 1 } }],
    added: [{ name: "우유", hard: false, pantry: true, position: 0 }],
  });
  assert.deepEqual(original, before);
});

test("재료 검증: 빈 목록·빈 이름·공백을 자른 뒤 같은 이름 거부", () => {
  const item = { name: " 설탕 ", hard: false, pantry: false };
  assert.equal(ingredientChanges([], []).error, "재료를 하나 이상 적어 주세요.");
  assert.equal(ingredientChanges([], [{ ...item, name: " " }]).error, "이름이 비어 있는 재료가 있어요.");
  assert.equal(ingredientChanges([], [item, { ...item, name: "설탕" }]).error, "같은 이름의 재료가 두 번 있어요: 설탕");
});

test("사서 맛보기 정리: 앞뒤 공백 제거·순서 유지·원본 보존·0줄 정상", () => {
  const drafts = [{ place: " 마트 ", desc: " 초콜릿 바 " }, { place: " 편의점 ", desc: " 쿠키 " }];
  const before = structuredClone(drafts);
  assert.deepEqual(cleanConvenience(drafts).value, [{ place: "마트", desc: "초콜릿 바" }, { place: "편의점", desc: "쿠키" }]);
  assert.deepEqual(drafts, before);
  assert.deepEqual(cleanConvenience([]), { value: [] });
  assert.equal(cleanConvenience([{ place: "가".repeat(30), desc: "나".repeat(80) }]).error, undefined);
  assert.equal(cleanConvenience(Array.from({ length: 6 }, (_, i) => ({ place: `마트 ${i}`, desc: "초콜릿" }))).value?.length, 6);
});

test("사서 맛보기 검증: 빈 칸·길이 초과·중복 파는 곳·7줄의 네 가지 안내", () => {
  const item = { place: " 편의점 ", desc: "초콜릿" };
  for (const draft of [{ ...item, place: " " }, { ...item, desc: " " }]) {
    assert.equal(cleanConvenience([draft]).error, "파는 곳과 설명을 모두 적어 주세요. 안 쓰는 줄은 삭제해 주세요.");
  }
  for (const draft of [{ ...item, place: "가".repeat(31) }, { ...item, desc: "나".repeat(81) }]) {
    assert.equal(cleanConvenience([draft]).error, "파는 곳은 30자, 설명은 80자까지 적을 수 있어요.");
  }
  assert.equal(cleanConvenience([item, { ...item, place: "편의점" }]).error, "파는 곳 이름이 겹쳐요. 하나로 합쳐 주세요.");
  assert.equal(cleanConvenience(Array.from({ length: 7 }, (_, i) => ({ ...item, place: `마트 ${i}` }))).error, "사서 맛보기는 6개까지 적을 수 있어요.");
});

test("사서 맛보기 초안: 배열 아님·잘못된 항목 제거, 문자열 항목만 복사", () => {
  for (const value of [null, undefined, "편의점", {}, 1]) assert.deepEqual(convenienceDrafts(value), []);
  const valid = { place: " 편의점 ", desc: " 초콜릿 " };
  assert.deepEqual(convenienceDrafts([null, undefined, "마트", 1, [], {}, { place: "마트" }, { place: 1, desc: "초콜릿" }, { place: "마트", desc: false }, valid, { place: "", desc: "", extra: true }]), [valid, { place: "", desc: "" }]);
  const drafts = convenienceDrafts([valid]);
  drafts[0].place = "마트";
  assert.equal(valid.place, " 편의점 ");
});

test("사진 변경분: 키 변경 때만 히어로 초기화, 빈 설명 거부", () => {
  assert.deepEqual(photoChanges("dubai", "bagel", " 베이글 ").value, { image: "bagel", alt: "베이글", hero_image: null, hero_alt: null });
  assert.deepEqual(photoChanges("dubai", "dubai", "초콜릿").value, { image: "dubai", alt: "초콜릿" });
  assert.equal(photoChanges("dubai", "bagel", " ").error, "사진 설명을 적어 주세요.");
});

test("순서 변경: 원본 유지, 위아래 이동과 경계에서 순서 보존", () => {
  const items = ["가", "나", "다"];
  assert.deepEqual(moveItem(items, 1, -1), ["나", "가", "다"]);
  assert.deepEqual(moveItem(items, 1, 1), ["가", "다", "나"]);
  assert.deepEqual(moveItem(items, 0, -1), items);
  assert.deepEqual(moveItem(items, 2, 1), items);
  assert.deepEqual(items, ["가", "나", "다"]);
});
