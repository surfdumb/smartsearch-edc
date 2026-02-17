import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ss-dark mb-4">
          SmartSearch — Executive Decision Cards
        </h1>
        <p className="text-ss-gray mb-8">v1.0 Scaffold</p>
        <Link
          href="/search/prenax-cto/edc/david-norton"
          className="text-ss-gold hover:text-ss-gold-deep underline"
        >
          View David Norton EDC (test fixture)
        </Link>
      </div>
    </main>
  );
}
