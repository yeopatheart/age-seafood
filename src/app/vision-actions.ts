"use server";

import sharp from "sharp";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { splitTrailingNumber } from "@/lib/company-name";

// 클라이언트가 이미 AI 인식용으로 축소해서 보내므로(capture-screen.tsx), 여기서는 그 값을
// 다시 깎지 않도록 Claude 표준 모델의 실질 해상도 한계(장변 약 1568px, 그 이상은 인식 품질에
// 도움이 안 되고 토큰만 늘어난다)를 안전망 상한으로만 둔다 — 클라이언트 압축이 실패해서 원본이
// 그대로 왔을 때만 실제로 줄이는 역할을 한다.
const VISION_MAX_DIMENSION = 1568;

// 예전에는 스토리지에 업로드가 끝난 뒤 그 파일을 다시 내려받아서 AI에 보냈다 — 업로드 한 번,
// 다운로드 한 번, 그리고 그 다음에야 AI 호출이 시작되는 완전 순차 구조라 리드타임이 길었다.
// 지금은 브라우저가 압축까지 마친 사진 바이트를 폼데이터로 바로 받아서, 스토리지 업로드와
// AI 호출을 동시에(Promise.all) 시작할 수 있게 한다 — 왕복 한 번을 통째로 없앤 것.
async function bufferFromFormData(formData: FormData): Promise<Buffer | null> {
  const file = formData.get("image");
  if (!(file instanceof Blob)) return null;
  return Buffer.from(await file.arrayBuffer());
}

