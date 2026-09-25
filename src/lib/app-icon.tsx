import { ImageResponse } from "next/og";

// 홈 화면 아이콘·파비콘을 위한 정사각형 아이콘. 모서리는 각 OS가 알아서 둥글게 마스킹하므로
// 여기서는 라운딩 없이 꽉 채운 정사각형으로만 그린다.
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
          background: "#18181b",
          fontSize: size * 0.6,
        }}
      >
        🐟
      </div>
    ),
    { width: size, height: size },
  );
}
