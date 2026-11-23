import { NextResponse } from "next/server";

export function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function apiError(status: number, message: string, extra?: Record<string, unknown>, headers?: Record<string, string>) {
  return json({ error: message, ...extra }, status, headers);
}

export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
