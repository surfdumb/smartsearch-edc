'use client';

/**
 * NarrativeTab — "Spiel (Internal)" view
 *
 * Renders the V2 Engine narrative output as a consultant-internal "EDS" view
 * inside the candidate edit page. Structurally mirrors EDS v1.2 ordering
 * (see https://docs.google.com/document/d/1DKEkgE7_568vdIvC_dT7zHa3rwwnavqmST18dLK70ik).
 *
 * RENAME (25 May v2): tab label is "Spiel (Internal)" (replaces "Narrative").
 * Header eyebrow is "Internal Spiel". Footer reads "Internal spiel — never
 * visible to client."
 *
 * EDS v1.2 ORDERING (top to bottom):
 *   1. Candidate Overview
 *   2. ExecFlow AI Assessment
 *   3. Key Criteria Assessment (numbered)
 *   4. Career Highlights
 *   5. Experience Context
 *   6. Motivation & Fit
 *      - Why Open to Move        ← edc_data.why_interested (structured push/pull array)
 *      - Role Alignment          ← narrative.role_alignment
 *      - Compensation Details    ← edc_data.compensation.{current_total, expected_total, flexibility}
 *      - Timeline & Availability ← edc_data.{notice_period, earliest_start_date}
 *      - Cultural Fit Indicators ← narrative.cultural_fit_indicators
 *   7. Potential Concerns (narrative.significant_concerns + narrative.development_areas)
 *   8. Questions Candidate Asked
 *   9. Quick Reference / Candidate Intro (table — 9 rows matching v1.2)
 *
 * REMOVED (25 May v2): match_score_percentage header badge,
 * match_score_breakdown table, scope_match_detailed list, our_take_narrative
 * section. Data still produced by Engine v2 and stored in candidate_narratives —
 * just not rendered. Restoring any is a render-only change.
 *
 * SOURCE QUARANTINE (still enforced):
 *   - The Spiel tab does NOT render our_take_narrative. Manual notes content
 *     cannot reach this view by accident — Rule 17 holds by omission.
 *
 * VISIBILITY:
 *   - Hard-gated on useEditorContext().isEditable — returns null when
 *     not in edit context. Belt-and-braces against accidental client exposure.
 */

import { useMemo } from 'react';
import { useEditorContext } from '@/contexts/EditorContext';
import '@/styles/narrative-tab.css';

// ============================================================================
// FEATURE FLAGS
// ============================================================================
// Kept as documentation anchors for the next iteration. The v2.1 Spiel tab
// reads narrative directly from edcData.narrative (via pickNarrative); when
// the API fetch is wired in, READ_FROM_NARRATIVE_TABLE becomes the gate.
// ENABLE_NARRATIVE_EDITING gates the contentEditable handlers that will
// follow once the read path moves to the API.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const READ_FROM_NARRATIVE_TABLE = false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ENABLE_NARRATIVE_EDITING = false;

// ============================================================================
// TYPES
// ============================================================================

export type NarrativeKeyCriterion = {
  name: string;
  rating: 'Strong' | 'Very Good' | 'Good' | 'Limited' | 'Weak' | 'Not Covered' | string;
  rationale: string;
  evidence_prose: string;
};

export type NarrativeData = {
  candidate_overview?: string;
  execflow_ai_assessment?: string;
  key_criteria_detailed?: NarrativeKeyCriterion[];
  career_highlights?: string;
  experience_context?: string;
  role_alignment?: string;
  cultural_fit_indicators?: string;
  significant_concerns?: string;
  development_areas?: string;
  questions_candidate_asked?: string;
  key_strength?: string;
  key_concern?: string;
  // Data still produced by Engine v2 but not rendered in v2 tab:
  match_score_percentage?: number | null;
  match_score_breakdown?: Array<{ name: string; rating: string; contribution: number }>;
  scope_match_detailed?: Array<{ scope: string; alignment: string; alignment_rationale: string }>;
};

