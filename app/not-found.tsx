import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-16 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">This link doesn&apos;t exist.</h1>
      <p className="mt-3 text-muted">No text has been shared at this address. It might be mistyped, or not created yet.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Create a text
      </Link>
    </section>
  );
}
