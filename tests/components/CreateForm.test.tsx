// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateForm } from "@/components/CreateForm";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const generateButton = () => screen.getByRole("button", { name: "Generate Link" });
const textbox = () => screen.getByLabelText("Your text");
const codeInput = () => screen.getByLabelText("Choose your custom link");

describe("CreateForm", () => {
  it("shows the heading copy, live counter and keeps Generate disabled when empty", () => {
    render(<CreateForm />);
    expect(generateButton()).toBeDisabled();
    expect(screen.getByTestId("char-count")).toHaveTextContent("0 / 100,000");
  });

  it("updates the character counter and clears text", async () => {
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(textbox(), "hello");
    expect(screen.getByTestId("char-count")).toHaveTextContent("5 / 100,000");
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(textbox()).toHaveValue("");
  });

  it("lowercases the code and flags invalid formats without calling the API", async () => {
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(codeInput(), "AB");
    expect(codeInput()).toHaveValue("ab");
    expect(screen.getByText("Use at least 4 characters.")).toBeInTheDocument();
    await user.clear(codeInput());
    await user.type(codeInput(), "admin");
    expect(screen.getByText("This code is reserved. Try another one.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows availability and enables Generate", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ available: true, valid: true }));
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(textbox(), "some text");
    await user.type(codeInput(), "my-link");
    expect(await screen.findByText("This link is available.")).toBeInTheDocument();
    expect(generateButton()).toBeEnabled();
  });

  it("shows the taken message and keeps Generate disabled", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ available: false, valid: true }));
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(textbox(), "some text");
    await user.type(codeInput(), "taken");
    expect(await screen.findByText("This link is already taken. Try another code.")).toBeInTheDocument();
    expect(generateButton()).toBeDisabled();
  });

  it("debounces availability checks while typing", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ available: true, valid: true }));
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(codeInput(), "typing-fast");
    await screen.findByText("This link is available.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates the link and shows the result", async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).startsWith("/api/availability")
        ? jsonResponse({ available: true, valid: true })
        : jsonResponse({ code: "12344455", url: "https://textlink.com/12344455", path: "/12344455" }, 201),
    );
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(textbox(), "Hello");
    await user.type(codeInput(), "12344455");
    await screen.findByText("This link is available.");
    await user.click(generateButton());
    expect(await screen.findByText("Your link is ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://textlink.com/12344455" })).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(postCall![1].body)).toEqual({ content: "Hello", code: "12344455" });
  });

  it("handles a 409 race at submit time", async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).startsWith("/api/availability")
        ? jsonResponse({ available: true, valid: true })
        : jsonResponse({ error: "This link is already taken. Try another code." }, 409),
    );
    const user = userEvent.setup();
    render(<CreateForm />);
    await user.type(textbox(), "Hello");
    await user.type(codeInput(), "race-lost");
    await screen.findByText("This link is available.");
    await user.click(generateButton());
    await waitFor(() => expect(screen.getByText("This link is already taken. Try another code.")).toBeInTheDocument());
    expect(generateButton()).toBeDisabled();
  });

  it("blocks over-limit text", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ available: true, valid: true }));
    const user = userEvent.setup();
    render(<CreateForm />);
    const big = "a".repeat(100_001);
    await user.click(textbox());
    await user.paste(big);
    await user.type(codeInput(), "big-text");
    await screen.findByText("This link is available.");
    expect(screen.getByText(/Too long/)).toBeInTheDocument();
    expect(generateButton()).toBeDisabled();
  });
});
