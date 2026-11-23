import Link from "next/link";
import { Link2 } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="TextLink home">
          <span className="grid size-7 place-items-center rounded-lg bg-accent text-white">
            <Link2 aria-hidden className="size-4" />
          </span>
          TextLink
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-foreground">
            New text
          </Link>
        </nav>
      </div>
    </header>
  );
}
