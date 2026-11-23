import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { codeSchema } from "@/lib/schemas";
import { TextModel } from "@/models/Text";
import { apiError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/texts/[code]">) {
  const rl = rateLimit(`read:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return apiError(429, "Too many requests.", undefined, { "Retry-After": String(rl.retryAfter) });

  const { code: rawCode } = await ctx.params;
  const parsed = codeSchema.safeParse(rawCode);
  if (!parsed.success) return apiError(404, "Text not found.");

  try {
    await connectDB();
    const doc = await TextModel.findOne({ code: parsed.data }).select("code content createdAt").lean();
    if (!doc) return apiError(404, "Text not found.");
    return json({ code: doc.code, content: doc.content, createdAt: doc.createdAt });
  } catch (err) {
    console.error("read text failed", err);
    return apiError(500, "Something went wrong. Please try again.");
  }
}
