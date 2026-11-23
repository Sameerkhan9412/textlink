import { describe, expect, it } from "vitest";
import { generateCode, getCodeProblem, normalizeCode } from "@/lib/code";
import { createTextSchema } from "@/lib/schemas";

describe("normalizeCode", () => {
  it("lowercases and trims", () => {
    expect(normalizeCode("  AbC-12 ")).toBe("abc-12");
  });
});

describe("getCodeProblem", () => {
  it.each([
    ["12344455", null],
    ["my-link-1", null],
    ["a".repeat(40), null],
    ["", "empty"],
    ["abc", "too-short"],
    ["a".repeat(41), "too-long"],
    ["-abcd", "edge-hyphen"],
    ["abcd-", "edge-hyphen"],
    ["ab_cd", "invalid-chars"],
    ["ab cd", "invalid-chars"],
    ["abc/def", "invalid-chars"],
    ["ÄÖÜÄ", "invalid-chars"],
    ["admin", "reserved"],
    ["api", "too-short"],
    ["terms", "reserved"],
  ])("%s -> %s", (code, expected) => {
    expect(getCodeProblem(code)).toBe(expected);
  });
});

describe("generateCode", () => {
  it("produces valid codes", () => {
    for (let i = 0; i < 200; i++) expect(getCodeProblem(generateCode())).toBeNull();
  });
});

describe("createTextSchema", () => {
  it("normalizes the code", () => {
    const r = createTextSchema.parse({ content: "hi", code: "  HELLO-World " });
    expect(r.code).toBe("hello-world");
  });

  it("preserves whitespace and line breaks in content", () => {
    const content = "  line1\n\n    line2\t";
    expect(createTextSchema.parse({ content, code: "abcd" }).content).toBe(content);
  });

  it("rejects blank content", () => {
    expect(createTextSchema.safeParse({ content: " \n\t ", code: "abcd" }).success).toBe(false);
  });

  it("rejects content over 100,000 chars but allows exactly 100,000", () => {
    expect(createTextSchema.safeParse({ content: "a".repeat(100_000), code: "abcd" }).success).toBe(true);
    expect(createTextSchema.safeParse({ content: "a".repeat(100_001), code: "abcd" }).success).toBe(false);
  });

  it("rejects reserved codes and non-string input", () => {
    expect(createTextSchema.safeParse({ content: "x", code: "admin" }).success).toBe(false);
    expect(createTextSchema.safeParse({ content: "x", code: 1234 }).success).toBe(false);
  });
});
