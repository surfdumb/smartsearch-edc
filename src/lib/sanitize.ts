/**
 * Strip UI artifacts that leak into contentEditable values from browser
 * extensions (grammar assistants, writing helpers). The "Say more" suffix
 * has been observed in Carlie's saves on don-ci-na.
 */
export function stripArtifacts(s: string | null | undefined): string {
  if (s == null) return "";
  return s.replace(/\s*Say more\s*$/i, "").trim();
}

/** Recursively strip artifacts from every string value in an object/array. */
export function stripArtifactsDeep<T>(v: T): T {
  if (typeof v === "string") return stripArtifacts(v) as unknown as T;
  if (Array.isArray(v)) return v.map(stripArtifactsDeep) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      out[k] = stripArtifactsDeep(x);
    }
    return out as unknown as T;
  }
  return v;
}
