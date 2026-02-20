"use client";

interface TransformButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export default function TransformButton({ onClick, loading, disabled }: TransformButtonProps) {
  return (
    <div className="flex justify-center mt-8 mb-8">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        style={{
          background: disabled
            ? "rgba(197, 165, 114, 0.3)"
            : "linear-gradient(135deg, var(--ss-gold) 0%, var(--ss-gold-deep) 100%)",
          color: disabled ? "rgba(26,26,26,0.5)" : "#1a1a1a",
          fontWeight: 700,
          fontSize: "0.9rem",
          letterSpacing: "1px",
          textTransform: "uppercase",
          borderRadius: "12px",
          padding: "14px 40px",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseOver={(e) => {
          if (!disabled && !loading) {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 30px rgba(197, 165, 114, 0.3)";
          }
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                border: "2px solid rgba(26,26,26,0.2)",
                borderTopColor: "#1a1a1a",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Transforming...
          </span>
        ) : (
          <>✦ Generate EDC</>
        )}
      </button>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
