import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center" style={{ maxWidth: "480px" }}>
        <h1 className="text-2xl font-semibold text-ss-dark mb-2">
          SmartSearch — Executive Decision Cards
        </h1>
        <p className="text-ss-gray mb-8 text-sm">STADA Head of BD, US Specialty</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/deck/stada-head-bd"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Candidate Deck (all 3 candidates)
          </Link>
          <Link
            href="/search/stada-us-bd/edc/rama-kataria"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Rama Kataria — EDC
          </Link>
          <Link
            href="/search/stada-us-bd/edc/peter-borden"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Peter Borden — EDC
          </Link>
          <Link
            href="/search/stada-us-bd/edc/julien-genovino"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Julien Genovino — EDC
          </Link>
          <Link
            href="/transform"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            EDS → EDC Transformer
          </Link>
        </div>
      </div>
    </main>
  );
}
