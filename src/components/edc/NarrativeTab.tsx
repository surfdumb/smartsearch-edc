'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useEditorContext } from '@/contexts/EditorContext';
import '@/styles/narrative-tab.css';

const READ_FROM_NARRATIVE_TABLE = true;
const ENABLE_NARRATIVE_EDITING = true;

export type NarrativeKeyCriterion = {
  name: string;
  rating: 'Strong' | 'Very Good' | 'Good' | 'Limited' | 'Weak' | 'Not Covered' | string;
  rationale: string;
  evidence_prose: string;
};

export type NarrativeScopeMatch = {
  scope: string;
  alignment: 'strong' | 'partial' | 'weak' | 'not_assessed' | string;
  alignment_rationale: string;
};

export type NarrativeScoreBreakdown = {
  name: string;
  rating: string;
  contribution: number;
};

export type NarrativeData = {
  candidate_overview?: string;
  experience_context?: string;
  career_highlights?: string;
  development_areas?: string;
  cultural_fit_indicators?: string;
  significant_concerns?: string;
  key_concern?: string;
  key_strength?: string;
  role_alignment?: string;
  questions_candidate_asked?: string;
  execflow_ai_assessment?: string;
  match_score_percentage?: number | null;
  key_criteria_detailed?: NarrativeKeyCriterion[];
  scope_match_detailed?: NarrativeScopeMatch[];
  match_score_breakdown?: NarrativeScoreBreakdown[];
};

export type OurTakeNarrative = { text?: string } | null;

export type NarrativeTabProps = {
  candidateId: string;
  candidateName: string;
  narrative?: NarrativeData | null;
  ourTakeNarrative?: OurTakeNarrative;
  ourTakeSource?: string | null;
  edcData?: { narrative?: Record<string, unknown> | null };
};

type ServerSnapshot = {
  narrative: NarrativeData | null;
  ourTake: OurTakeNarrative;
  source: string | null;
  editedFields: string[];
};

function pickFromProps(props: NarrativeTabProps): ServerSnapshot {
  if (props.narrative) {
    return {
      narrative: props.narrative,
      ourTake: props.ourTakeNarrative ?? null,
      source: props.ourTakeSource ?? null,
      editedFields: [],
    };
  }
  const fromEdcData = props.edcData?.narrative ?? null;
  if (!fromEdcData) return { narrative: null, ourTake: null, source: null, editedFields: [] };
  const { our_take_narrative, our_take_source, ...rest } = fromEdcData as Record<string, unknown> & {
    our_take_narrative?: OurTakeNarrative;
    our_take_source?: string;
  };
  return {
    narrative: rest as NarrativeData,
    ourTake: (our_take_narrative ?? null) as OurTakeNarrative,
    source: (our_take_source ?? null) as string | null,
    editedFields: [],
  };
}

function ratingColorClass(rating?: string): string {
  if (!rating) return 'rating-neutral';
  const r = rating.toLowerCase();
  if (r.includes('strong') || r === 'very good') return 'rating-strong';
  if (r === 'good') return 'rating-good';
  if (r.includes('limited') || r.includes('partial')) return 'rating-partial';
  if (r.includes('weak') || r.includes('not covered')) return 'rating-weak';
  return 'rating-neutral';
}

function alignmentColorClass(alignment?: string): string {
  if (!alignment) return 'alignment-neutral';
  const a = alignment.toLowerCase();
  if (a === 'strong') return 'alignment-strong';
  if (a === 'partial') return 'alignment-partial';
  if (a === 'weak') return 'alignment-weak';
  return 'alignment-neutral';
}

