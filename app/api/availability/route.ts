import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { codeSchema } from "@/lib/schemas";
import { TextModel } from "@/models/Text";
import { apiError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`avail:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return apiError(429, "Too many requests. Please slow down.", undefined, { "Retry-After": String(rl.retryAfter) });

  const parsed = codeSchema.safeParse(req.nextUrl.searchParams.get("code") ?? "");
  if (!parsed.success) {
    return json({ available: false, valid: false, reason: parsed.error.issues[0]?.message ?? "Invalid code." });
  }

  try {
    await connectDB();
    const exists = await TextModel.exists({ code: parsed.data });
    return json({ available: !exists, valid: true, code: parsed.data });
  } catch (err) {
    console.error("availability check failed", err);
    return apiError(500, "Could not check availability. Please try again.");
  }
}
