import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

// Storage 버킷이 비공개라서 지금까지는 화면을 열 때마다 사진마다 서명 URL(매번 값이 다른 토큰
// 포함)을 새로 발급했다. URL이 매번 바뀌면 브라우저도, next/image 최적화도 "전에 본 사진"인 걸
// 몰라서 매번 원본을 새로 내려받고 다시 인코딩한다 — 확인·이력 탭을 다시 열 때마다 느려지는
// 원인이었다. 이 경로는 로그인한 사용자에게만 같은 사진을 항상 같은 주소로 내려주므로, 한 번
// 받은 사진은 브라우저가 계속 재사용할 수 있다. 사진은 경로별로 한 번 올라가면 내용이 바뀌지
// 않으므로(교체 시 새 경로로 다시 올라감) 영구 캐시가 안전하다.
//
// next/image의 자체 최적화(/_next/image)는 쓰지 않는다 — 그 내부 요청은 로그인 쿠키 없이
// 이 경로를 다시 호출해서, 인증 실패로 깨진 이미지가 떴다(확인 탭 썸네일 버그). 대신 여기서
// 직접 ?w= 파라미터로 리사이즈해서 내려주고, 브라우저가 쿠키를 실어 직접 요청하게 한다.
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const storagePath = path.join("/");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return new Response("로그인이 필요합니다.", { status: 401 });
  }

  const { data, error } = await supabase.storage.from("label-photos").download(storagePath);
  if (error || !data) {
    return new Response("사진을 찾을 수 없습니다.", { status: 404 });
  }

  const width = Number(new URL(request.url).searchParams.get("w"));
  if (Number.isFinite(width) && width > 0) {
    try {
      const resized = await sharp(Buffer.from(await data.arrayBuffer()))
        .resize({ width: Math.round(width), withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      return new Response(resized, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    } catch {
      // 리사이즈가 실패해도 원본은 내려준다
    }
  }

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
