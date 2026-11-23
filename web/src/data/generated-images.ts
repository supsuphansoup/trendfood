import images from "./content/generated-images.json" with { type: "json" };
import type { PhotoCredit } from "./photo-credits.ts";

export type GeneratedImage = {
  slug: string;
  title: string;
  tool: "OpenAI image_gen" | "OpenAI Images API";
  generatedAt: string;
  prompt: string;
  note: string;
  automatic?: true;
  model?: "gpt-image-2";
  reference?: PhotoCredit;
  confidence?: number;
};

// 생성 이미지는 실사 사진의 작가·출처·CC 라이선스와 구분한다.
export const generatedImages: Record<string, GeneratedImage> = images as Record<string, GeneratedImage>;