function knownTerminalsFromFormData(formData: FormData): string[] {
  const raw = formData.get("knownTerminals");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function knownCompanyNamesFromFormData(formData: FormData): string[] {
  const raw = formData.get("knownCompanyNames");
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

async function resizeForVision(buffer: Buffer): Promise<string> {
  try {
    const resized = await sharp(buffer)
      .resize({ width: VISION_MAX_DIMENSION, height: VISION_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return resized.toString("base64");
  } catch {
    // 리사이즈가 실패해도 원본 그대로 보내서 인식 자체는 계속 시도한다
    return buffer.toString("base64");
  }
}

// OCR이 "서울 남부"처럼 지역명을 붙여 읽어도, 이미 쓰이는 "남부터미널" 같은 이름과 같은 곳이면
// 그 표기로 통일한다 — 프롬프트로도 유도하지만, 모델이 놓쳐도 여기서 한 번 더 보정한다.
// "터미널"은 이 도메인에서 유일하게 쓰이는 공통 접미사라 이것만 떼고 핵심 지명끼리 비교한다.
function normalizeTerminalName(raw: string, knownTerminals: string[]): string {
  const cleaned = raw.replace(/\s+/g, "");
  for (const known of knownTerminals) {
    const knownCore = known.replace(/\s+/g, "").replace(/터미널$/, "");
    if (!knownCore) continue;
    if (cleaned.includes(knownCore) || knownCore.includes(cleaned)) {
      return known;
    }
  }
  return raw;
}

// 두 문자열이 몇 글자나 다른지(편집 거리) 계산한다 — 손글씨 한두 글자를 다르게 읽어도
// 같은 사람으로 볼 수 있는지 판단하는 데 쓴다.
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// 같은 담당자가 계속 같은 손글씨체로 쓰기 때문에, 이미 등록된 고객명 목록과 한두 글자만
// 다르면 같은 사람으로 보고 표기를 통일한다(터미널명 정규화와 같은 발상). 이름이 짧을수록
// 오독 한 글자의 비중이 크므로 엄격하게, 길수록 조금 더 관대하게 허용한다.
function normalizeCompanyName(raw: string, knownCompanyNames: string[]): string {
  const { base, suffix } = splitTrailingNumber(raw);
  if (!base) return raw;

  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  for (const known of knownCompanyNames) {
    const distance = levenshtein(base, known);
    const threshold = base.length <= 2 ? 0 : base.length <= 4 ? 1 : 2;
    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = known;
    }
  }
  return (bestMatch ?? base) + suffix;
}

export type LabelPhotoInfo = {
  terminalName: string | null;
  companyName: string | null;
};

// 라벨 사진에서 도착 터미널명과 고객명(업체명)을 "제안"만 한다 — 사람이 확인 탭에서 확인·
// 수정한다. knownTerminals를 주면 기존에 쓰던 이름과 표기를 통일하도록 유도한다(예: "남부"
// 대신 "남부터미널"). formData는 { image: Blob, knownTerminals: JSON string } — 스토리지
// 경로가 아니라 브라우저가 이미 압축해둔 사진 바이트를 직접 받아서, 업로드와 이 호출을
// 동시에 시작할 수 있게 한다.
export async function suggestLabelInfo(formData: FormData): Promise<LabelPhotoInfo> {
  const empty: LabelPhotoInfo = { terminalName: null, companyName: null };

  const buffer = await bufferFromFormData(formData);
  if (!buffer) return empty;
  const knownTerminals = knownTerminalsFromFormData(formData);
  const knownCompanyNames = knownCompanyNamesFromFormData(formData);
  const base64 = await resizeForVision(buffer);

  try {
    const anthropic = getAnthropicClient();
    const knownList = knownTerminals.length > 0 ? knownTerminals.join(", ") : "(없음)";
    const knownCompanyList = knownCompanyNames.length > 0 ? knownCompanyNames.join(", ") : "(없음)";
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 250,
      tools: [
        {
          name: "report_label_info",
          description: "택배박스 라벨 사진에서 읽은 도착 터미널명과 고객명(업체명)을 보고한다.",
          input_schema: {
            type: "object",
            properties: {
              terminal_name: {
                type: ["string", "null"],
                description: "라벨에 적힌 도착 터미널명. 찾지 못했거나 확신할 수 없으면 null.",
              },
              company_name: {
                type: ["string", "null"],
                description:
                  "라벨의 '고객명' 항목에 손글씨로 적힌 수령인 이름(그 아래 숫자가 있으면 이어붙인 값). '고객명' 항목 자체가 사진에 없을 때만 null — 글씨가 흐릿해도 가장 근접한 추측을 적는다.",
              },
            },
            required: ["terminal_name", "company_name"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_label_info" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            {
              type: "text",
              text: `이 사진은 택배박스에 붙은 라벨입니다. report_label_info 도구로 다음을 보고해주세요.

(1) 도착 터미널명 — 이미 쓰이고 있는 터미널명 목록: ${knownList}. 라벨에 "서울 남부"처럼 지역명이 함께 적혀 있어도, 그 안에 목록에 있는 이름이 포함되어 있으면(예: "서울 남부"는 "남부"와 같은 곳) 목록의 표기 그대로 답하세요. 목록에 없는 새 터미널이면 라벨에 적힌 대로 답하세요.

(2) 고객명 — 보통 "배송지역"과 "연락처" 사이, "고객명"이라고 인쇄된 항목 옆에 손글씨로 적혀 있습니다. 라벨 하단에 도장이나 인쇄로 찍힌 발송업체 상호(예: "OO수산")는 고객명이 아니니 혼동하지 마세요. 고객명 바로 아래나 옆에 동그라미 친 숫자 등 별도의 숫자가 적혀 있으면, 그 숫자도 고객명 뒤에 띄어쓰기로 붙여서 함께 보고하세요(예: "홍길동 2").

이미 등록된 고객명 목록(같은 담당자가 항상 비슷한 글씨체로 쓰므로 참고하세요): ${knownCompanyList}. 손글씨가 이 목록의 이름 중 하나와 한두 글자만 다르게 보이면(자음·모음을 헷갈려 다르게 읽을 수 있는 정도) 그 목록의 이름으로 답하세요. 목록에 없는 새 이름이면 라벨에 적힌 대로 답하세요.

고객명은 항상 최선을 다해 읽어서 보고하세요 — 손글씨가 흐릿하거나 흘려 써서 완전히 확신이 서지 않아도, 가장 비슷하게 보이는 글자로 추측해서 답하세요. 빈 값보다 오차가 있는 값이 낫습니다. "고객명" 항목 자체가 라벨에 아예 없을 때만 null로 보고하세요.

두 항목은 서로 독립적으로 판단하세요 — 하나를 알아보기 어렵다고 해서 나머지까지 null로 보고하지 마세요.`,
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return empty;

    const input = toolUse.input as { terminal_name: string | null; company_name: string | null };
    const name = input.terminal_name?.trim();
    const companyName = input.company_name?.trim();
    return {
      terminalName: name ? normalizeTerminalName(name, knownTerminals) : null,
      companyName: companyName ? normalizeCompanyName(companyName, knownCompanyNames) : null,
    };
  } catch {
    return empty;
  }
}

export type BusInvoiceInfo = {
  terminalName: string | null;
  departureTime: string | null;
  boxCount: number | null;
};

// 버스 송장 사진 한 장에서 터미널명·출발시간·박스 수량을 한 번의 비전 호출로 모두 읽어
// "제안"한다 — 사람이 확인 탭에서 확인·수정한다. 손글씨라 항목별로 따로 실패할 수 있어
// 각 필드를 독립적으로 null 허용한다(하나를 못 읽어도 나머지는 쓸 수 있게).
export async function suggestBusInvoiceInfo(formData: FormData): Promise<BusInvoiceInfo> {
  const empty: BusInvoiceInfo = { terminalName: null, departureTime: null, boxCount: null };

  const buffer = await bufferFromFormData(formData);
  if (!buffer) return empty;
  const knownTerminals = knownTerminalsFromFormData(formData);
  const base64 = await resizeForVision(buffer);

  try {
    const anthropic = getAnthropicClient();
    const knownList = knownTerminals.length > 0 ? knownTerminals.join(", ") : "(없음)";
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      tools: [
        {
          name: "report_bus_invoice",
          description: "고속버스 화물 송장 사진에서 읽은 도착 터미널명·출발시간·박스 수량을 보고한다.",
          input_schema: {
            type: "object",
            properties: {
              terminal_name: {
                type: ["string", "null"],
                description: "송장에 적힌 도착 터미널명(행선지). 찾지 못했거나 확신할 수 없으면 null.",
              },
              departure_time: {
                type: ["string", "null"],
                description: "송장에 적힌 버스 출발시간, HH:MM 형태(예: '10:30'). 찾지 못했거나 확신할 수 없으면 null.",
              },
              box_count: {
                type: ["integer", "null"],
                description: "송장에 적힌 박스(화물) 수량 숫자. 찾지 못했거나 확신할 수 없으면 null.",
              },
            },
            required: ["terminal_name", "departure_time", "box_count"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_bus_invoice" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            {
              type: "text",
              text: `이 사진은 고속버스 화물 송장입니다. 손글씨가 매우 흘려 쓰여 있을 수 있으니 꼼꼼히 살펴서 report_bus_invoice 도구로 다음을 보고해주세요.

(1) 행선지(도착 터미널명) — 이미 쓰이고 있는 터미널명 목록: ${knownList}. "서울 남부"처럼 지역명이 함께 적혀 있어도, 그 안에 목록에 있는 이름이 포함되어 있으면(예: "서울 남부"는 "남부"와 같은 곳) 목록의 표기 그대로 답하세요. 목록에 없는 새 터미널이면 송장에 적힌 대로 답하세요.

(2) 출발시간 — "9시 00분"처럼 시:분으로 적혀 있습니다. 분 단위 숫자는 흘려 써서 두 자리가 하나로 뭉치거나 고리 모양으로 이어져 보일 수 있는데, 고속버스 출발시간은 정시(00분) 또는 30분 단위인 경우가 대부분이니 이를 참고해서 가장 그럴듯한 값을 HH:MM 형태로 답하세요.

(3) 박스(화물) 수량.

각 항목은 서로 독립적으로 판단하세요 — 하나를 알아보기 어렵거나 확신할 수 없다고 해서 나머지까지 null로 보고하지 마세요.`,
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return empty;

    const input = toolUse.input as { terminal_name: string | null; departure_time: string | null; box_count: number | null };
    const name = input.terminal_name?.trim();
    return {
      terminalName: name ? normalizeTerminalName(name, knownTerminals) : null,
      departureTime: input.departure_time?.trim() || null,
      boxCount: typeof input.box_count === "number" ? input.box_count : null,
    };
  } catch {
    // AI 호출이 실패해도 사람이 직접 입력할 수 있어야 하니 화면은 계속 동작해야 한다
    return empty;
  }
}
