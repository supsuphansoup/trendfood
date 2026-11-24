import { existsSync, readdirSync, renameSync } from "node:fs";
import { join, relative, sep } from "node:path";

const output = "out";
let renamed = 0;

// Windows에서 Next.js가 하위 폴더로 내보낸 파일을 브라우저가 요청하는 점 구분 파일명으로 옮긴다.
// https://github.com/vercel/next.js/issues/85374
for (const file of readdirSync(output, { recursive: true, withFileTypes: true })) {
  if (!file.isFile() || !file.name.endsWith(".txt")) continue;
  const parts = relative(output, file.parentPath).split(sep);
  const segmentStart = parts.findIndex((part) => part.startsWith("__next."));
  if (segmentStart === -1) continue;

  const target = join(output, ...parts.slice(0, segmentStart), [...parts.slice(segmentStart), file.name].join("."));
  if (existsSync(target)) continue;

  renameSync(join(file.parentPath, file.name), target);
  renamed++;
}

if (renamed > 0) console.log(`정적 미리 불러오기 파일 경로 보정 ${renamed}개`);
