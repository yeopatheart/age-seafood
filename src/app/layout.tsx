import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "통영아재수산",
  description: "통영 수산물 배송 촬영·검수",
  icons: { apple: "/icons/apple-touch" },
  // 홈 화면에 추가했을 때 브라우저 주소창 없이 앱처럼 보이게 한다 (iOS). title이 곧 iOS가
  // 홈 화면 아이콘 밑에 보여주는 이름이다 — manifest의 name/short_name과 별개로 이걸 본다.
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "통영아재수산" },
  // 구버전 iOS는 표준 mobile-web-app-capable 대신 이 태그를 본다 — 둘 다 넣어 호환성을 넓힌다
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#10223d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // data-font-size는 beforeInteractive 스크립트가 hydration 전에 붙인다 — 의도된 서버/클라이언트 불일치
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="apply-font-size"
          strategy="beforeInteractive"
          // 글자 크기 설정을 하이드레이션 전에 적용해 깜빡임을 줄인다 (localStorage는 개인정보 보호 모드 등에서 막힐 수 있어 try/catch)
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=localStorage.getItem('age-seafood-font-size');if(s)document.documentElement.setAttribute('data-font-size',s);}catch(e){}",
          }}
        />
        <NavBar />
        <div className="flex-1 bg-zinc-100 pb-28">{children}</div>
      </body>
    </html>
  );
}