export type EdcCompensation = {
  current_total?: string;
  expected_total?: string;
  flexibility?: string;
  base?: string;
  bonus?: string;
  lti?: string;
  benefits?: string;
  [k: string]: unknown;
};

export type WhyInterestedFactor = {
  type?: 'push' | 'pull' | string;
  headline?: string;
  detail?: string;
};

export type EdcCardData = {
  candidate_name?: string;
  current_title?: string;
  role_title?: string;
  current_company?: string;
  location?: string;
  notice_period?: string;
  earliest_start_date?: string;
  motivation_hook?: string;
  why_interested?: WhyInterestedFactor[] | string;
  compensation?: EdcCompensation;
  narrative?: NarrativeData & {
    our_take_narrative?: { text?: string } | null;
    our_take_source?: string;
  };
  [k: string]: unknown;
};

/**
 * Candidate-row fields from the `candidates` table (not in edc_data JSONB).
 * Pass these from EDCCard alongside `edcData` so the Quick Reference table can
 * render the full v1.2 nine-row layout. All fields optional — table gracefully
 * skips rows that are null/empty.
 */
export type CandidateRow = {
  primary_industry?: string | null;
  years_in_current_role?: string | null;
  total_team_size?: string | null;
  current_title?: string | null;
  current_company?: string | null;
  location?: string | null;
};

export type NarrativeTabProps = {
  candidateId: string;
  candidateName: string;
  narrative?: NarrativeData | null;
  edcData?: EdcCardData;
  candidateRow?: CandidateRow;
  isLocked?: boolean;
};

// ============================================================================
// HELPERS
// ============================================================================

function pickNarrative(props: NarrativeTabProps): NarrativeData | null {
  if (props.narrative) return props.narrative;
  const fromEdc = props.edcData?.narrative;
  if (!fromEdc) return null;
  // Strip the source-quarantined Our Take fields; what remains is render data.
  const rest = { ...(fromEdc as Record<string, unknown>) };
  delete rest.our_take_narrative;
  delete rest.our_take_source;
  return rest as NarrativeData;
}

function ratingColorClass(rating?: string): string {
  if (!rating) return 'rating-neutral';
  const r = rating.toLowerCase();
  if (r.includes('strong') || r === 'very good') return 'rating-strong';
  if (r === 'good') return 'rating-good';
  if (r.includes('limited') || r.includes('partial') || r.includes('moderate')) return 'rating-partial';
  if (r.includes('weak') || r.includes('not covered')) return 'rating-weak';
  return 'rating-neutral';
}

