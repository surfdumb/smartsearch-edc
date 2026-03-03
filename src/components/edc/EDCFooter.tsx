interface EDCFooterProps {
  search_name: string;
  generated_date: string;
}

export default function EDCFooter({ search_name, generated_date }: EDCFooterProps) {
  return (
    <footer
      className="flex justify-between items-center rounded-b-card"
      style={{
        padding: "10px 48px",
        background: "#faf9f6",
        borderTop: "1px solid #f0ede8",
      }}
    >
      <span
        style={{
          fontSize: "0.74rem",
          color: "var(--ss-gray-light)",
          letterSpacing: "0.3px",
        }}
      >
        {search_name} &middot; Generated {generated_date}
      </span>
      <span
        className="uppercase"
        style={{
          fontSize: "0.7rem",
          color: "var(--ss-gray-pale)",
          letterSpacing: "1px",
        }}
      >
        Confidential
      </span>
    </footer>
  );
}
