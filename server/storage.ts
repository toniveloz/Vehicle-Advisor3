// Supabase Storage helpers for backend uploads and URL resolution.
// Files are stored in Supabase and served via /manus-storage/{key} compatibility URLs.

import { ENV } from "./_core/env";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_BUCKET = ENV.supabaseStorageBucket || "vehicle-photos";

function getSupabaseClient() {
  const url = ENV.supabaseUrl;
  const serviceKey = ENV.supabaseServiceRoleKey;
  if (!url || !serviceKey) {
    throw new Error("Supabase storage not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function parseStorageKey(value: string): string | null {
  let normalized = value.trim();
  if (normalized.startsWith("/manus-storage/")) {
    return normalized.replace(/^\/manus-storage\//, "");
  }
  try {
    const url = new URL(normalized, "http://localhost");
    const path = url.pathname;
    if (path.startsWith("/manus-storage/")) {
      return path.replace(/^\/manus-storage\//, "");
    }
  } catch {
    // not a full URL
  }
  return null;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const supabase = getSupabaseClient();

  // Convert data to Uint8Array if needed
  let body: Uint8Array | Buffer;
  if (typeof data === "string") body = Buffer.from(data);
  else if (data instanceof Uint8Array) body = data as Uint8Array;
  else body = Buffer.from(data as Buffer);

  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(key, body, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // Keep compatibility with existing paths; proxy will resolve /manus-storage/:key
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_BUCKET;

  // createSignedUrl returns { signedURL, expiry }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 60);
  if (error || !data?.signedUrl) {
    throw new Error(`Supabase createSignedUrl failed: ${error?.message ?? "no url"}`);
  }
  return data.signedUrl;
}

export async function storageRemove(relKey: string): Promise<void> {
  const key = parseStorageKey(relKey) ?? normalizeKey(relKey);
  const supabase = getSupabaseClient();
  const bucket = SUPABASE_BUCKET;
  const { error } = await supabase.storage.from(bucket).remove([key]);
  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}
