import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ViewActions } from "@/components/ViewActions";
import { connectDB } from "@/lib/db";
import { codeSchema } from "@/lib/schemas";
import { TextModel } from "@/models/Text";

// Always read fresh data; shared texts are looked up per request.
export const dynamic = "force-dynamic";

async function getText(rawCode: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawCode);
  } catch {
    return null; // malformed percent-encoding
  }
  const parsed = codeSchema.safeParse(decoded);
  if (!parsed.success) return null;
  await connectDB();
  return TextModel.findOne({ code: parsed.data }).select("code content createdAt").lean();
}

export async function generateMetadata({ params }: PageProps<"/[code]">): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `/${code}`,
    // Shared text is user content: keep it out of search indexes.
    robots: { index: false, follow: false },
  };
}

export default async function SharedTextPage({ params }: PageProps<"/[code]">) {
  const { code } = await params;
  const doc = await getText(code);
  if (!doc) notFound();

  const created = new Date(doc.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

  return (
    <article className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-xl font-semibold">/{doc.code}</h1>
          <p className="text-sm text-muted">
            {doc.content.length.toLocaleString("en-US")} characters · shared {created} UTC
          </p>
        </div>
        <ViewActions code={doc.code} content={doc.content} />
      </div>
      {/* React escapes the text, so shared content can never run as HTML or script. */}
      <pre
        data-testid="shared-text"
        className="card overflow-x-auto p-4 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap sm:p-6"
      >
        {doc.content}
      </pre>
    </article>
  );
}