function hasNonEmpty(value?: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Prefer the candidate-row column value (canonical), fall back to edc_data
 * JSONB value (often mirrored), then null. Used for Quick Reference rows.
 */
function preferRow<K extends keyof CandidateRow>(
  row: CandidateRow | undefined,
  edc: EdcCardData | undefined,
  key: K,
  edcKey?: keyof EdcCardData,
): string | null {
  const rowVal = row?.[key];
  if (typeof rowVal === 'string' && hasNonEmpty(rowVal)) return rowVal;
  const edcVal = edc?.[(edcKey ?? key) as keyof EdcCardData];
  if (typeof edcVal === 'string' && hasNonEmpty(edcVal)) return edcVal;
  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NarrativeTab(props: NarrativeTabProps) {
  // Belt-and-braces consultant-only gate. Hook order must be stable, so
  // declare all hooks BEFORE the early return.
  const { isEditable } = useEditorContext();
  const narrative = useMemo(() => pickNarrative(props), [props.narrative, props.edcData]);
  if (!isEditable) return null;

  const edc = props.edcData ?? {};
  const row = props.candidateRow;

  if (!narrative || Object.keys(narrative).length === 0) {
    return (
      <div className="narrative-tab">
        <header className="narrative-header">
          <div className="narrative-header-left">
            <span className="narrative-eyebrow">Internal Spiel</span>
            <h2>{props.candidateName}</h2>
          </div>
        </header>
        <div className="narrative-empty">
          <h3>Spiel not yet generated</h3>
          <p>
            The V2 Engine produces the internal spiel when an interview is processed
            through the new pipeline. This candidate either predates V2 or is awaiting
            the first interview fire.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="narrative-tab" data-candidate-id={props.candidateId}>
      <header className="narrative-header">
        <div className="narrative-header-left">
          <span className="narrative-eyebrow">Internal Spiel</span>
          <h2>{props.candidateName}</h2>
        </div>
      </header>

      {/* 1. Candidate Overview */}
      <Section title="Candidate Overview">
        <NarrativeProse text={narrative.candidate_overview} />
      </Section>

      {/* 2. ExecFlow AI Assessment */}
      <Section title="ExecFlow AI Assessment">
        <NarrativeProse text={narrative.execflow_ai_assessment} />
      </Section>

      {/* 3. Key Criteria Assessment (numbered) */}
      <Section title="Key Criteria Assessment">
        <KeyCriteriaNumberedList items={narrative.key_criteria_detailed} />
      </Section>

      {/* 4. Career Highlights */}
      <Section title="Career Highlights">
        <NarrativeMarkdownBullets text={narrative.career_highlights} />
      </Section>

      {/* 5. Experience Context */}
      <Section title="Experience Context">
        <NarrativeProse text={narrative.experience_context} />
      </Section>

      {/* 6. Motivation & Fit (parent section with subsections) */}
      <Section title="Motivation & Fit">
        <Subsection title="Why Open to Move">
          <WhyOpenToMoveBlock
            whyInterested={edc.why_interested}
            motivationHookFallback={edc.motivation_hook}
          />
        </Subsection>

        <Subsection title="Role Alignment">
          <NarrativeProse text={narrative.role_alignment} />
        </Subsection>

        <Subsection title="Compensation Details">
          <CompensationDetailsBlock comp={edc.compensation} />
        </Subsection>

        <Subsection title="Timeline & Availability">
          <TimelineBlock
            noticePeriod={edc.notice_period}
            earliestStart={edc.earliest_start_date}
          />
        </Subsection>

        <Subsection title="Cultural Fit Indicators">
          <NarrativeProse text={narrative.cultural_fit_indicators} />
        </Subsection>
      </Section>

      {/* 7. Potential Concerns */}
      <Section title="Potential Concerns" tone="alert">
        <PotentialConcernsBlock
          significantConcerns={narrative.significant_concerns}
          developmentAreas={narrative.development_areas}
        />
      </Section>

      {/* 8. Questions Candidate Asked */}
      <Section title="Questions Candidate Asked">
        <NarrativeMarkdownBullets text={narrative.questions_candidate_asked} />
      </Section>

      {/* 9. Quick Reference / Candidate Intro */}
      <Section title="Quick Reference / Candidate Intro">
        <QuickReferenceTable
          candidateName={edc.candidate_name ?? props.candidateName}
          currentTitle={preferRow(row, edc, 'current_title') ?? edc.role_title}
          currentCompany={preferRow(row, edc, 'current_company')}
          location={preferRow(row, edc, 'location')}
          primaryIndustry={row?.primary_industry ?? null}
          yearsInCurrentRole={row?.years_in_current_role ?? null}
          totalTeamSize={row?.total_team_size ?? null}
          keyStrength={narrative.key_strength}
          keyConcern={narrative.key_concern}
        />
      </Section>

      <footer className="narrative-footer">
        <span className="narrative-footer-label">Internal spiel — never visible to client.</span>
      </footer>
    </div>
  );
}

// ============================================================================
// SECTION + SUBSECTION
// ============================================================================

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

function Subsection({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'default' | 'alert' | 'positive';
}) {
  return (
    <div className={`narrative-subsection narrative-subsection--${tone}`}>
      <h4 className="narrative-subsection-title">{title}</h4>
      <div className="narrative-subsection-body">{children}</div>
    </div>
  );
}

// ============================================================================
// TEXT BLOCKS
// ============================================================================

function NarrativeProse({ text }: { text?: string | null }) {
  if (!hasNonEmpty(text)) {
    return <p className="narrative-empty-field">Not assessed.</p>;
  }
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) {
    return <p className="narrative-prose">{text}</p>;
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="narrative-prose">{p}</p>
      ))}
    </>
  );
}

