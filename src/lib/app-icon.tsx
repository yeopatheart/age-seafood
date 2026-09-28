import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";

// 실제 로고(public/logo-navy.png, 원형·투명 배경)를 정사각형 캔버스 위에 올린다. 로고의
// 원 바깥 여백은 투명이라, 배경을 로고와 같은 남색으로 채우면 이음새 없이 꽉 찬 정사각형
// 아이콘처럼 보인다 — 모서리를 각 OS가 알아서 둥글게 마스킹하므로 여기서 직접 둥글릴 필요는 없다.
const NAVY = "#10223d";
const logoBase64 = readFileSync(join(process.cwd(), "public", "logo-navy.png")).toString("base64");

export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: NAVY,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori 렌더링용, next/image 대상이 아님 */}
        <img src={`data:image/png;base64,${logoBase64}`} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
