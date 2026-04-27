/**
 * One-off recovery: delete Kay Wyrwich's corrupt edit overlay on nor-swf-svp.
 *
 * Background: Kay's enriched fixture (commit 2dfd439) renders fine on its own.
 * An edit-then-Reset session left a malformed overlay at the path below, which
 * applyEditOverlays then re-applies on every load — crashing IntroCard render.
 *
 * Usage: BLOB_READ_WRITE_TOKEN=<token> node scripts/cleanup-kay-overlay.mjs
 *   (or `dotenv -e .env.local -- node scripts/cleanup-kay-overlay.mjs`)
 *
 * Guardrails (vs. cleanup-ktj-blobs.mjs):
 *   - Prefix is the full filename, not the directory — save handler uses
 *     addRandomSuffix:false so the canonical pathname is exact. A broader
 *     prefix risks catching unrelated blobs if naming evolves.
 *   - Prints all matches and waits for `yes` before any del() call.
 */

import { list, del } from "@vercel/blob";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const PREFIX = "edits/nor-swf-svp/kay-wyrwich.json";

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Error: BLOB_READ_WRITE_TOKEN env var is required");
    process.exit(1);
  }

  console.log(`Listing blobs with prefix: ${PREFIX}`);

  const matched = [];
  let cursor;
  do {
    const result = await list({ prefix: PREFIX, cursor });
    matched.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  if (matched.length === 0) {
    console.log("No blobs found with that prefix.");
    return;
  }

  console.log(`\nMatched ${matched.length} blob(s):`);
  for (const blob of matched) {
    console.log(`  - ${blob.pathname} (${blob.url})`);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`\nType "yes" to delete the above: `);
  rl.close();

  if (answer !== "yes") {
    console.log("Aborted.");
    return;
  }

  let deleted = 0;
  for (const blob of matched) {
    console.log(`Deleting: ${blob.pathname} (${blob.url})`);
    await del(blob.url);
    console.log(`Deleted: ${blob.pathname}`);
    deleted++;
  }

  console.log(`\nDone. Deleted ${deleted} blob(s).`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
