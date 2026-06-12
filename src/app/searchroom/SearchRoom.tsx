"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import rawData from "./data.json";
import {
  BASE,
  CATS,
  MF,
  MODULES,
  PILL_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  buildSearches,
  byRank,
  catSort,
  initials,
  kamShort,
  val,
  type MFKey,
  type ModuleDef,
  type Priority,
  type RawCandidate,
  type Search,
  type SearchData,
} from "./lib";

const GATE_PASSWORD = "edc2026";

/* ---------- inline icons ---------- */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}
function Chevron({ className, size = 18 }: { className: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ChipIcon({ kind }: { kind: "edit" | "client" | "brief" }) {
  if (kind === "client")
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  if (kind === "brief")
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
function ExtIcon() {
  return (
    <svg className="ext" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

type ModId = 1 | 2 | 3;

export default function SearchRoom() {
  const [unlocked, setUnlocked] = useState(false);

  const SEARCHES = useMemo(() => buildSearches(rawData as SearchData), []);

  // filter / view state
  const [q, setQ] = useState("");
  const [pri, setPri] = useState<Priority | null>(null);
  const [kam, setKam] = useState("all");
  const [ev, setEv] = useState("all");
  const [showClosed, setShowClosed] = useState(false);
  const [mask, setMask] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [modOpen, setModOpen] = useState<Record<ModId, boolean>>({ 1: false, 2: false, 3: false });
  const [modFilter, setModFilter] = useState<Record<ModId, MFKey | null>>({ 1: null, 2: null, 3: null });

  // toast
  const [toast, setToast] = useState<{ html: string; show: boolean }>({ html: "", show: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const kamOptions = useMemo(() => {
    const seen: Record<string, true> = {};
    SEARCHES.forEach((s) => {
      const k = kamShort(s.kam);
      if (k) seen[k] = true;
    });
    return Object.keys(seen).sort();
  }, [SEARCHES]);

  const evOptions = useMemo(() => {
    const evs: Record<string, true> = {};
    SEARCHES.forEach((s) => (evs[s.ev] = true));
    return ["v2.1", "v2.0"].filter((v) => evs[v]);
  }, [SEARCHES]);

  const headStats = useMemo(() => {
    let live = 0;
    let hold = 0;
    SEARCHES.forEach((s) => {
      if (s.st === "high" || s.st === "active") live++;
      if (s.st === "hold") hold++;
    });
    return { live, hold, total: SEARCHES.length };
  }, [SEARCHES]);

  function showToast(html: string) {
    setToast({ html, show: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
  }
  function copy(text: string) {
    const ok = () => showToast('Copied <span class="g">' + escapeHtml(text) + "</span>");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, () => showToast('Copy this: <span class="g">' + escapeHtml(text) + "</span>"));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        ok();
      } catch {
        showToast(text);
      }
      document.body.removeChild(ta);
    }
  }

  function passFilters(s: Search): boolean {
    if (s.st === "closed" && !showClosed) return false;
    if (kam !== "all" && kamShort(s.kam) !== kam) return false;
    if (ev !== "all" && s.ev !== ev) return false;
    return true;
  }

  function togglePri(p: Priority) {
    setPri((cur) => (cur === p ? null : p));
  }
  function toggleRow(k: string) {
    setOpen((o) => ({ ...o, [k]: !o[k] }));
  }
  function toggleModule(id: ModId, viaStat: boolean, mf?: MFKey) {
    if (viaStat) {
      if (modOpen[id] && modFilter[id] === mf) {
        setModFilter((f) => ({ ...f, [id]: null }));
      } else {
        setModOpen((o) => ({ ...o, [id]: true }));
        setModFilter((f) => ({ ...f, [id]: mf ?? null }));
      }
    } else {
      setModOpen((o) => ({ ...o, [id]: !o[id] }));
      setModFilter((f) => ({ ...f, [id]: null }));
    }
  }
  function clearAll() {
    setQ("");
    setKam("all");
    setEv("all");
    setShowClosed(false);
    setPri(null);
  }

  /* ---------- render helpers ---------- */
  function dispName(p: RawCandidate) {
    return mask ? initials(p.n) + "." : p.n;
  }

  function pulse(s: Search) {
    if (s._total === 0) return <div className="pulse empty" title="No candidates yet" />;
    const t = s._total;
    const seg = (n: number, cls: string) => (n ? <i key={cls} className={cls} style={{ width: (n / t) * 100 + "%" }} /> : null);
    return (
      <div className="pulse" title={`${s._internal} internal · ${s._ondeck} on deck · ${s._hold} hold · ${s._passed} passed`}>
        {seg(s._ondeck, "seg-active")}
        {seg(s._hold, "seg-hold")}
        {seg(s._passed, "seg-passed")}
        {seg(s._internal, "seg-internal")}
      </div>
    );
  }
  function counts(s: Search) {
    if (s._total === 0)
      return (
        <div className="counts">
          <span className="empty">No candidates yet</span>
        </div>
      );
    return (
      <div className="counts">
        <b>{s._total}</b> interviewed
        {s._ondeck ? (
          <>
            {" · "}
            <span className="ondeck">{s._ondeck} on deck</span>
          </>
        ) : null}
      </div>
    );
  }
  function roles(s: Search) {
    const parts: React.ReactNode[] = [];
    const k = kamShort(s.kam);
    if (k) parts.push(<span key="kam"><span className="role-k">KAM</span>{k}</span>);
    if (val(s.cg)) parts.push(<span key="cg"><span className="role-k">CG</span>{s.cg}</span>);
    if (val(s.cc)) parts.push(<span key="cc"><span className="role-k">CC</span>{s.cc}</span>);
    if (!parts.length)
      return (
        <div className="roles">
          <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>No KAM / CG / CC set</span>
        </div>
      );
    return <div className="roles">{parts}</div>;
  }
  function urlChip(label: string, path: string, kind: "edit" | "client" | "brief", enabled: boolean) {
    if (!enabled)
      return (
        <span className="url-chip disabled" title="No Role brief generated yet">
          <ChipIcon kind={kind} />
          {label}
        </span>
      );
    const url = BASE + path;
    return (
      <a className={"url-chip " + kind} href={url} target="_blank" rel="noopener noreferrer" title={"Open " + url}>
        <ChipIcon kind={kind} />
        {label}
        <ExtIcon />
      </a>
    );
  }
  function candidateRows(s: Search) {
    if (s._total === 0)
      return (
        <div className="cands">
          <div className="crow" style={{ gridTemplateColumns: "1fr" }}>
            <div className="cmeta">No candidates captured for this search yet. They&apos;ll appear here as interviews are pushed from Granola.</div>
          </div>
        </div>
      );
    return (
      <div className="cands">
        {s._cands.map((p, i) => {
          const u = p.sl ? BASE + "/" + s.k + "/" + p.sl : null;
          return (
            <div className="crow" key={i}>
              <span className={"pill " + p.ds}>{PILL_LABEL[p.ds] || p.ds}</span>
              <div className="cmain">
                <div className="cname">{dispName(p)}</div>
                <div className="cmeta">
                  {p.t || ""}
                  {p.c ? " · " + p.c : ""}
                  {p.loc ? " · " + p.loc : ""}
                </div>
              </div>
              <div className="cside">
                {p.cons ? <span className="cons">{p.cons}</span> : null}
                {u ? (
                  <button className="clink" title={"Copy " + u} onClick={() => copy(u)}>
                    Copy card link
                  </button>
                ) : (
                  <span className="clink off" title="No card slug — older record">
                    No card link
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  function searchRow(s: Search) {
    const isOpen = !!open[s.k];
    const meta: string[] = [];
    if (s.loc) meta.push(s.loc);
    if (s.ind) meta.push(s.ind);
    return (
      <div className={"srow pri-" + s.pri + (isOpen ? " open" : "")} data-key={s.k} key={s.k}>
        <button className="srow-head" aria-expanded={isOpen} onClick={() => toggleRow(s.k)}>
          <div className="srow-main">
            <div className="status-eyebrow" style={{ color: STATUS_COLOR[s.st] }}>
              <span className="dot" style={{ background: STATUS_COLOR[s.st] }} />
              {STATUS_LABEL[s.st]}
            </div>
            <div className="srow-title">
              <span className="srow-co">{s.co}</span>
              <span className="srow-role">{s.r}</span>
            </div>
            <div className="srow-meta">
              {meta.map((m, i) => (
                <span key={i}>
                  {i > 0 ? <span className="sep">·</span> : null}
                  {m}
                </span>
              ))}
              {meta.length ? <span className="sep">·</span> : null}
              <span className="key">{s.k}</span>
              {s.pw ? (
                <>
                  <span className="sep">·</span>
                  <span className="lock">● password-protected</span>
                </>
              ) : null}
            </div>
            {roles(s)}
          </div>
          <div className="srow-side">
            <span className="ev-chip">{s.ev}</span>
            {counts(s)}
            {pulse(s)}
          </div>
          <Chevron className="chev" />
        </button>
        <div className="urls">
          {urlChip("Edit", "/" + s.k + "/edit", "edit", true)}
          {urlChip("Client view", "/" + s.k, "client", true)}
          {urlChip("Role brief", "/" + s.k + "/brief", "brief", s.brief)}
        </div>
        {isOpen ? candidateRows(s) : null}
      </div>
    );
  }

  function moduleStats(mod: ModuleDef, inMod: Search[]) {
    const n = (test: (s: Search) => boolean) => inMod.filter(test).length;
    type Stat = { mf: MFKey; n: number; label: string; cls?: string };
    let stats: Stat[] = [];
    if (mod.id === 1) {
      stats = [
        { mf: "purple", n: n(MF.purple.test), label: "need a cut" },
        { mf: "purple-high", n: n(MF["purple-high"].test), label: "high & unsourced", cls: "warn" },
        { mf: "green", n: n(MF.green.test), label: "advancing" },
      ];
    } else if (mod.id === 2) {
      stats = [
        { mf: "red", n: n(MF.red.test), label: "high" },
        { mf: "amber", n: n(MF.amber.test), label: "medium" },
        { mf: "ondeck", n: inMod.reduce((t, s) => t + s._ondeck, 0), label: "candidates on deck" },
      ];
    } else {
      stats = [{ mf: "hold", n: n(MF.hold.test), label: "on hold" }];
    }
    return (
      <>
        {stats.map((st) => {
          const cls = "mstat" + (st.cls ? " " + st.cls : "");
          if (!st.n)
            return (
              <span className={cls + " zero"} key={st.mf}>
                <b>0</b> {st.label}
              </span>
            );
          const active = modFilter[mod.id] === st.mf;
          return (
            <button
              className={cls + (active ? " on" : "")}
              key={st.mf}
              aria-pressed={active}
              title="Show only these searches"
              onClick={(e) => {
                e.stopPropagation();
                toggleModule(mod.id, true, st.mf);
              }}
            >
              <b>{st.n}</b> {st.label}
            </button>
          );
        })}
        {mod.id === 3 ? <span className="muted">no action needed</span> : null}
      </>
    );
  }

  function moduleBlock(mod: ModuleDef, rows: Search[]) {
    const inMod = rows.filter((s) => mod.cats.indexOf(s.pri) !== -1);
    const isOpen = !!modOpen[mod.id];
    const mf = modFilter[mod.id];
    let body: React.ReactNode;
    if (isOpen && mf && MF[mf]) {
      const f = MF[mf];
      const cs = inMod.filter(f.test).sort(f.sort);
      body = (
        <>
          <div className="mfilter-bar">
            <i style={{ background: f.dot }} />
            Showing <b>{cs.length}</b> {cs.length === 1 ? "search " : "searches "}
            {f.label}
            <button
              className="mclear"
              onClick={() => setModFilter((prev) => ({ ...prev, [mod.id]: null }))}
            >
              Show all {inMod.length}
            </button>
          </div>
          {cs.length ? cs.map(searchRow) : <div className="module-empty">None right now.</div>}
        </>
      );
    } else if (!inMod.length) {
      body = <div className="module-empty">Nothing in this group right now.</div>;
    } else {
      body = mod.cats.map((c) => {
        const cs = inMod.filter((s) => s.pri === c).sort(catSort(c));
        if (!cs.length) return null;
        return (
          <div key={c}>
            <div className="cat-sub">
              <i style={{ background: CATS[c].color }} />
              {CATS[c].label} <span>({cs.length})</span>
            </div>
            {cs.map(searchRow)}
          </div>
        );
      });
    }
    const dots = mod.cats.map((c) => <i key={c} style={{ background: CATS[c].color }} />);
    return (
      <div className={"module" + (isOpen ? " open" : "")} data-mod={mod.id} key={mod.id}>
        <div
          className="module-head"
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button.mstat")) return;
            toggleModule(mod.id, false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleModule(mod.id, false);
            }
          }}
        >
          <span className="mtitle">
            <span className="mdots">{dots}</span>
            {mod.title} <span className="mcount">{inMod.length}</span>
          </span>
          <span className="module-stats">{moduleStats(mod, inMod)}</span>
          <Chevron className="module-chev" size={20} />
        </div>
        {isOpen ? <div className="module-body">{body}</div> : null}
      </div>
    );
  }

  /* ---------- list body ---------- */
  const rows = SEARCHES.filter(passFilters);
  let resultCount = "";
  let listBody: React.ReactNode;
  const qTrim = q.trim().toLowerCase();

  if (qTrim) {
    const hits = rows.filter((s) => s._hay.indexOf(qTrim) !== -1).sort(byRank);
    resultCount = hits.length + (hits.length === 1 ? " search" : " searches") + " matching";
    listBody = hits.length ? (
      <div className="flat-results">{hits.map(searchRow)}</div>
    ) : (
      <div className="empty-state">
        <h3>Nothing matches</h3>
        <p>No searches fit the current filters. Clear them to see all {SEARCHES.length}.</p>
        <button onClick={clearAll}>Clear filters</button>
      </div>
    );
  } else if (pri) {
    const picked = rows.filter((s) => s.pri === pri).sort(catSort(pri));
    resultCount = picked.length + (picked.length === 1 ? " search" : " searches");
    listBody = (
      <>
        <div className="filter-heading">
          <i style={{ background: CATS[pri].color }} />
          {CATS[pri].label} <span className="fcount">{picked.length}</span>
          <button className="clear" onClick={() => setPri(null)}>
            Show all groups
          </button>
        </div>
        {picked.length ? (
          <div className="flat-results">{picked.map(searchRow)}</div>
        ) : (
          <div className="module-empty">No searches in this band right now.</div>
        )}
      </>
    );
  } else {
    resultCount = rows.length + " shown" + (showClosed ? " (incl. closed)" : "");
    listBody = MODULES.map((mod) => moduleBlock(mod, rows));
  }

  /* ---------- gate ---------- */
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const pwRef = useRef<HTMLInputElement | null>(null);
  function unlock() {
    if (pw.trim().toLowerCase() === GATE_PASSWORD) {
      setUnlocked(true);
    } else {
      setPwErr(true);
      setPw("");
      pwRef.current?.focus();
    }
  }
  useEffect(() => {
    if (!unlocked) pwRef.current?.focus();
  }, [unlocked]);

  if (!unlocked) {
    return (
      <div className="sr-root">
        <div className="gate">
          <div className="gate-inner">
            <div className="gate-mark">
              <img src="/searchroom/SmartSearch_Symbol_Gold.png" alt="SmartSearch" />
            </div>
            <p className="gate-eyebrow">SmartSearch · Internal</p>
            <h2 className="gate-title">The Search Room</h2>
            <p className="gate-sub">Every live search and deck, in one place.</p>
            <div className="gate-orn">
              <span>✦</span>
            </div>
            <div className="gate-row">
              <input
                ref={pwRef}
                type="password"
                placeholder="Enter password"
                autoComplete="off"
                aria-label="Password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setPwErr(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") unlock();
                }}
              />
              <button onClick={unlock}>Enter</button>
            </div>
            <p className={"gate-err" + (pwErr ? " show" : "")}>That password doesn&apos;t match. Try again.</p>
            <p className="gate-hint">
              Access: <code>{GATE_PASSWORD}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sr-root">
      <div className="app">
        <header className="masthead">
          <div className="masthead-inner">
            <div className="brand">
              <div className="brand-mark">
                <img src="/searchroom/SmartSearch_Symbol_Gold.png" alt="SmartSearch" />
              </div>
              <div className="brand-text">
                <p className="eyebrow">SmartSearch · Operations</p>
                <h1>The Search Room</h1>
              </div>
            </div>
            <div className="head-controls">
              <div className="statstrip">
                <div className="stat live">
                  <div className="n mono">{headStats.live}</div>
                  <div className="l">Live</div>
                </div>
                <div className="stat">
                  <div className="n mono">{headStats.hold}</div>
                  <div className="l">On hold</div>
                </div>
                <div className="stat">
                  <div className="n mono">{headStats.total}</div>
                  <div className="l">Total</div>
                </div>
              </div>
              <div className="toggles">
                <span className="tg">
                  <button className="switch" aria-pressed={showClosed} aria-label="Show closed searches" onClick={() => setShowClosed((v) => !v)} /> Show closed
                </span>
                <span className="tg">
                  <button className="switch" aria-pressed={mask} aria-label="Mask candidate names" onClick={() => setMask((v) => !v)} /> Mask names
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="toolbar">
          <div className="searchbox">
            <SearchIcon />
            <input
              type="search"
              placeholder="Search by candidate, role, company, or KAM…"
              autoComplete="off"
              aria-label="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="filters">
            <select className="ctl-select" aria-label="Filter by KAM" value={kam} onChange={(e) => setKam(e.target.value)}>
              <option value="all">All KAMs</option>
              {kamOptions.map((k) => (
                <option value={k} key={k}>
                  {k}
                </option>
              ))}
            </select>
            <select className="ctl-select" aria-label="Filter by engine version" value={ev} onChange={(e) => setEv(e.target.value)}>
              <option value="all">All engine versions</option>
              {evOptions.map((v) => (
                <option value={v} key={v}>
                  {v}
                </option>
              ))}
            </select>
            <span className="spacer" />
            <span className="result-count">{resultCount}</span>
          </div>
          <div className={"legend" + (pri ? " has-sel" : "")}>
            <span className="legend-label">Filter by priority</span>
            {(["purple", "green", "red", "amber", "hold"] as const).map((p) => {
              const swatch: Record<string, string> = {
                purple: "var(--pri-purple)",
                green: "var(--ss-green)",
                red: "var(--ss-red)",
                amber: "var(--ss-amber)",
                hold: "var(--ss-grey-light)",
              };
              const label: Record<string, string> = {
                purple: "Needs a cut",
                green: "Offer in progress",
                red: "High",
                amber: "Medium",
                hold: "On hold",
              };
              return (
                <button className="sw" key={p} aria-pressed={pri === p} onClick={() => togglePri(p)}>
                  <i style={{ background: swatch[p] }} />
                  {label[p]}
                </button>
              );
            })}
          </div>
        </div>

        <main className="list" aria-live="polite">
          {listBody}
        </main>

        <p className="confline">
          <span className="orn">✦</span> SmartSearch · The Search Room · Confidential
          <span className="engine">
            EDC Engine v2.2 by <em>Sittin&apos; Pretty</em>
          </span>
        </p>
      </div>

      <div className={"toast" + (toast.show ? " show" : "")} dangerouslySetInnerHTML={{ __html: toast.html }} />
    </div>
  );
}

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
}
