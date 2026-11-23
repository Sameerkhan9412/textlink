"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Dices, Eraser, Loader2, Plus, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import {
  CODE_MAX,
  CODE_MIN,
  CODE_PROBLEM_MESSAGES,
  TEXT_MAX,
  generateCode,
  getCodeProblem,
  normalizeCode,
} from "@/lib/code";
import { CopyButton } from "./CopyButton";

type Availability = "available" | "taken" | "error";
type Created = { code: string; url: string };

const subscribe = () => () => {};
const useHost = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.host,
    () => process.env.NEXT_PUBLIC_SITE_HOST ?? "textlink.com",
  );

export function CreateForm() {
  const textId = useId();
  const codeId = useId();
  const host = useHost();

  const [content, setContent] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ code: string; status: Availability } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const problem = getCodeProblem(code);
  // Format problems are known instantly; only well-formed codes hit the server.
  const checkable = code.length > 0 && problem === null;
  const availability: "idle" | "invalid" | "checking" | Availability =
    code.length === 0 ? "idle" : problem ? "invalid" : result?.code === code ? result.status : "checking";

  useEffect(() => {
    if (!checkable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/availability?code=${encodeURIComponent(code)}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error("check failed");
        setResult({ code, status: data.available ? "available" : data.valid === false ? "error" : "taken" });
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResult({ code, status: "error" });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [code, checkable]);

  const overLimit = content.length > TEXT_MAX;
  // If the availability check itself failed, still allow submit: the server re-verifies uniqueness.
  const canSubmit =
    content.trim().length > 0 && !overLimit && (availability === "available" || availability === "error") && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setCreated({ code: data.code, url: data.url });
      } else if (res.status === 409) {
        setResult({ code, status: "taken" });
      } else {
        setFormError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setContent("");
    setCode("");
    setResult(null);
    setCreated(null);
    setFormError(null);
  }

  if (created) {
    return (
      <section aria-labelledby="done-title" className="card p-6 sm:p-8">
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 aria-hidden className="size-6" />
          <h2 id="done-title" className="text-xl font-semibold text-foreground">
            Your link is ready
          </h2>
        </div>
        <div className="mt-5 rounded-xl border border-line bg-background p-3">
          <a
            href={created.url}
            className="block truncate font-mono text-sm text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {created.url}
          </a>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CopyButton value={created.url} label="Copy link" />
          <Link href={`/${created.code}`} className="btn btn-primary">
            Open text <ArrowRight aria-hidden className="size-4" />
          </Link>
          <button type="button" onClick={reset} className="btn btn-secondary">
            <Plus aria-hidden className="size-4" /> Create another
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-4 sm:p-6" noValidate>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor={textId} className="text-sm font-medium">
            Your text
          </label>
          <button
            type="button"
            onClick={() => setContent("")}
            disabled={content.length === 0}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Eraser aria-hidden className="size-4" /> Clear
          </button>
        </div>
        <textarea
          id={textId}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="Write or paste your text here…"
          aria-describedby={`${textId}-count`}
          aria-invalid={overLimit}
          className="field min-h-64 w-full resize-y p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap"
        />
        <div id={`${textId}-count`} className="mt-1.5 flex justify-between text-xs">
          <span className={overLimit ? "text-danger" : "text-muted"} role={overLimit ? "alert" : undefined}>
            {overLimit
              ? `Too long — remove ${(content.length - TEXT_MAX).toLocaleString("en-US")} characters.`
              : "Line breaks and spacing are preserved."}
          </span>
          <span className={overLimit ? "font-medium text-danger" : "text-muted"} data-testid="char-count">
            {content.length.toLocaleString("en-US")} / {TEXT_MAX.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor={codeId} className="mb-2 block text-sm font-medium">
          Choose your custom link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="field flex min-w-0 flex-1 items-center overflow-hidden focus-within:ring-2 focus-within:ring-accent/40">
            <span className="pl-3 text-sm whitespace-nowrap text-muted select-none">{host}/</span>
            <input
              id={codeId}
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              maxLength={CODE_MAX + 10}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="12344455"
              aria-describedby={`${codeId}-status`}
              aria-invalid={availability === "invalid" || availability === "taken"}
              className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 pl-0.5 font-mono text-sm outline-none"
            />
          </div>
          <button type="button" onClick={() => setCode(generateCode())} className="btn btn-secondary shrink-0">
            <Dices aria-hidden className="size-4" /> Random
          </button>
        </div>
        <p id={`${codeId}-status`} className="mt-1.5 min-h-5 text-sm" aria-live="polite">
          <Status availability={availability} problem={problem} />
        </p>
        <p className="mt-1 text-xs text-muted">
          {CODE_MIN}–{CODE_MAX} characters: lowercase letters, numbers and hyphens.
        </p>
      </div>

      {formError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" /> {formError}
        </p>
      )}

      <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full py-3 text-base">
        {submitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {submitting ? "Generating…" : "Generate Link"}
      </button>
    </form>
  );
}

function Status({ availability, problem }: { availability: string; problem: ReturnType<typeof getCodeProblem> }) {
  switch (availability) {
    case "checking":
      return (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Loader2 aria-hidden className="size-4 animate-spin" /> Checking availability…
        </span>
      );
    case "available":
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 aria-hidden className="size-4" /> This link is available.
        </span>
      );
    case "taken":
      return (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <XCircle aria-hidden className="size-4" /> This link is already taken. Try another code.
        </span>
      );
    case "invalid":
      return (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <AlertCircle aria-hidden className="size-4" /> {problem ? CODE_PROBLEM_MESSAGES[problem] : null}
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-600">
          <AlertCircle aria-hidden className="size-4" /> Couldn&apos;t check availability. We&apos;ll verify when you
          generate.
        </span>
      );
    default:
      return null;
  }
}
