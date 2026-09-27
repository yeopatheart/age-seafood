"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic-client";

async function downloadAsBase64(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: file, error } = await supabase.storage.from("label-photos").download(storagePath);
  if (error || !file) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

// 라벨 사진에서 도착 터미널명을 "제안"만 한다 — 사람이 확인 탭에서 확인·수정한다.
// knownTerminals를 주면 기존에 쓰던 이름과 표기를 통일하도록 유도한다(예: "남부" 대신 "남부터미널").
export async function suggestTerminalName(storagePath: string, knownTerminals: string[]): Promise<string | null> {
  const base64 = await downloadAsBase64(storagePath);
  if (!base64) return null;

  try {
    const anthropic = getAnthropicClient();
    const knownList = knownTerminals.length > 0 ? knownTerminals.join(", ") : "(없음)";
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 200,
      tools: [
        {
          name: "report_terminal",
          description: "택배박스 라벨 사진에서 읽은 도착 터미널명을 보고한다.",
          input_schema: {
            type: "object",
            properties: {
              terminal_name: {
                type: ["string", "null"],
                description: "라벨에 적힌 도착 터미널명. 찾지 못했거나 확신할 수 없으면 null.",
              },
            },
            required: ["terminal_name"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_terminal" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            {
              type: "text",
              text: `이 사진은 택배박스에 붙은 라벨입니다. 라벨에 적힌 도착 터미널명을 찾아 report_terminal 도구로 보고해주세요. 이미 쓰이고 있는 터미널명 목록: ${knownList}. 이 목록 중 하나와 같은 곳이면 표기를 정확히 그 이름으로 맞춰서 답하세요. 목록에 없는 새 터미널이면 라벨에 적힌 대로 답하세요. 터미널명을 찾지 못했거나 확신할 수 없으면 terminal_name을 null로 보고하세요.`,
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    const input = toolUse.input as { terminal_name: string | null };
    return input.terminal_name?.trim() || null;
  } catch {
    return null;
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
export async function suggestBusInvoiceInfo(storagePath: string, knownTerminals: string[]): Promise<BusInvoiceInfo> {
  const empty: BusInvoiceInfo = { terminalName: null, departureTime: null, boxCount: null };

  const base64 = await downloadAsBase64(storagePath);
  if (!base64) return empty;

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
                description: "송장에 적힌 도착 터미널명. 찾지 못했거나 확신할 수 없으면 null.",
              },
              departure_time: {
                type: ["string", "null"],
                description: "송장에 적힌 버스 출발시간(예: '10:30'). 찾지 못했거나 확신할 수 없으면 null.",
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
              text: `이 사진은 고속버스 화물 송장입니다. report_bus_invoice 도구로 다음을 보고해주세요: (1) 도착 터미널명 — 이미 쓰이고 있는 터미널명 목록(${knownList}) 중 하나와 같은 곳이면 표기를 정확히 그 이름으로 맞춰서 답하세요, (2) 버스 출발시간, (3) 박스(화물) 수량. 손글씨라 알아보기 어렵거나 확신할 수 없는 항목은 해당 값만 null로 보고하세요.`,
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return empty;

    const input = toolUse.input as { terminal_name: string | null; departure_time: string | null; box_count: number | null };
    return {
      terminalName: input.terminal_name?.trim() || null,
      departureTime: input.departure_time?.trim() || null,
      boxCount: typeof input.box_count === "number" ? input.box_count : null,
    };
  } catch {
    // AI 호출이 실패해도 사람이 직접 입력할 수 있어야 하니 화면은 계속 동작해야 한다
    return empty;
  }
}
