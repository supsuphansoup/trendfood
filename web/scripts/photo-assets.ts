/** 사진 등록부와 정적 import 목록을 같은 키로 유지한다. */
export function photoModule(keys: string[]): string {
  if (keys.some((key) => !/^photo-[a-z0-9-]+$/.test(key))) throw new Error("잘못된 사진 키");
  return `${keys.map((key, index) => `import photo${index} from "@/assets/curated/${key}.webp";`).join("\n")}\n\nexport const curatedPhotos = {\n${keys.map((key, index) => `  "${key}": photo${index},`).join("\n")}\n};\n`;
}
