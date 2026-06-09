/**
 * Deterministic pre-resolution for crowded search namespaces.
 *
 * Some clients run several sibling searches whose interview titles differ only
 * by a qualifier ("Managed Access", "Corporate Accounts", "VP"). The V2 IV
 * Engine's LLM resolver has misrouted these at high confidence (9 Jun 2026:
 * Clinigen Managed Access interviews written to cgn-bdd), so for known crowded
 * namespaces we derive the expected search_key straight from the Granola title
 * and cross-check the LLM's resolution against it.
 *
 * The deterministic layer can only CONFIRM or BLOCK a resolution — never
 * redirect it. The envelope's edc_data was generated against the LLM-chosen
 * search's config (criteria names, role title), so re-pointing the write would
 * put the wrong criteria on the right deck. On disagreement the caller must
 * refuse the write and surface a disambiguation email instead.
 */

export type DeterministicRule = {
  /** Human-readable rule name, used in logs and resolution notes. */
  label: string;
  pattern: RegExp;
  search_key: string;
};

export type CrowdedNamespace = {
  /** Display name for logs ("Clinigen BD"). */
  client: string;
  /** Gate: the namespace applies only when the title matches this. */
  clientPattern: RegExp;
  /** Ordered by precedence — first matching rule wins. */
  rules: DeterministicRule[];
};

export type DeterministicHit = {
  search_key: string;
  client: string;
  rule: string;
};

/**
 * Per-client title-qualifier maps. To onboard another crowded namespace,
 * append an entry. Rules must require a qualifying token — never map on the
 * client pattern alone, or titles for the client's OTHER searches (e.g. a
 * Clinigen HR search) would be force-routed into this namespace.
 */
const CROWDED_NAMESPACES: CrowdedNamespace[] = [
  {
    client: 'Clinigen BD',
    clientPattern: /clinigen/i,
    rules: [
      { label: 'managed access', pattern: /managed\s+access/i, search_key: 'cgn-ma-bd' },
      { label: 'corporate accounts', pattern: /corporate\s+accounts?/i, search_key: 'cgn-bd-corp' },
      { label: 'vp', pattern: /\bvp\b/i, search_key: 'cgn-vp-bd-csm' },
      { label: 'csm / bare BD stem', pattern: /\b(csm|bdd?|business\s+development)\b/i, search_key: 'cgn-bdd' },
    ],
  },
];

/**
 * Resolve an interview title against the crowded-namespace maps.
 * Returns null when no namespace or no rule matches — callers then fall
 * through to the LLM resolution + confidence gate as normal.
 */
export function deterministicResolve(
  title: string | null | undefined
): DeterministicHit | null {
  if (!title) return null;

  for (const ns of CROWDED_NAMESPACES) {
    if (!ns.clientPattern.test(title)) continue;
    for (const rule of ns.rules) {
      if (rule.pattern.test(title)) {
        return { search_key: rule.search_key, client: ns.client, rule: rule.label };
      }
    }
  }

  return null;
}
