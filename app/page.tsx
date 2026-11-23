import { CreateForm } from "@/components/CreateForm";

export default function Home() {
  return (
    <>
      <section className="mb-8 text-center sm:mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">Share text with a simple link.</h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-pretty text-muted sm:text-lg">
          Write or paste your text, choose a unique URL, and share it instantly. No signup required.
        </p>
      </section>
      <CreateForm />
    </>
  );
}
