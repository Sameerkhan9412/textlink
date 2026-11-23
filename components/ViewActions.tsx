"use client";

import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "./CopyButton";

export function ViewActions({ code, content }: { code: string; content: string }) {
  function download() {
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton value={content} label="Copy text" />
      <CopyButton value={() => window.location.href} label="Copy link" />
      <button type="button" onClick={download} className="btn btn-secondary">
        <Download aria-hidden className="size-4" /> Download
      </button>
      <Link href="/" className="btn btn-primary">
        <Plus aria-hidden className="size-4" /> New text
      </Link>
    </div>
  );
}
