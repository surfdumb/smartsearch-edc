// Search Room — data shape + derivation helpers.
// Ported verbatim (in behavior) from the Claude Design prototype's inline JS.

export type Priority = "purple" | "green" | "red" | "amber" | "hold";
export type SearchStatus = "high" | "active" | "hold" | "closed";
export type CandStatus = "none" | "new" | "active" | "hold" | "rejected";

export interface RawSearch {
  k: string;            // search key / slug
  co: string;           // company
  r: string;            // role
  st: SearchStatus;
  loc?: string | null;
  ind?: string | null;  // industry
  brief: boolean;       // role brief generated?
  pw: boolean;          // password-protected?
  kam?: string | null;
  cg?: string | null;
  cc?: string | null;
  ev: string;           // engine version
  pri: Priority;
}

export interface RawCandidate {
  n: string;            // name
  t?: string | null;    // title
  c?: string | null;    // company
  loc?: string | null;
  ds: CandStatus;       // deck status
  sl?: string | null;   // card slug
  cons?: string | null; // consultant
}

export interface SearchData {
  searches: RawSearch[];
  candidates: Record<string, RawCandidate[]>;
}

// SearchData plus the freshness stamp the /searchroom API/board carry.
export type Dataset = SearchData & { synced_at?: string };

export interface Search extends RawSearch {
  _cands: RawCandidate[];
  _counts: Record<CandStatus, number>;
  _total: number;
  _internal: number;
  _ondeck: number;
  _hold: number;
  _passed: number;
  _hay: string;
}

export const BASE = "https://edc.smartsearchexec.com";

export const STATUS_LABEL: Record<SearchStatus, string> = {
  high: "High priority",
  active: "Active",
  hold: "On hold",
  closed: "Closed",
};

export const STATUS_COLOR: Record<SearchStatus, string> = {
  high: "var(--ss-gold-warm)",
  active: "var(--ss-charcoal)",
  hold: "var(--ss-grey-mid)",
  closed: "var(--ss-grey-light)",
};

export const PILL_LABEL: Record<string, string> = {
  active: "On deck",
  hold: "Hold",
  new: "In review",
  none: "Internal",
  rejected: "Passed",
};

export const CATS: Record<Priority, { label: string; color: string; rank: number }> = {
  purple: { label: "Needs a cut", color: "#8d6fb0", rank: 1 },
  green: { label: "Offer in progress", color: "var(--ss-green)", rank: 2 },
  red: { label: "High", color: "var(--ss-red)", rank: 3 },
  amber: { label: "Medium", color: "var(--ss-amber)", rank: 4 },
  hold: { label: "On hold", color: "var(--ss-grey-light)", rank: 5 },
};

export interface ModuleDef {
  id: 1 | 2 | 3;
  title: string;
  cats: Priority[];
}

export const MODULES: ModuleDef[] = [
  { id: 1, title: "Needs attention", cats: ["purple", "green"] },
  { id: 2, title: "Active urgency", cats: ["red", "amber"] },
  { id: 3, title: "On hold", cats: ["hold"] },
];

export type SortFn = (a: Search, b: Search) => number;

export function catSort(c: Priority): SortFn {
  if (c === "purple")
    return (a, b) => {
      const ah = a.st === "high" ? 0 : 1;
      const bh = b.st === "high" ? 0 : 1;
      if (ah !== bh) return ah - bh;
      return a._total - b._total;
    };
  if (c === "hold") return (a, b) => ((a.co || "") < (b.co || "") ? -1 : 1);
  return (a, b) => {
    if (b._ondeck !== a._ondeck) return b._ondeck - a._ondeck;
    return b._total - a._total;
  };
}

export function byRank(a: Search, b: Search): number {
  const ar = CATS[a.pri].rank;
  const br = CATS[b.pri].rank;
  if (ar !== br) return ar - br;
  return b._ondeck - a._ondeck;
}

// Drill-down filters available from the module stat counts.
export type MFKey = "purple" | "purple-high" | "green" | "red" | "amber" | "ondeck" | "hold";

export const MF: Record<MFKey, { label: string; dot: string; test: (s: Search) => boolean; sort: SortFn }> = {
  purple: { label: "needing a cut", dot: CATS.purple.color, test: (s) => s.pri === "purple", sort: catSort("purple") },
  "purple-high": { label: "high priority & unsourced", dot: CATS.purple.color, test: (s) => s.pri === "purple" && s.st === "high", sort: catSort("purple") },
  green: { label: "with an offer in progress", dot: CATS.green.color, test: (s) => s.pri === "green", sort: catSort("green") },
  red: { label: "high urgency", dot: CATS.red.color, test: (s) => s.pri === "red", sort: catSort("red") },
  amber: { label: "medium urgency", dot: CATS.amber.color, test: (s) => s.pri === "amber", sort: catSort("amber") },
  ondeck: { label: "with candidates on deck", dot: "var(--ss-green)", test: (s) => s._ondeck > 0, sort: (a, b) => b._ondeck - a._ondeck },
  hold: { label: "on hold", dot: CATS.hold.color, test: (s) => s.pri === "hold", sort: catSort("hold") },
};

export function val(x: string | null | undefined): string | null {
  return x && String(x).trim() ? String(x).trim() : null;
}

export function kamShort(k: string | null | undefined): string | null {
  if (!k) return null;
  const m = String(k).match(/Lead Consultant:\s*([^|]+)/i);
  const v = (m ? m[1] : k).trim();
  return v || null;
}

export function initials(name: string): string {
  return (
    String(name)
      .split(/[\s(]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "—"
  );
}

// Enrich raw searches with derived counts + a searchable haystack.
export function buildSearches(data: SearchData): Search[] {
  return data.searches.map((s) => {
    const list = data.candidates[s.k] || [];
    const c: Record<CandStatus, number> = { none: 0, new: 0, active: 0, hold: 0, rejected: 0 };
    list.forEach((p) => {
      c[p.ds] = (c[p.ds] || 0) + 1;
    });
    const hay: string[] = [s.co, s.r, s.kam || "", s.cg || "", s.cc || "", s.k, s.loc || "", s.ind || ""];
    list.forEach((p) => hay.push(p.n, p.t || "", p.c || "", p.cons || ""));
    return {
      ...s,
      _cands: list,
      _counts: c,
      _total: list.length,
      _internal: c.none + c.new,
      _ondeck: c.active,
      _hold: c.hold,
      _passed: c.rejected,
      _hay: hay.join(" · ").toLowerCase(),
    };
  });
}
