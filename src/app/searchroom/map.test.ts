import { describe, it, expect } from "vitest";
import { mapToBoard, priorityFor, type DbCandidate, type DbSearch } from "./map";

function search(overrides: Partial<DbSearch> = {}): DbSearch {
  return {
    id: "s1",
    search_key: "acme-cfo",
    client: "Acme",
    client_display_name: null,
    position: "CFO",
    role_title: null,
    industry: "Industrial",
    location: "London",
    kam: "Phil",
    candidate_generator: "Kalum",
    client_contact: "Jane",
    engine_version: "v2",
    access_password: null,
    status: "high",
    priority: "needs_cut",
    updated_at: "2026-06-10T00:00:00Z",
    ...overrides,
  };
}
function cand(overrides: Partial<DbCandidate> = {}): DbCandidate {
  return {
    search_id: "s1",
    candidate_name: "Dana Lopez",
    current_title: "VP Finance",
    current_company: "Globex",
    location: "Leeds",
    deck_status: "active",
    candidate_slug: "dana-lopez",
    consultant: "Phil",
    updated_at: "2026-06-09T00:00:00Z",
    ...overrides,
  };
}

describe("priorityFor", () => {
  it("maps the DB band to the board colour token", () => {
    expect(priorityFor("needs_cut", "high")).toBe("purple");
    expect(priorityFor("offer", "active")).toBe("green");
    expect(priorityFor("high", "active")).toBe("red");
    expect(priorityFor("medium", "active")).toBe("amber");
    expect(priorityFor("hold", "hold")).toBe("hold");
  });
  it("falls back to a status-derived band when priority is null/unknown", () => {
    expect(priorityFor(null, "high")).toBe("red");
    expect(priorityFor(null, "active")).toBe("amber");
    expect(priorityFor(null, "hold")).toBe("hold");
    expect(priorityFor(null, "closed")).toBe("hold");
    expect(priorityFor("garbage", "high")).toBe("red");
  });
});

describe("mapToBoard", () => {
  it("maps search columns to the board shape", () => {
    const { searches } = mapToBoard([search()], []);
    expect(searches[0]).toMatchObject({
      k: "acme-cfo",
      co: "Acme",
      r: "CFO",
      st: "high",
      ind: "Industrial",
      kam: "Phil",
      cg: "Kalum",
      cc: "Jane",
      ev: "v2",
      pri: "purple",
      brief: true,
      pw: false,
    });
  });

  it("prefers display name / role_title and reflects password presence", () => {
    const { searches } = mapToBoard(
      [search({ client_display_name: "Acme Group", role_title: "Group CFO", access_password: "secret" })],
      [],
    );
    expect(searches[0].co).toBe("Acme Group");
    expect(searches[0].r).toBe("Group CFO");
    expect(searches[0].pw).toBe(true);
  });

  it("groups candidates by their parent search key and passes deck_status through", () => {
    const { candidates } = mapToBoard([search()], [cand(), cand({ candidate_name: "Sam Vo", deck_status: "rejected" })]);
    expect(candidates["acme-cfo"]).toHaveLength(2);
    expect(candidates["acme-cfo"][0]).toMatchObject({ n: "Dana Lopez", ds: "active", sl: "dana-lopez", cons: "Phil" });
    expect(candidates["acme-cfo"][1].ds).toBe("rejected");
  });

  it("coerces unknown/null deck_status to 'none' and skips orphaned candidates", () => {
    const { candidates } = mapToBoard(
      [search()],
      [cand({ deck_status: null }), cand({ search_id: "ghost", candidate_name: "Orphan" })],
    );
    expect(candidates["acme-cfo"]).toHaveLength(1); // orphan dropped
    expect(candidates["acme-cfo"][0].ds).toBe("none");
  });

  it("falls back engine_version and company when missing", () => {
    const { searches } = mapToBoard([search({ engine_version: null, client: null, client_display_name: null })], []);
    expect(searches[0].ev).toBe("—");
    expect(searches[0].co).toBe("acme-cfo"); // last-resort = search_key
  });
});
