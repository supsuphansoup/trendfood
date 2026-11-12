// LLM 호출. 공급자는 환경변수로 바꾼다 (코드에 모델 이름을 박지 않는다).
//   AI_PROVIDER=openai  + OPENAI_API_KEY + AI_MODEL   (이번 달: ChatGPT Pro 의 API 크레딧)
//   AI_PROVIDER=gemini  + GEMINI_API_KEY + AI_MODEL   (그 뒤: Gemini 무료 등급)
// 입력은 공개 영상 제목·검색량과 자동 검증에 쓰는 공개 설명란이다.

export class AiQuotaError extends Error {}

export function aiConfig() {
  const provider = process.env.AI_PROVIDER || "openai";
  const model = process.env.AI_MODEL ?? "";
  if (provider !== "openai" && provider !== "gemini") throw new Error(`AI_PROVIDER 는 openai 또는 gemini: ${provider}`);
  const key = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  if (!key || !model) return null;
  return { provider, model, key } as const;
}

/** JSON 하나를 돌려받는다. schema 는 JSON Schema (OpenAI 는 strict, Gemini 는 응답 형식 안내) */
export async function askJson(
  prompt: string,
  schema: Record<string, unknown>,
  comparison?: { model: string; maxOutputTokens: number },
  images: { mimeType: "image/webp"; data: string }[] = [],
): Promise<unknown> {
  const cfg = aiConfig();
  if (!cfg) throw new Error("AI 설정이 없어요 (AI_PROVIDER·AI_MODEL·API 키)");
  if (comparison && cfg.provider !== "openai") throw new Error("모델 비교는 OpenAI 설정에서만 실행할 수 있어요.");

  if (cfg.provider === "openai") {
    const model = comparison?.model ?? cfg.model;
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: images.length ? [{ role: "user", content: [
          { type: "input_text", text: prompt },
          ...images.map((image) => ({ type: "input_image", image_url: `data:${image.mimeType};base64,${image.data}`, detail: "high" })),
        ] }] : prompt,
        max_output_tokens: comparison?.maxOutputTokens,
        text: { format: { type: "json_schema", name: "result", schema, strict: true } },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
      output?: { type: string; content?: { type: string; text?: string }[] }[];
      usage?: {
        input_tokens: number;
        input_tokens_details?: { cached_tokens?: number };
        output_tokens: number;
      };
    };
    if (res.status === 429) throw new AiQuotaError(`OpenAI 한도·크레딧 소진: ${body.error?.code ?? body.error?.message ?? 429}`);
    if (!res.ok) throw new Error(`OpenAI 오류 ${res.status}: ${body.error?.message ?? ""}`);
    const usage = body.usage;
    console.log("[openai-usage]", JSON.stringify({
      model,
      tokens: usage ? {
        input: usage.input_tokens,
        cachedInput: usage.input_tokens_details?.cached_tokens ?? 0,
        output: usage.output_tokens,
      } : null,
    }));
    const text = body.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text;
    if (comparison && !text) throw new Error(`모델 비교 응답이 비어 있어요: ${model}`);
    return JSON.parse(text ?? "{}");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": cfg.key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: `${prompt}\n\n다음 JSON Schema 형식으로만 답하세요:\n${JSON.stringify(schema)}` },
          ...images.map((image) => ({ inline_data: { mime_type: image.mimeType, data: image.data } })),
        ] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (res.status === 429) throw new AiQuotaError(`Gemini 무료 한도 초과: ${body.error?.status ?? 429}`);
  if (!res.ok) throw new Error(`Gemini 오류 ${res.status}: ${body.error?.message ?? ""}`);
  return JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
}

const categories = ["디저트", "밥", "면", "분식", "간식"];

