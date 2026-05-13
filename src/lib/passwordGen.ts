// 8-char mixed-case alphanumeric, ambiguous characters excluded (0, O, 1, I, l).
// 57 chars × 8 ≈ 47 bits entropy — more than enough for a polite gate.
// ASCII-only; the delivery channel is copy-paste into outbound email.
const CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

// Reject bytes above the largest multiple of CHARSET.length that fits in 256
// to avoid modulo bias. With 57 chars, MAX_UNBIASED = 228, so ~10.9% of bytes
// are rejected and re-sampled.
const MAX_UNBIASED = Math.floor(256 / CHARSET.length) * CHARSET.length;

export function generateAccessPassword(length = 8): string {
  let out = '';
  // Pull bytes in batches and rejection-sample for unbiased distribution.
  while (out.length < length) {
    const batch = new Uint8Array(length * 2);
    crypto.getRandomValues(batch);
    for (let i = 0; i < batch.length && out.length < length; i++) {
      if (batch[i] < MAX_UNBIASED) {
        out += CHARSET[batch[i] % CHARSET.length];
      }
    }
  }
  return out;
}
