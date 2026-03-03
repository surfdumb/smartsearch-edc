"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import EditableField from "@/components/edc/EditableField";

interface MiscellaneousProps {
  text: string;
  display: 'SHOW' | 'HIDE';
}

export default function Miscellaneous({ text, display }: MiscellaneousProps) {
  if (display !== 'SHOW' || !text || text.trim().length === 0) return null;

  return (
    <section className="px-section-x py-section-y" style={{ borderTop: "1px solid var(--ss-border)" }}>
      <SectionLabel label="Additional Notes" />
      <EditableField
        value={text}
        as="p"
        style={{
          fontSize: "0.78rem",
          fontStyle: "italic",
          color: "var(--ss-gray)",
          lineHeight: 1.6,
        }}
      />
    </section>
  );
}
