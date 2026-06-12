import { describe, it, expect } from "vitest";
import {
  buildSearches,
  computePriority,
  hasOfferStageCandidate,
  type RawCandidate,
  type RawSearch,
  type SearchData,
} from "./lib";

function rawSearch(overrides: Partial<RawSearch> = {}): RawSearch {
  return {
    k: "acme-cfo",
    co: "Acme",
    r: "CFO",
    st: "active",
    brief: true,
    pw: false,
    ev: "v2",
    ...overrides,
  };
}
function cand(overrides: Partial<RawCandidate> = {}): RawCandidate {
  return { n: "Dana Lopez", ds: "active", ...overrides };
}

describe("computePriority", () => {
  it("closed / hold lifecycle → 'hold' band regardless of pipeline", () => {
    expect(computePriority("closed", 0, false)).toBe("hold");
    expect(computePriority("closed", 5, true)).toBe("hold");
    expect(computePriority("hold", 3, false)).toBe("hold");
  });

  it("offer in progress → 'green' (outranks everything but hold)", () => {
    expect(computePriority("active", 0, true)).toBe("green");
    expect(computePriority("high", 4, true)).toBe("green");
  });

  it("no one on deck → 'purple' (needs a cut, highest), even at high priority", () => {
    expect(computePriority("active", 0, false)).toBe("purple");
    expect(computePriority("high", 0, false)).toBe("purple");
  });

  it("high priority + sourced → 'red'", () => {
    expect(computePriority("high", 1, false)).toBe("red");
    expect(computePriority("high", 9, false)).toBe("red");
  });

  it("active + sourced → 'amber'", () => {
    expect(computePriority("active", 1, false)).toBe("amber");
  });
});

describe("hasOfferStageCandidate", () => {
  it("is false for the current deck_status set (no offer signal yet)", () => {
    expect(hasOfferStageCandidate([cand({ ds: "active" }), cand({ ds: "rejected" })])).toBe(false);
    expect(hasOfferStageCandidate([])).toBe(false);
  });

  it("lights up once a candidate carries the future 'offer' deck_status", () => {
    // Cast mirrors the fast-follow: 'offer' added to the deck_status set.
    expect(hasOfferStageCandidate([cand({ ds: "offer" as RawCandidate["ds"] })])).toBe(true);
  });
});

describe("buildSearches — read-time priority", () => {
  it("ignores any stale stored band and derives from status + pipeline", () => {
    const data: SearchData = {
      searches: [
        // active, well-sourced (≥1 on deck), no offer → amber
        rawSearch({ k: "don-ghc", st: "active" }),
        // high priority but unsourced → purple (needs a cut)
        rawSearch({ k: "hlcn-ops-dir", st: "high" }),
        // active but unsourced → purple
        rawSearch({ k: "rch-hme", st: "active" }),
        // high + sourced → red
        rawSearch({ k: "sourced-high", st: "high" }),
        // closed → hold
        rawSearch({ k: "done", st: "closed" }),
      ],
      candidates: {
        "don-ghc": [cand(), cand(), cand(), cand(), cand()], // 5 on deck
        "sourced-high": [cand()],
        // hlcn-ops-dir, rch-hme: no candidates at all
      },
    };
    const byKey = Object.fromEntries(buildSearches(data).map((s) => [s.k, s.pri]));
    expect(byKey["don-ghc"]).toBe("amber");
    expect(byKey["hlcn-ops-dir"]).toBe("purple");
    expect(byKey["rch-hme"]).toBe("purple");
    expect(byKey["sourced-high"]).toBe("red");
    expect(byKey["done"]).toBe("hold");
  });

  it("assigns every live search a band — no orphans", () => {
    const data: SearchData = {
      searches: [rawSearch({ k: "a", st: "high" }), rawSearch({ k: "b", st: "active" })],
      candidates: {},
    };
    const bands = buildSearches(data).map((s) => s.pri);
    expect(bands.every((b) => b != null)).toBe(true);
  });
});
