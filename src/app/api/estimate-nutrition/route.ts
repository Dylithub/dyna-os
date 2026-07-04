import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthedUserId } from "@/lib/api-auth";
import type { NutritionEstimate } from "@/lib/types";

// Strict JSON schema for structured outputs — guarantees parseable responses
const NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    calories: {
      type: "integer",
      description: "Total estimated calories for the whole meal (kcal)",
    },
    protein: {
      type: "integer",
      description: "Total estimated protein for the whole meal (grams)",
    },
    items: {
      type: "array",
      description: "Per-item breakdown of the meal",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          calories: { type: "integer" },
          protein: { type: "integer" },
        },
        required: ["name", "calories", "protein"],
        additionalProperties: false,
      },
    },
  },
  required: ["calories", "protein", "items"],
  additionalProperties: false,
};

const SYSTEM_PROMPT =
  "You are a nutrition estimator. Given a meal description, estimate total calories (kcal) and protein (grams), with a per-item breakdown. Assume typical portion sizes when quantities are unspecified. Round all numbers to whole values. If the description is not food, return zeros with a single item named 'Not recognized as food'.";

function sanitizeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

// POST /api/estimate-nutrition — estimate kcal/protein from a meal description
export async function POST(req: NextRequest) {
  // Auth first: this endpoint spends API credits and must not be public
  const { error } = await getAuthedUserId();
  if (error) return error;

  let description: string;
  try {
    const body = await req.json();
    description = typeof body?.description === "string" ? body.description.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "Describe a meal first" }, { status: 400 });
  }
  if (description.length > 2000) {
    return NextResponse.json({ error: "Description too long (max 2000 chars)" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Estimator not configured — set ANTHROPIC_API_KEY" },
      { status: 503 }
    );
  }

  const client = new Anthropic();

  let msg: Anthropic.Message;
  try {
    msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
      output_config: {
        format: { type: "json_schema", schema: NUTRITION_SCHEMA },
      },
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Estimator busy — try again in a moment" },
        { status: 429 }
      );
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Estimator not configured — invalid API key" },
        { status: 503 }
      );
    }
    console.error("estimate-nutrition API error:", e);
    return NextResponse.json(
      { error: "Estimation failed — try again" },
      { status: 502 }
    );
  }

  if (msg.stop_reason === "max_tokens") {
    return NextResponse.json(
      { error: "Could not estimate — try a shorter description" },
      { status: 502 }
    );
  }

  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json(
      { error: "Could not estimate — try rephrasing" },
      { status: 502 }
    );
  }

  // Structured outputs guarantee schema-valid JSON; parse defensively anyway
  let parsed: { calories?: unknown; protein?: unknown; items?: unknown };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    const match = textBlock.text.match(/\{[\s\S]*\}/);
    try {
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = {};
    }
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items.map((item) => ({
        name: typeof item?.name === "string" ? item.name : "Item",
        calories: sanitizeNumber(item?.calories),
        protein: sanitizeNumber(item?.protein),
      }))
    : [];

  const estimate: NutritionEstimate = {
    calories: sanitizeNumber(parsed.calories),
    protein: sanitizeNumber(parsed.protein),
    items,
  };

  if (estimate.calories === 0 && estimate.protein === 0 && items.length === 0) {
    return NextResponse.json(
      { error: "Could not estimate — try rephrasing" },
      { status: 502 }
    );
  }

  return NextResponse.json(estimate);
}
