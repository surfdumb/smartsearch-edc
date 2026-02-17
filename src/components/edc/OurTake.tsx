"use client";

import SectionLabel from "@/components/ui/SectionLabel";
import EditableField from "@/components/edc/EditableField";

interface OurTakeProps {
  text: string;
}

export default function OurTake({ text }: OurTakeProps) {
  return (
    <section className="px-section-x py-section-y">
      <SectionLabel label="Our Take" />

      <div
        className="rounded-lg p-5"
        style={{
          border: "2px solid var(--ss-green)",
          background: "rgba(74, 124, 89, 0.03)",
        }}
      >
        <EditableField
          value={text}
          as="p"
          className="text-body text-ss-gray"
          style={{ lineHeight: 1.75 }}
        />
      </div>
    </section>
  );
}
