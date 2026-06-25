import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

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
    const { title, type, contextSummary, messages = [] } = await req.json();

    // Create client per-request so it always picks up the current env var
    const anthropic = new Anthropic({ apiKey });

    const system = `You are an expert data analyst embedded in Cloudbox, an enterprise CRM/ERP platform.
Analyze the business data provided and give clear, actionable insights in a professional tone.
Use markdown formatting: ## headings, **bold**, bullet lists where helpful.
Be concise but thorough. When the user asks follow-up questions, reference the original data.`;

    const allMessages: Anthropic.MessageParam[] =
      messages.length === 0
        ? [
            {
              role: "user",
              content: `Analyze the following ${type} data and provide comprehensive business insights.

## ${title}

${contextSummary}

Please structure your response with:
## Key Insights
## Trends & Patterns
## Recommendations`,
            },
          ]
        : messages;

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

          // Event-based streaming — more reliable than for-await in Next.js
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
