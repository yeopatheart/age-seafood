import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 압축된 사진을 서버 액션(vision-actions)에 폼데이터로 직접 보낼 때 기본 1MB 제한에
    // 걸리지 않도록 여유를 둔다 — 업로드·AI 호출을 동시에 시작하기 위한 구조라 필요하다.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    // Storage 서명 URL(원본 해상도, 최대 1600px)을 화면 크기에 맞게 다시 인코딩해서
    // 작은 썸네일에서도 원본을 통째로 내려받지 않게 한다.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
