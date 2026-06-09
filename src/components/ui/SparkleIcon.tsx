import React from "react";

interface SparkleIconProps {
  size?: number;
  /** Gentle in-progress beat (reuses the global `ourTakeShimmer` keyframe). */
  pulse?: boolean;
  style?: React.CSSProperties;
}

/**
 * AI "regenerate" sparkle. Hand-rolled inline SVG — the repo ships no icon
 * library. Deliberately NOT a circular arrow: that glyph (↻) reads as the
 * MotivationStrip motivation-hook cycler and gets confused with it.
 */
export default function SparkleIcon({ size = 14, pulse = false, style }: SparkleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        ...(pulse ? { animation: "ourTakeShimmer 1.4s ease-in-out infinite" } : null),
        ...style,
      }}
    >
      {/* main 4-point sparkle */}
      <path d="M10 2 L12 8 L18 10 L12 12 L10 18 L8 12 L2 10 L8 8 Z" />
      {/* small accent sparkle */}
      <path d="M18.5 14.5 L19.6 17.4 L22.5 18.5 L19.6 19.6 L18.5 22.5 L17.4 19.6 L14.5 18.5 L17.4 17.4 Z" />
    </svg>
  );
}
