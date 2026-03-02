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
          <Link href="/deck/pbv-dcb" className="text-ss-gold hover:text-ss-gold-deep underline">
            Candidate Deck (5 candidates)
          </Link>
          <Link href="/deck/pbv-dcb/compare" className="text-ss-gold hover:text-ss-gold-deep underline">
            Comparison View
          </Link>
          <Link href="/search/pbv-dcb/edc/c-snider" className="text-ss-gold hover:text-ss-gold-deep underline">
            Christopher Snider — EDC
          </Link>
          <Link href="/search/pbv-dcb/edc/n-patel" className="text-ss-gold hover:text-ss-gold-deep underline">
            Nirav Patel — EDC
          </Link>
          <Link href="/search/pbv-dcb/edc/a-wilkinson" className="text-ss-gold hover:text-ss-gold-deep underline">
            Adrian Wilkinson — EDC
          </Link>
          <Link href="/search/pbv-dcb/edc/j-vivas" className="text-ss-gold hover:text-ss-gold-deep underline">
            Julian Vivas Reveron — EDC
          </Link>
          <Link href="/search/pbv-dcb/edc/b-garrison" className="text-ss-gold hover:text-ss-gold-deep underline">
            Benjamin Garrison — EDC
          </Link>
          <Link href="/transform" className="text-ss-gold hover:text-ss-gold-deep underline">
            EDS → EDC Transformer
          </Link>
        </div>
      </div>
    </main>
  );
}
