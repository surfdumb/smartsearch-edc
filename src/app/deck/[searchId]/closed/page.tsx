/* eslint-disable @next/next/no-img-element */

export const dynamic = 'force-dynamic';

export default function ClosedPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background:
            'radial-gradient(ellipse, rgba(197,165,114,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <img
          src="/logos/smartsearch-white.png"
          alt="SmartSearch"
          style={{ height: '26px', opacity: 0.45, marginBottom: '36px' }}
        />

        <h1
          className="font-cormorant"
          style={{
            fontSize: '1.7rem',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.85)',
            marginBottom: '14px',
            fontStyle: 'italic',
            lineHeight: 1.2,
          }}
        >
          This search has <span style={{ color: 'var(--ss-gold)' }}>closed</span>
        </h1>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6,
            fontWeight: 400,
          }}
        >
          For questions, please contact your SmartSearch consultant.
        </p>
      </div>
    </main>
  );
}
