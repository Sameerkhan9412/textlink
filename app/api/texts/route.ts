import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { createTextSchema } from "@/lib/schemas";
import { TextModel } from "@/models/Text";
import { apiError, isDuplicateKeyError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Content is capped at 100k chars; allow headroom for JSON escaping.
const MAX_BODY_BYTES = 1_000_000;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`create:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return apiError(429, "Too many requests. Please wait a moment.", undefined, { "Retry-After": String(rl.retryAfter) });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return apiError(413, "Request is too large.");

  let raw: unknown;
  try {
    const bodyText = await req.text();
    if (bodyText.length > MAX_BODY_BYTES) return apiError(413, "Request is too large.");
    raw = JSON.parse(bodyText);
  } catch {
    return apiError(400, "Request body must be valid JSON.");
  }

  const parsed = createTextSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
    return apiError(400, parsed.error.issues[0]?.message ?? "Invalid request.", { fields });
  }

  const { code, content } = parsed.data;
  try {
    await connectDB();
    // The unique index decides the winner if two requests race for one code.
    await TextModel.create({ code, content });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return apiError(409, "This link is already taken. Try another code.", { fields: { code: "This link is already taken. Try another code." } });
    }
    console.error("create text failed", err);
    return apiError(500, "Something went wrong. Please try again.");
  }

  return json({ code, path: `/${code}`, url: `${req.nextUrl.origin}/${code}` }, 201);
}
