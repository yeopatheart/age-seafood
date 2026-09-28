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
    // 사진은 이제 같은 출처의 /api/photos/[...path](src/app/api/photos)를 거쳐 내려오므로
    // 원격 호스트 허용 목록이 필요 없다. 경로가 서명 URL과 달리 절대 바뀌지 않아서 캐시
    // 유효기간을 길게 잡아도 안전하다 — 기본값(60초)이면 재방문할 때마다 다시 축소·인코딩한다.
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
