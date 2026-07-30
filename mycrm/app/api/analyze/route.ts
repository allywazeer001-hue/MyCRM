import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { BRAND } from "@/lib/core-brand";

export const runtime = "nodejs";

function friendlyApiError(err: any): string {
  const msg: string = err?.message ?? err?.error?.message ?? "Unknown error";
  if (err?.status === 400 && msg.includes("credit balance")) {
    return "AI analysis is not available — the API credit balance is too low. Please top up in Anthropic Plans & Billing.";
  }
  if (err?.status === 401) return "AI analysis is not available — invalid API key.";
  if (err?.status === 429) return "Too many requests — please wait a moment and try again.";
  return msg;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured in .env.local" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { title, type, contextSummary, messages = [], documentBase64, documentMediaType, documentName } = await req.json();

    const anthropic = new Anthropic({ apiKey });

    const system = `You are an expert data analyst embedded in ${BRAND.name}, an enterprise CRM/ERP platform.
Analyze the business data provided and give clear, actionable insights in a professional tone.
Use markdown formatting: ## headings, **bold**, bullet lists where helpful.
Be concise but thorough. When the user asks follow-up questions, reference the original data.
When presenting chart/graph data, use this exact format so it can be rendered as a visual chart:
\`\`\`chart-bar
{"title":"Chart Title","labels":["A","B","C"],"values":[10,20,30]}
\`\`\`
For line charts use \`\`\`chart-line with the same JSON structure.`;

    let allMessages: Anthropic.MessageParam[];

    const initialText = `Analyze the following ${type} data and provide comprehensive business insights.

## ${title}

${contextSummary}

Please structure your response with:
## Key Insights
## Trends & Patterns
## Recommendations`;

    if (messages.length === 0) {
      if (documentBase64 && documentMediaType) {
        const isImage = documentMediaType.startsWith("image/");
        allMessages = [{
          role: "user",
          content: [
            {
              type: isImage ? "image" : "document",
              source: { type: "base64", media_type: documentMediaType, data: documentBase64 },
            } as any,
            { type: "text", text: `${documentName ? `[Document: ${documentName}]\n\n` : ""}${initialText}` },
          ],
        }];
      } else {
        allMessages = [{ role: "user", content: initialText }];
      }
    } else if (documentBase64 && documentMediaType) {
      // Attach document to the last user message
      const idx = [...messages].map((m: any, i: number) => m.role === "user" ? i : -1).filter(i => i >= 0).at(-1) ?? -1;
      if (idx >= 0) {
        const isImage = documentMediaType.startsWith("image/");
        allMessages = (messages as any[]).map((m: any, i: number) => {
          if (i !== idx) return m;
          const text = typeof m.content === "string" ? m.content : "";
          return {
            role: "user",
            content: [
              {
                type: isImage ? "image" : "document",
                source: { type: "base64", media_type: documentMediaType, data: documentBase64 },
              } as any,
              { type: "text", text: `${documentName ? `[Attached: ${documentName}] ` : ""}${text}` },
            ],
          };
        });
      } else {
        allMessages = messages;
      }
    } else {
      allMessages = messages;
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system,
            messages: allMessages,
          });

          stream.on("text", (text) => {
            controller.enqueue(encoder.encode(text));
          });

          stream.on("error", (err: any) => {
            const msg = friendlyApiError(err);
            controller.enqueue(encoder.encode(`\n\n**Error:** ${msg}`));
            controller.close();
          });

          await stream.finalMessage();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`\n\n**Analysis failed:** ${friendlyApiError(err)}`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error("[analyze]", err);
    return new Response(
      JSON.stringify({ error: err.message || "Analysis failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
