import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center" style={{ maxWidth: "480px" }}>
        <h1 className="text-2xl font-semibold text-ss-dark mb-2">
          SmartSearch — Executive Decision Cards
        </h1>
        <p className="text-ss-gray mb-8 text-sm">Pepsi Bottling Ventures · Director of Compensation &amp; Benefits</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/deck/pbv-dcb"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Candidate Deck (all 4 candidates)
          </Link>
          <Link
            href="/deck/pbv-dcb/compare"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Comparison View
          </Link>
          <Link
            href="/search/pbv-dcb/edc/katherine-lawson"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Katherine Lawson — EDC
          </Link>
          <Link
            href="/search/pbv-dcb/edc/james-mitchell"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            James Mitchell — EDC
          </Link>
          <Link
            href="/search/pbv-dcb/edc/alicia-perez"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Alicia Perez — EDC
          </Link>
          <Link
            href="/search/pbv-dcb/edc/robert-garcia"
            className="text-ss-gold hover:text-ss-gold-deep underline"
          >
            Robert Garcia — EDC
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
