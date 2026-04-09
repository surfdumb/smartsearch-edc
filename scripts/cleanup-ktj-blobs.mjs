/**
 * One-off cleanup script: delete all Vercel Blob objects with prefix edits/ktj-cor-ctl/
 *
 * Usage: BLOB_READ_WRITE_TOKEN=<token> node scripts/cleanup-ktj-blobs.mjs
 *
 * Or if .env.local has the token:
 *   node -e "require('dotenv').config({path:'.env.local'})" && node scripts/cleanup-ktj-blobs.mjs
 */

import { list, del } from "@vercel/blob";

const PREFIX = "edits/ktj-cor-ctl/";

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Error: BLOB_READ_WRITE_TOKEN env var is required");
    process.exit(1);
  }

  console.log(`Listing blobs with prefix: ${PREFIX}`);

  let cursor;
  let totalDeleted = 0;

  do {
    const result = await list({ prefix: PREFIX, cursor });

    for (const blob of result.blobs) {
      console.log(`Deleting: ${blob.pathname} (${blob.url})`);
      await del(blob.url);
      totalDeleted++;
    }

    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  if (totalDeleted === 0) {
    console.log("No blobs found with that prefix.");
  } else {
    console.log(`\nDone. Deleted ${totalDeleted} blob(s).`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
