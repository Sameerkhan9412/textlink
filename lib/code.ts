export const CODE_MIN = 4;
export const CODE_MAX = 40;
export const TEXT_MAX = 100_000;

/** Top-level paths that must never be claimed as share codes. */
export const RESERVED_CODES: ReadonlySet<string> = new Set([
  "api",
  "admin",
  "about",
  "app",
  "assets",
  "blog",
  "contact",
  "create",
  "dashboard",
  "docs",
  "edit",
  "faq",
  "favicon",
  "health",
  "help",
  "home",
  "index",
  "login",
  "logout",
  "new",
  "next",
  "not-found",
  "privacy",
  "public",
  "raw",
  "register",
  "robots",
  "settings",
  "signin",
  "signup",
  "sitemap",
  "static",
  "status",
  "support",
  "terms",
  "textlink",
  "www",
]);

export type CodeProblem =
  | "empty"
  | "too-short"
  | "too-long"
  | "invalid-chars"
  | "edge-hyphen"
  | "reserved";

/** Lowercase and trim. Does not otherwise alter the input. */
export function normalizeCode(input: string): string {
  return input.trim().toLowerCase();
}

/** Returns the first problem with a (normalized) code, or null when valid. */
export function getCodeProblem(code: string): CodeProblem | null {
  if (code.length === 0) return "empty";
  if (!/^[a-z0-9-]+$/.test(code)) return "invalid-chars";
  if (code.startsWith("-") || code.endsWith("-")) return "edge-hyphen";
  if (code.length < CODE_MIN) return "too-short";
  if (code.length > CODE_MAX) return "too-long";
  if (RESERVED_CODES.has(code)) return "reserved";
  return null;
}

export const CODE_PROBLEM_MESSAGES: Record<CodeProblem, string> = {
  empty: "Enter a code for your link.",
  "too-short": `Use at least ${CODE_MIN} characters.`,
  "too-long": `Use at most ${CODE_MAX} characters.`,
  "invalid-chars": "Use only lowercase letters, numbers and hyphens.",
  "edge-hyphen": "A code can't start or end with a hyphen.",
  reserved: "This code is reserved. Try another one.",
};

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Random, human-friendly suggestion (no ambiguous characters). */
export function generateCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