function NarrativeMarkdownBullets({ text }: { text?: string | null }) {
  if (!hasNonEmpty(text)) {
    return <p className="narrative-empty-field">None captured.</p>;
  }
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = lines
    .map(l => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
  if (bullets.length === 0) {
    return <p className="narrative-empty-field">None captured.</p>;
  }
  return (
    <ul className="narrative-bullets">
      {bullets.map((b, i) => <li key={i}>{b}</li>)}
    </ul>
  );
}

// ============================================================================
// WHY OPEN TO MOVE — reads structured why_interested array, falls back to hook
// ============================================================================

function WhyOpenToMoveBlock({
  whyInterested,
  motivationHookFallback,
}: {
  whyInterested?: WhyInterestedFactor[] | string;
  motivationHookFallback?: string;
}) {
  // Case 1: structured array of push/pull factors (preferred, richer)
  if (Array.isArray(whyInterested) && whyInterested.length > 0) {
    return (
      <ul className="narrative-factor-list">
        {whyInterested.map((f, i) => {
          if (!f || (typeof f !== 'object')) return null;
          const type = (f.type || '').toLowerCase();
          const tagClass =
            type === 'push' ? 'factor-tag--push' :
            type === 'pull' ? 'factor-tag--pull' :
            'factor-tag--neutral';
          return (
            <li key={i} className="narrative-factor">
              <div className="narrative-factor-head">
                {type && (
                  <span className={`narrative-factor-tag ${tagClass}`}>
                    {type.toUpperCase()}
                  </span>
                )}
                {hasNonEmpty(f.headline) && (
                  <span className="narrative-factor-headline">{f.headline}</span>
                )}
              </div>
              {hasNonEmpty(f.detail) && (
                <p className="narrative-factor-detail">{f.detail}</p>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  // Case 2: legacy free-text in why_interested
  if (typeof whyInterested === 'string' && hasNonEmpty(whyInterested)) {
    return <NarrativeProse text={whyInterested} />;
  }

  // Case 3: motivation_hook fallback (compact, one-liner)
  if (hasNonEmpty(motivationHookFallback)) {
    return <p className="narrative-prose narrative-prose--hook">{motivationHookFallback}</p>;
  }

  return <p className="narrative-empty-field">Not captured.</p>;
}

// ============================================================================
// KEY CRITERIA (numbered, EDS v1.2 style)
// ============================================================================

function KeyCriteriaNumberedList({ items }: { items?: NarrativeKeyCriterion[] | null }) {
  if (!items || items.length === 0) {
    return <p className="narrative-empty-field">No criteria assessed.</p>;
  }
  return (
    <ol className="narrative-criteria narrative-criteria--numbered">
      {items.map((c, i) => (
        <li key={i} className="narrative-criterion">
          <div className="narrative-criterion-head">
            <span className="narrative-criterion-name">
              <span className="narrative-criterion-num">{i + 1}.</span>{' '}
              {c.name}
              {hasNonEmpty(c.rating) && (
                <>
                  : <span className={`narrative-rating-inline ${ratingColorClass(c.rating)}`}>{c.rating}</span>.
                </>
              )}
            </span>
          </div>
          {hasNonEmpty(c.rationale) && (
            <p className="narrative-criterion-rationale">{c.rationale}</p>
          )}
          {hasNonEmpty(c.evidence_prose) && (
            <p className="narrative-criterion-evidence">{c.evidence_prose}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

// ============================================================================
// COMPENSATION DETAILS (from card-side edc_data.compensation)
// ============================================================================

function CompensationDetailsBlock({ comp }: { comp?: EdcCompensation }) {
  if (!comp || typeof comp !== 'object') {
    return <p className="narrative-empty-field">Not captured.</p>;
  }
  const rows: Array<{ label: string; value?: string }> = [
    { label: 'Current', value: comp.current_total },
    { label: 'Expected', value: comp.expected_total },
    { label: 'Flexibility', value: comp.flexibility },
  ];
  const present = rows.filter(r => hasNonEmpty(r.value));
  if (present.length === 0) {
    return <p className="narrative-empty-field">Not captured — see Compensation tab for any consultant-set values.</p>;
  }
  return (
    <dl className="narrative-deflist">
      {present.map((r, i) => (
        <div className="narrative-deflist-row" key={i}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ============================================================================
// TIMELINE & AVAILABILITY (from card-side notice_period + earliest_start_date)
// ============================================================================

function TimelineBlock({
  noticePeriod,
  earliestStart,
}: {
  noticePeriod?: string;
  earliestStart?: string;
}) {
  const rows: Array<{ label: string; value?: string }> = [
    { label: 'Notice Period', value: noticePeriod },
    { label: 'Earliest Start', value: earliestStart },
  ];
  const present = rows.filter(r => hasNonEmpty(r.value));
  if (present.length === 0) {
    return <p className="narrative-empty-field">Not mentioned in the interview.</p>;
  }
  return (
    <dl className="narrative-deflist">
      {present.map((r, i) => (
        <div className="narrative-deflist-row" key={i}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ============================================================================
// POTENTIAL CONCERNS (combines significant_concerns + development_areas)
// ============================================================================

function PotentialConcernsBlock({
  significantConcerns,
  developmentAreas,
}: {
  significantConcerns?: string;
  developmentAreas?: string;
}) {
  const hasConcerns = hasNonEmpty(significantConcerns);
  const hasDev = hasNonEmpty(developmentAreas);

  if (!hasConcerns && !hasDev) {
    return <p className="narrative-empty-field">None flagged.</p>;
  }

  return (
    <>
      {hasConcerns && <NarrativeProse text={significantConcerns} />}
      {hasDev && (
        <>
          <h4 className="narrative-subsection-title narrative-concerns-dev-label">
            Development Areas
          </h4>
          <NarrativeProse text={developmentAreas} />
        </>
      )}
    </>
  );
}

// ============================================================================
// QUICK REFERENCE / CANDIDATE INTRO TABLE (full EDS v1.2 nine-row layout)
// ============================================================================

function QuickReferenceTable({
  candidateName,
  currentTitle,
  currentCompany,
  location,
  primaryIndustry,
  yearsInCurrentRole,
  totalTeamSize,
  keyStrength,
  keyConcern,
}: {
  candidateName?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  location?: string | null;
  primaryIndustry?: string | null;
  yearsInCurrentRole?: string | null;
  totalTeamSize?: string | null;
  keyStrength?: string | null;
  keyConcern?: string | null;
}) {
  const rows: Array<{ label: string; value?: string | null; tone?: 'positive' | 'alert' }> = [
    { label: 'Candidate Name', value: candidateName },
    { label: 'Current Title', value: currentTitle },
    { label: 'Current Company', value: currentCompany },
    { label: 'Location', value: location },
    { label: 'Primary Industry', value: primaryIndustry },
    { label: 'Years in Current Role', value: yearsInCurrentRole },
    { label: 'Total Team Size', value: totalTeamSize },
    { label: 'Key Strength', value: keyStrength, tone: 'positive' },
    { label: 'Key Concern', value: keyConcern, tone: 'alert' },
  ];
  const present = rows.filter(r => hasNonEmpty(r.value ?? ''));
  if (present.length === 0) {
    return <p className="narrative-empty-field">No quick-reference data.</p>;
  }
  return (
    <table className="narrative-quick-ref-table">
      <tbody>
        {present.map((r, i) => (
          <tr key={i} className={r.tone ? `narrative-qr-row--${r.tone}` : undefined}>
            <th scope="row">{r.label}</th>
            <td>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
