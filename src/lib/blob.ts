import { upload } from "@vercel/blob/client";
import type { PutBlobResult } from "@vercel/blob";

/** Upload a file to Vercel Blob via client upload (bypasses 4.5MB server limit) */
export async function uploadFile(
  pathname: string,
  file: File,
): Promise<PutBlobResult> {
  return upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
  });
}

/** List blobs under a prefix */
export async function listBlobs(
  prefix: string,
): Promise<
  { url: string; pathname: string; size: number; uploadedAt: string }[]
> {
  const res = await fetch(
    `/api/blob/list?prefix=${encodeURIComponent(prefix)}`,
  );
  if (!res.ok) throw new Error("Failed to list blobs");
  const data = await res.json();
  return data.blobs;
}

/** Delete a blob by URL */
export async function deleteBlob(url: string): Promise<void> {
  const res = await fetch(
    `/api/blob/delete?url=${encodeURIComponent(url)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete blob");
}
