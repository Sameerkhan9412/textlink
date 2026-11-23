// @vitest-environment node
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let mongod: MongoMemoryServer;
let POST: typeof import("@/app/api/texts/route").POST;
let GET_AVAIL: typeof import("@/app/api/availability/route").GET;
let GET_TEXT: typeof import("@/app/api/texts/[code]/route").GET;
let TextModel: typeof import("@/models/Text").TextModel;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("textlink-test");
  ({ POST } = await import("@/app/api/texts/route"));
  ({ GET: GET_AVAIL } = await import("@/app/api/availability/route"));
  ({ GET: GET_TEXT } = await import("@/app/api/texts/[code]/route"));
  ({ TextModel } = await import("@/models/Text"));
  await mongoose.connect(process.env.MONGODB_URI);
  await TextModel.init(); // make sure the unique index exists
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await TextModel.deleteMany({});
});

let ipCounter = 0;
const post = (body: unknown, raw = false) =>
  POST(
    new NextRequest("http://localhost/api/texts", {
      method: "POST",
      body: raw ? (body as string) : JSON.stringify(body),
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ipCounter}` },
    }),
  );

const avail = (code: string) =>
  GET_AVAIL(new NextRequest(`http://localhost/api/availability?code=${encodeURIComponent(code)}`, { headers: { "x-forwarded-for": `10.1.0.${++ipCounter}` } }));

describe("POST /api/texts", () => {
  it("creates a text and returns its link", async () => {
    const res = await post({ content: "Hello, this is my shared message!", code: "12344455" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ code: "12344455", path: "/12344455", url: "http://localhost/12344455" });
    expect((await TextModel.findOne({ code: "12344455" }))?.content).toBe("Hello, this is my shared message!");
  });

  it("stores the normalized (lowercase) code", async () => {
    const res = await post({ content: "x", code: "MiXeD-Case" });
    expect((await res.json()).code).toBe("mixed-case");
  });

  it("returns 409 for an existing code, in any letter case", async () => {
    expect((await post({ content: "first", code: "taken-code" })).status).toBe(201);
    const dup = await post({ content: "second", code: "TAKEN-code" });
    expect(dup.status).toBe(409);
    expect((await dup.json()).error).toBe("This link is already taken. Try another code.");
    expect((await TextModel.findOne({ code: "taken-code" }))?.content).toBe("first");
  });

  it("lets exactly one of many concurrent requests win a code", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => post({ content: `c${i}`, code: "race-code" })));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(11);
    expect(await TextModel.countDocuments({ code: "race-code" })).toBe(1);
  });

  it.each([
    [{ content: "", code: "abcd" }],
    [{ content: "   ", code: "abcd" }],
    [{ content: "x", code: "abc" }],
    [{ content: "x", code: "admin" }],
    [{ content: "x", code: "-abcd" }],
    [{ content: "x", code: "ab cd" }],
    [{ content: "a".repeat(100_001), code: "abcd" }],
    [{ code: "abcd" }],
    [{ content: { $ne: null }, code: "abcd" }],
    [{ content: "x", code: { $ne: "" } }],
  ])("rejects invalid payload %#", async (payload) => {
    expect((await post(payload)).status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    expect((await post("{not json", true)).status).toBe(400);
  });

  it("preserves content byte for byte, including markup", async () => {
    const content = "  <script>alert(1)</script>\n\n\t  end ";
    await post({ content, code: "markup-test" });
    expect((await TextModel.findOne({ code: "markup-test" }))?.content).toBe(content);
  });

  it("rate limits a single client", async () => {
    const make = () =>
      POST(new NextRequest("http://localhost/api/texts", { method: "POST", body: "{}", headers: { "x-forwarded-for": "9.9.9.9" } }));
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) statuses.push((await make()).status);
    expect(statuses).toContain(429);
  });
});

describe("GET /api/availability", () => {
  it("reports available and taken", async () => {
    expect(await (await avail("free-code")).json()).toMatchObject({ available: true, valid: true });
    await post({ content: "x", code: "free-code" });
    expect(await (await avail("FREE-code")).json()).toMatchObject({ available: false, valid: true });
  });

  it("reports invalid and reserved codes as unavailable", async () => {
    expect(await (await avail("admin")).json()).toMatchObject({ available: false, valid: false });
    expect(await (await avail("a")).json()).toMatchObject({ available: false, valid: false });
  });
});

describe("GET /api/texts/[code]", () => {
  const get = (code: string) =>
    GET_TEXT(new NextRequest(`http://localhost/api/texts/${code}`, { headers: { "x-forwarded-for": `10.2.0.${++ipCounter}` } }), {
      params: Promise.resolve({ code }),
    } as never);

  it("returns stored text", async () => {
    await post({ content: "hello", code: "read-me" });
    const res = await get("read-me");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ code: "read-me", content: "hello" });
  });

  it("404s for unknown or invalid codes", async () => {
    expect((await get("nothing-here")).status).toBe(404);
    expect((await get("..%2F..")).status).toBe(404);
  });
});
