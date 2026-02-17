interface AlignmentDotProps {
  alignment: 'strong' | 'partial' | 'gap' | 'not_assessed';
}

const dotStyles: Record<string, { bg: string; shadow: string }> = {
  strong: {
    bg: "var(--ss-green)",
    shadow: "0 0 0 3px var(--ss-green-light)",
  },
  partial: {
    bg: "var(--ss-yellow)",
    shadow: "0 0 0 3px var(--ss-yellow-light)",
  },
  gap: {
    bg: "var(--ss-red)",
    shadow: "0 0 0 3px var(--ss-red-light)",
  },
  not_assessed: {
    bg: "var(--ss-gray-pale)",
    shadow: "0 0 0 3px rgba(212, 210, 206, 0.15)",
  },
};

export default function AlignmentDot({ alignment }: AlignmentDotProps) {
  const style = dotStyles[alignment];
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: "9px",
        height: "9px",
        background: style.bg,
        boxShadow: style.shadow,
      }}
    />
  );
}
