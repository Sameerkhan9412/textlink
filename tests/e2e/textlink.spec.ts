import { expect, test } from "@playwright/test";

const unique = () => `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

test("home page shows hero, editor and a disabled Generate button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Share text with a simple link." })).toBeVisible();
  await expect(page.getByText("No signup required.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Link" })).toBeDisabled();
  await expect(page.getByRole("link", { name: /log ?in|sign ?up/i })).toHaveCount(0);
});

test("create, share and read a text; a second attempt at the same code is rejected", async ({ page, context }) => {
  const code = unique();
  const text = "Hello, this is my shared message!\n\n   indented <b>not bold</b>";

  await page.goto("/");
  await page.getByLabel("Your text").fill(text);
  await page.getByLabel("Choose your custom link").fill(code.toUpperCase());
  await expect(page.getByText("This link is available.")).toBeVisible();
  await page.getByRole("button", { name: "Generate Link" }).click();
  await expect(page.getByText("Your link is ready")).toBeVisible();

  // A fresh visitor opens the link
  const reader = await context.newPage();
  await reader.goto(`/${code}`);
  await expect(reader.getByTestId("shared-text")).toHaveText(text);
  await expect(reader.locator("b")).toHaveCount(0); // markup is shown as text, never rendered

  // Same code again
  await page.goto("/");
  await page.getByLabel("Your text").fill("another");
  await page.getByLabel("Choose your custom link").fill(code);
  await expect(page.getByText("This link is already taken. Try another code.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Link" })).toBeDisabled();
});

test("reserved and invalid codes are rejected", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Choose your custom link");
  await input.fill("admin");
  await expect(page.getByText("This code is reserved. Try another one.")).toBeVisible();
  await input.fill("-bad-");
  await expect(page.getByText("A code can't start or end with a hyphen.")).toBeVisible();
  await input.fill("ab");
  await expect(page.getByText("Use at least 4 characters.")).toBeVisible();
});

test("unknown code shows the not-found page", async ({ page }) => {
  const res = await page.goto(`/${unique()}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This link doesn't exist." })).toBeVisible();
});

test("API route names are not claimable as share codes", async ({ request }) => {
  const res = await request.post("/api/texts", { data: { content: "x", code: "admin" } });
  expect(res.status()).toBe(400);
});
