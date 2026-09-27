"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic-client";

async function downloadAsBase64(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: file, error } = await supabase.storage.from("label-photos").download(storagePath);
  if (error || !file) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

// 버스 송장 사진에서 박스(화물) 수량을 "제안"만 한다 — 사람이 확인/수정한 뒤에야 저장된다.
// 손글씨가 흘려 써져 있을 수 있어 100% 신뢰하지 않는다: 실패하거나 확신이 없으면 null을 반환하고,
// 화면에서는 이 값을 그대로 보여주는 게 아니라 "맞는지 확인해달라"는 입력창에 미리 채워 넣는다.
export async function suggestInvoiceBoxCount(storagePath: string): Promise<number | null> {
  const base64 = await downloadAsBase64(storagePath);
  if (!base64) return null;

  try {
    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 200,
      tools: [
        {
          name: "report_box_count",
          description: "사진 속 버스 화물(고속버스 택배) 송장에서 읽은 박스 수량을 보고한다.",
          input_schema: {
            type: "object",
            properties: {
              box_count: {
                type: ["integer", "null"],
                description: "송장에 적힌 박스(화물) 수량 숫자. 숫자를 찾지 못했거나 확신할 수 없으면 null.",
              },
            },
            required: ["box_count"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_box_count" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            {
              type: "text",
              text: "이 사진은 고속버스 화물 송장입니다. 송장에 적힌 박스(화물) 수량 숫자를 찾아 report_box_count 도구로 보고해주세요. 손글씨라 알아보기 어렵거나 숫자를 확신할 수 없으면 box_count를 null로 보고하세요.",
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    const input = toolUse.input as { box_count: number | null };
    return typeof input.box_count === "number" ? input.box_count : null;
  } catch {
    // AI 호출이 실패해도 사람이 직접 입력할 수 있어야 하니 화면은 계속 동작해야 한다
    return null;
  }
}

// 라벨 사진에서 도착 터미널명을 "제안"만 한다 — 사람이 그룹 화면에서 확인·수정한다.
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

export async function confirmInvoiceBoxCount(deliveryId: string, count: number) {
  const supabase = await createClient();

  const { error } = await supabase.from("bus_trips").update({ invoice_box_count: count }).eq("id", deliveryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/deliveries/${deliveryId}`);
  revalidatePath("/deliveries");
  revalidatePath("/history");
}
