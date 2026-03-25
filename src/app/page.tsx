import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#1a1a1a" }}
    >
      <div
        className="flex flex-col items-center text-center"
        style={{ maxWidth: "480px", padding: "0 24px" }}
      >
        {/* Logo */}
        <Image
          src="/Logos_SmartSearch_Primary_White.png"
          alt="SmartSearch"
          width={220}
          height={60}
          style={{ objectFit: "contain", marginBottom: "48px" }}
          priority
        />

        {/* Title */}
        <h1
          className="font-cormorant"
          style={{
            fontSize: "1.6rem",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#faf8f5",
            letterSpacing: "0.08em",
            marginBottom: "16px",
          }}
        >
          Executive Decision Cards
        </h1>

        {/* Tagline */}
        <p
          className="font-outfit"
          style={{
            fontSize: "0.95rem",
            fontWeight: 300,
            color: "#a0a0a0",
            maxWidth: "360px",
            lineHeight: 1.6,
            marginBottom: "56px",
          }}
        >
          Structured candidate intelligence, designed for decision-makers.
        </p>

        {/* Demo Button */}
        <Link
          href="/deck/demo-coo"
          className="font-outfit gateway-demo-btn"
          style={{ marginBottom: "80px" }}
        >
          View Demo
        </Link>

        {/* Bottom line */}
        <div className="flex flex-col items-center">
          <div
            style={{
              width: "60px",
              height: "1px",
              background: "rgba(197,165,114,0.2)",
              marginBottom: "16px",
            }}
          />
          <span
            className="font-outfit"
            style={{
              fontSize: "0.7rem",
              fontWeight: 300,
              color: "#6b6b6b",
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
            }}
          >
            SmartSearch Executive Recruitment
          </span>
        </div>
      </div>

      <style>{`
        .gateway-demo-btn {
          display: inline-block;
          background: transparent;
          border: 1px solid #c5a572;
          color: #c5a572;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 14px 48px;
          border-radius: 2px;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        .gateway-demo-btn:hover {
          background: #c5a572;
          color: #1a1a1a;
        }
      `}</style>
    </main>
  );
}
