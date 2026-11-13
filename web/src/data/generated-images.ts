import images from "./content/generated-images.json" with { type: "json" };

export type GeneratedImage = {
  slug: string;
  title: string;
  tool: "OpenAI image_gen";
  generatedAt: string;
  prompt: string;
  note: string;
};

// 생성 이미지는 실사 사진의 작가·출처·CC 라이선스와 구분한다.
export const generatedImages: Record<string, GeneratedImage> = images as Record<string, GeneratedImage>;