export function NarrativeTab(props: NarrativeTabProps) {
  const { isEditable } = useEditorContext();
  const propSnapshot = useMemo(() => pickFromProps(props), [props]);
  const [serverData, setServerData] = useState<ServerSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(READ_FROM_NARRATIVE_TABLE);

  const refetch = useCallback(async () => {
    if (!READ_FROM_NARRATIVE_TABLE) return;
    try {
      const r = await fetch(`/api/narrative/${props.candidateId}`);
      if (!r.ok) {
        setServerData(null);
        return;
      }
      const d = await r.json();
      setServerData({
        narrative: d.narrative ?? null,
        ourTake: d.our_take_narrative ?? null,
        source: d.our_take_source ?? null,
        editedFields: d.narrative_manually_edited_fields ?? [],
      });
    } catch {
      setServerData(null);
    } finally {
      setLoading(false);
    }
  }, [props.candidateId]);

  useEffect(() => {
    if (!READ_FROM_NARRATIVE_TABLE) return;
    setLoading(true);
    void refetch();
  }, [refetch]);

  const saveField = useCallback(
    async (fieldPath: string, value: unknown) => {
      if (!ENABLE_NARRATIVE_EDITING) return;
      try {
        const r = await fetch(`/api/narrative/${props.candidateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field_path: fieldPath, value }),
        });
        if (r.ok) {
          const d = await r.json();
          setServerData((prev) =>
            prev
              ? { ...prev, editedFields: d.narrative_manually_edited_fields ?? prev.editedFields }
              : prev
          );
        }
      } catch {
        // Network failure — leave UI as-is; next refetch will reconcile
      }
    },
    [props.candidateId]
  );

  const resetField = useCallback(
    async (fieldPath: string) => {
      if (!ENABLE_NARRATIVE_EDITING) return;
      try {
        await fetch(
          `/api/narrative/${props.candidateId}?field_path=${encodeURIComponent(fieldPath)}`,
          { method: 'DELETE' }
        );
        await refetch();
      } catch {
        // best-effort
      }
    },
    [props.candidateId, refetch]
  );

  if (!isEditable) return null;

  const snapshot: ServerSnapshot =
    READ_FROM_NARRATIVE_TABLE && serverData
      ? {
          narrative: serverData.narrative ?? propSnapshot.narrative,
          ourTake: serverData.ourTake ?? propSnapshot.ourTake,
          source: serverData.source ?? propSnapshot.source,
          editedFields: serverData.editedFields,
        }
      : propSnapshot;

  const { narrative, ourTake, source, editedFields } = snapshot;
  const isEdited = (fieldPath: string) => editedFields.includes(fieldPath);

  if (loading && !serverData && !propSnapshot.narrative) {
    return <div className="narrative-empty"><p>Loading narrative…</p></div>;
  }

  if (!narrative || Object.keys(narrative).length === 0) {
    return (
      <div className="narrative-empty">
        <h3>Narrative not yet generated</h3>
        <p>
          The V2 Engine produces the narrative view when an interview is processed through
          the new pipeline. This candidate either predates V2 or is awaiting the first
          interview fire.
        </p>
      </div>
    );
  }

  const matchPct =
    typeof narrative.match_score_percentage === 'number' ? narrative.match_score_percentage : null;

  return (
    <div className="narrative-tab" data-candidate-id={props.candidateId}>
      <NarrativeHeader candidateName={props.candidateName} matchPct={matchPct} />

      <ProseSection
        title="Candidate Overview"
        fieldPath="candidate_overview"
        text={narrative.candidate_overview}
        edited={isEdited('candidate_overview')}
        onSave={saveField}
        onReset={resetField}
      />

      <ProseSection
        title="Experience Context"
        fieldPath="experience_context"
        text={narrative.experience_context}
        edited={isEdited('experience_context')}
        onSave={saveField}
        onReset={resetField}
      />

      <Section title="Key Criteria — Detailed">
        <KeyCriteriaDetailedList items={narrative.key_criteria_detailed} />
      </Section>

      <Section title="Match Score Breakdown">
        <ScoreBreakdownTable items={narrative.match_score_breakdown} total={matchPct} />
      </Section>

      <Section title="Scope Match — Detailed">
        <ScopeMatchList items={narrative.scope_match_detailed} />
      </Section>

      <SplitSection>
        <ProseSection
          title="Career Highlights"
          fieldPath="career_highlights"
          text={narrative.career_highlights}
          edited={isEdited('career_highlights')}
          onSave={saveField}
          onReset={resetField}
          renderer="bullets"
        />
        <ProseSection
          title="Development Areas"
          fieldPath="development_areas"
          text={narrative.development_areas}
          edited={isEdited('development_areas')}
          onSave={saveField}
          onReset={resetField}
        />
      </SplitSection>

      <ProseSection
        title="Cultural Fit Indicators"
        fieldPath="cultural_fit_indicators"
        text={narrative.cultural_fit_indicators}
        edited={isEdited('cultural_fit_indicators')}
        onSave={saveField}
        onReset={resetField}
      />

      <ProseSection
        title="Significant Concerns"
        fieldPath="significant_concerns"
        text={narrative.significant_concerns}
        edited={isEdited('significant_concerns')}
        onSave={saveField}
        onReset={resetField}
        tone="alert"
      />

      <SplitSection>
        <ProseSection
          title="Key Strength"
          fieldPath="key_strength"
          text={narrative.key_strength}
          edited={isEdited('key_strength')}
          onSave={saveField}
          onReset={resetField}
          tone="positive"
        />
        <ProseSection
          title="Key Concern"
          fieldPath="key_concern"
          text={narrative.key_concern}
          edited={isEdited('key_concern')}
          onSave={saveField}
          onReset={resetField}
          tone="alert"
        />
      </SplitSection>

      <ProseSection
        title="Role Alignment"
        fieldPath="role_alignment"
        text={narrative.role_alignment}
        edited={isEdited('role_alignment')}
        onSave={saveField}
        onReset={resetField}
      />

      <OurTakeNarrativeSection
        ourTake={ourTake}
        source={source}
        edited={isEdited('our_take_narrative')}
        onSave={(text) => saveField('our_take_narrative', { text })}
        onReset={() => resetField('our_take_narrative')}
      />

      <ProseSection
        title="Questions the Candidate Asked"
        fieldPath="questions_candidate_asked"
        text={narrative.questions_candidate_asked}
        edited={isEdited('questions_candidate_asked')}
        onSave={saveField}
        onReset={resetField}
        renderer="bullets"
      />

      <ProseSection
        title="ExecFlow AI Assessment"
        fieldPath="execflow_ai_assessment"
        text={narrative.execflow_ai_assessment}
        edited={isEdited('execflow_ai_assessment')}
        onSave={saveField}
        onReset={resetField}
        tone="muted"
      />

      <NarrativeFooter />
    </div>
  );
}

function NarrativeHeader({
  candidateName,
  matchPct,
}: {
  candidateName: string;
  matchPct: number | null;
}) {
  return (
    <header className="narrative-header">
      <div className="narrative-header-left">
        <span className="narrative-eyebrow">Internal Narrative</span>
        <h2>{candidateName}</h2>
      </div>
      {matchPct !== null && (
        <div className="narrative-match-score">
          <span className="narrative-match-score-num">{matchPct}</span>
          <span className="narrative-match-score-pct">%</span>
          <span className="narrative-match-score-label">Match</span>
        </div>
      )}
    </header>
  );
}

function Section({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'default' | 'alert' | 'positive' | 'muted';
}) {
  return (
    <section className={`narrative-section narrative-section--${tone}`}>
      <h3 className="narrative-section-title">{title}</h3>
      <div className="narrative-section-body">{children}</div>
    </section>
  );
}

function SplitSection({ children }: { children: React.ReactNode }) {
  return <div className="narrative-split">{children}</div>;
}

function ProseSection({
  title,
  fieldPath,
  text,
  edited,
  onSave,
  onReset,
  tone = 'default',
  renderer = 'prose',
}: {
  title: string;
  fieldPath: string;
  text?: string | null;
  edited: boolean;
  onSave: (fieldPath: string, value: string) => void | Promise<void>;
  onReset: (fieldPath: string) => void | Promise<void>;
  tone?: 'default' | 'alert' | 'positive' | 'muted';
  renderer?: 'prose' | 'bullets';
}) {
  return (
    <section className={`narrative-section narrative-section--${tone}`}>
      <div className="narrative-section-head">
        <h3 className="narrative-section-title">{title}</h3>
        {ENABLE_NARRATIVE_EDITING && edited && (
          <div className="narrative-edit-meta">
            <span className="narrative-edited-pill">edited</span>
            <button
              type="button"
              className="narrative-reset-btn"
              onClick={() => onReset(fieldPath)}
              aria-label={`Reset ${title}`}
              title="Reset to engine output"
            >
              ×
            </button>
          </div>
        )}
      </div>
      <div className="narrative-section-body">
        {ENABLE_NARRATIVE_EDITING ? (
          <EditableProse
            fieldPath={fieldPath}
            text={text}
            onSave={onSave}
            renderer={renderer}
          />
        ) : renderer === 'bullets' ? (
          <NarrativeMarkdownBullets text={text} />
        ) : (
          <NarrativeProse text={text} />
        )}
      </div>
    </section>
  );
}

function NarrativeProse({ text }: { text?: string | null }) {
  if (!text || text.trim().length === 0) {
    return <p className="narrative-empty-field">Not assessed.</p>;
  }
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length <= 1) {
    return <p className="narrative-prose">{text}</p>;
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="narrative-prose">
          {p}
        </p>
      ))}
    </>
  );
}

function NarrativeMarkdownBullets({ text }: { text?: string | null }) {
  if (!text || text.trim().length === 0) {
    return <p className="narrative-empty-field">None captured.</p>;
  }
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const bullets = lines.map((l) => l.replace(/^[-*•]\s*/, '').trim()).filter((l) => l.length > 0);
  if (bullets.length === 0) {
    return <p className="narrative-empty-field">None captured.</p>;
  }
  return (
    <ul className="narrative-bullets">
      {bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

function EditableProse({
  fieldPath,
  text,
  onSave,
  renderer,
}: {
  fieldPath: string;
  text?: string | null;
  onSave: (fieldPath: string, value: string) => void | Promise<void>;
  renderer: 'prose' | 'bullets';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(text ?? '');

  // Sync DOM from prop only when the value changed externally AND the user
  // is not actively editing this field — preserves caret position and
  // avoids the React-controlled contentEditable hydration race.
  useEffect(() => {
    const incoming = text ?? '';
    if (!ref.current) return;
    if (incoming !== lastSavedRef.current && document.activeElement !== ref.current) {
      ref.current.innerText = incoming;
      lastSavedRef.current = incoming;
    }
  }, [text]);

  const handleInput = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = ref.current?.innerText ?? '';
      if (current === lastSavedRef.current) return;
      lastSavedRef.current = current;
      void onSave(fieldPath, current);
    }, 500);
  }, [fieldPath, onSave]);

  const isEmpty = !text || text.trim().length === 0;
  const className =
    renderer === 'bullets'
      ? 'narrative-prose narrative-prose-editable narrative-prose-bullets'
      : 'narrative-prose narrative-prose-editable';

  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      data-placeholder={isEmpty ? 'Not assessed. Click to add.' : undefined}
    />
  );
}

function KeyCriteriaDetailedList({ items }: { items?: NarrativeKeyCriterion[] | null }) {
  if (!items || items.length === 0) {
    return <p className="narrative-empty-field">No criteria assessed.</p>;
  }
  return (
    <ol className="narrative-criteria">
      {items.map((c, i) => (
        <li key={i} className="narrative-criterion">
          <div className="narrative-criterion-head">
            <span className="narrative-criterion-name">{c.name}</span>
            <span className={`narrative-rating-pill ${ratingColorClass(c.rating)}`}>
              {c.rating}
            </span>
          </div>
          {c.rationale && (
            <p className="narrative-criterion-rationale">
              <em>{c.rationale}</em>
            </p>
          )}
          {c.evidence_prose && <p className="narrative-criterion-evidence">{c.evidence_prose}</p>}
        </li>
      ))}
    </ol>
  );
}

function ScopeMatchList({ items }: { items?: NarrativeScopeMatch[] | null }) {
  if (!items || items.length === 0) {
    return <p className="narrative-empty-field">No scope dimensions assessed.</p>;
  }
  return (
    <ul className="narrative-scope">
      {items.map((s, i) => (
        <li key={i} className="narrative-scope-item">
          <div className="narrative-scope-head">
            <span className="narrative-scope-name">{s.scope}</span>
            <span className={`narrative-alignment-pill ${alignmentColorClass(s.alignment)}`}>
              {s.alignment.replace('_', ' ')}
            </span>
          </div>
          <p className="narrative-scope-rationale">{s.alignment_rationale}</p>
        </li>
      ))}
    </ul>
  );
}

function ScoreBreakdownTable({
  items,
  total,
}: {
  items?: NarrativeScoreBreakdown[] | null;
  total: number | null;
}) {
  if (!items || items.length === 0) {
    return <p className="narrative-empty-field">No score breakdown available.</p>;
  }
  return (
    <table className="narrative-score-table">
      <thead>
        <tr>
          <th>Criterion</th>
          <th>Rating</th>
          <th className="num">Contribution</th>
        </tr>
      </thead>
      <tbody>
        {items.map((s, i) => (
          <tr key={i}>
            <td>{s.name}</td>
            <td>
              <span className={`narrative-rating-pill ${ratingColorClass(s.rating)}`}>
                {s.rating}
              </span>
            </td>
            <td className="num">{typeof s.contribution === 'number' ? s.contribution : '—'}</td>
          </tr>
        ))}
        {total !== null && (
          <tr className="narrative-score-total">
            <td colSpan={2}>Match Score</td>
            <td className="num">{total}%</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function OurTakeNarrativeSection({
  ourTake,
  source,
  edited,
  onSave,
  onReset,
}: {
  ourTake: OurTakeNarrative;
  source: string | null;
  edited: boolean;
  onSave: (text: string) => void | Promise<void>;
  onReset: () => void | Promise<void>;
}) {
  const text = ourTake?.text ?? '';
  const sourceLabel = source ?? 'Unspecified';
  const sourceSlug = sourceLabel.toLowerCase().replace(/[^a-z]/g, '-');

  return (
    <section className="narrative-our-take narrative-section narrative-section--consultant-only">
      <div className="narrative-our-take-head">
        <h3 className="narrative-section-title">Our Take (Narrative)</h3>
        <span className="narrative-consultant-badge">Consultant-only</span>
        {ENABLE_NARRATIVE_EDITING && edited && (
          <div className="narrative-edit-meta">
            <span className="narrative-edited-pill">edited</span>
            <button
              type="button"
              className="narrative-reset-btn"
              onClick={() => onReset()}
              aria-label="Reset Our Take Narrative"
              title="Reset to engine output"
            >
              ×
            </button>
          </div>
        )}
      </div>
      <div className="narrative-our-take-meta">
        <span className="narrative-source-label">Source:</span>
        <span className={`narrative-source-pill source-${sourceSlug}`}>{sourceLabel}</span>
      </div>
      {ENABLE_NARRATIVE_EDITING ? (
        <OurTakeEditable text={text} onSave={onSave} />
      ) : text && text.trim().length > 0 ? (
        <NarrativeProse text={text} />
      ) : (
        <p className="narrative-our-take-empty">
          No Our Take narrative for this candidate. Engine v2 returns null when no
          consultant manual notes were captured (Rule 17 source quarantine). Add manual notes
          in Granola and regenerate to populate.
        </p>
      )}
    </section>
  );
}

function OurTakeEditable({
  text,
  onSave,
}: {
  text: string;
  onSave: (text: string) => void | Promise<void>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(text);

  useEffect(() => {
    if (!ref.current) return;
    if (text !== lastSavedRef.current && document.activeElement !== ref.current) {
      ref.current.innerText = text;
      lastSavedRef.current = text;
    }
  }, [text]);

  const handleInput = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = ref.current?.innerText ?? '';
      if (current === lastSavedRef.current) return;
      lastSavedRef.current = current;
      void onSave(current);
    }, 500);
  }, [onSave]);

  const isEmpty = !text || text.trim().length === 0;

  return (
    <div
      ref={ref}
      className="narrative-prose narrative-prose-editable"
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      data-placeholder={isEmpty ? 'No Our Take narrative. Click to add consultant note.' : undefined}
    />
  );
}

function NarrativeFooter() {
  return (
    <footer className="narrative-footer">
      <span className="narrative-footer-label">Internal narrative — never visible to client.</span>
    </footer>
  );
}
