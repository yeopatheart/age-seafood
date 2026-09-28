import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
