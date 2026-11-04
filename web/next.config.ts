import type { NextConfig } from "next";

// 정적 사이트로 내보낸다 (out/ 폴더 → Cloudflare Pages). 서버 기능(Proxy·Server Actions·쿠키)은 쓰지 않는다.
const nextConfig: NextConfig = {
  output: "export",
  // 정적 내보내기는 기본 이미지 최적화 서버가 없다. 사진은 빌드에 포함된 원본을 그대로 쓴다.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