export const extractSchema = {
  type: "object",
  additionalProperties: false,
  required: ["foods"],
  properties: {
    foods: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category", "mentions"],
        properties: {
          name: { type: "string", description: "구체적인 음식 이름 (예: 두바이 쫀득쿠키)" },
          category: { type: "string", enum: categories },
          mentions: { type: "integer", description: "이 음식을 언급한 제목 수" },
        },
      },
    },
  },
};

export function extractPrompt(titles: string[]): string {
  return [
    "아래는 최근 한국 유튜브 인기 음식 영상 제목입니다.",
    "지금 유행하는 '구체적인 음식·메뉴 이름'만 뽑으세요. 규칙:",
    "- 브랜드·가게 이름, 사람 이름, '먹방'·'레시피' 같은 일반어는 빼세요.",
    "- 같은 음식의 다른 표기는 하나로 합치세요.",
    "- 줄임말과 풀네임은 풀네임 하나로만 쓰세요. 예: 두쫀쿠와 두바이 쫀득쿠키 → 두바이 쫀득쿠키.",
    "- 같은 영상에서 구체적인 음식명과 그 일반 분류가 함께 나와도 구체적인 음식명만 넣으세요. 서로 다른 맛이나 재료의 메뉴는 구분하세요.",
    "- 집에서 만들 수 있는 음식 위주로, 최대 20개.",
    "- 제목에 없는 음식을 지어내지 마세요.",
    "",
    ...titles.map((t, i) => `${i + 1}. ${t}`),
  ].join("\n");
}

export const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["slug", "why", "summary", "tags", "cookMinutes", "difficulty", "servings", "ingredients", "steps", "tip"],
  properties: {
    slug: { type: "string", description: "영문 소문자·숫자·하이픈 주소 (예: dubai-chewy-cookie)" },
    why: { type: "string", description: "한 줄 설명, 80자 이내" },
    summary: { type: "string", description: "왜 뜨는지 3~4문장, 주어진 수치만 근거로" },
    tags: { type: "array", items: { type: "string", enum: ["10분컷", "자취생", "디저트", "안주"] } },
    cookMinutes: { type: "integer" },
    difficulty: { type: "string", enum: ["쉬움", "보통", "어려움"] },
    servings: { type: "string", description: "예: 2인분" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "amount", "hard", "pantry"],
        properties: {
          name: { type: "string", description: "쿠팡에서 검색할 수 있는 재료 이름" },
          amount: { type: "string", description: "레시피 사용량 (예: 200g, 2큰술). 구매 포장 용량과 구분" },
          hard: { type: "boolean", description: "구하기 어려운 핵심 재료" },
          pantry: { type: "boolean", description: "설탕·소금처럼 집에 흔한 재료" },
        },
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "timerMinutes"],
        properties: {
          text: { type: "string" },
          timerMinutes: { type: "integer", description: "기다리는 단계면 분, 아니면 0" },
        },
      },
    },
    tip: { type: "string" },
  },
};

export function draftPrompt(name: string, multiplier: number, titles: string[]): string {
  return [
    `음식 '${name}'의 소개 글 초안을 한국어로 써 주세요. 운영자가 검수한 뒤 게시합니다.`,
    `근거 수치: 네이버 검색량이 최근 3일 동안 평소의 ${multiplier}배.`,
    "영상 개수·조회수·구독자 수 같은 YouTube 수치는 글에 쓰지 마세요.",
    "summary 에는 위 수치와 아래 제목에서 알 수 있는 사실만 쓰고, 출처 없는 숫자·유행 원인을 지어내지 마세요.",
    "조리법은 일반적인 가정용 레시피로 6단계 이내, 재료는 12개 이내로 쓰세요.",
    "조리 시간에는 굳히기·휴지·식힘을 포함하세요. 재료명과 사용량(amount)은 구분하세요. 제목만으로 확인할 수 없는 조리법·분량은 가정용 제안입니다.",
    "",
    "관련 영상 제목:",
    ...titles.slice(0, 10).map((t) => `- ${t}`),
  ].join("\n");
}
