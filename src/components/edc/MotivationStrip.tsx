interface MotivationStripProps {
  why_interested: {
    type: 'pull' | 'push';
    headline: string;
    detail: string;
  }[];
}

export default function MotivationStrip({ why_interested }: MotivationStripProps) {
  // Take the first pull headline, or first headline of any type
  const pullItem = why_interested.find(item => item.type === 'pull');
  const headline = pullItem?.headline || why_interested[0]?.headline;

  if (!headline) return null;

  return (
    <div
      style={{
        background: "var(--ss-header-bg)",
        padding: "6px 32px 14px",
        flexShrink: 0,
      }}
    >
      <p
        className="font-cormorant"
        style={{
          fontSize: "17px",
          fontStyle: "italic",
          fontWeight: 400,
          color: "rgba(250,248,245,0.75)",
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        &ldquo;{headline}&rdquo;
      </p>
    </div>
  );
}
