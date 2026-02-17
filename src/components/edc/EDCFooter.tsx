interface EDCFooterProps {
  search_name: string;
}

export default function EDCFooter({ search_name }: EDCFooterProps) {
  return (
    <footer
      className="px-section-x py-4 flex justify-between items-center rounded-b-card"
      style={{ background: "#faf9f6" }}
    >
      <span className="text-footer text-ss-gray-light">
        {search_name}
      </span>
      <span className="text-footer text-ss-gray-pale">
        SmartSearch Executive Search
      </span>
    </footer>
  );
}
