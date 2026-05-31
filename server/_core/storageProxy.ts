import type { Express } from "express";
import { ENV } from "./env";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = ENV.supabaseUrl;
  const serviceKey = ENV.supabaseServiceRoleKey;
  if (!url || !serviceKey) throw new Error("Supabase not configured");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const bucket = ENV.supabaseStorageBucket || "vehicle-photos";
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 60);
      if (error || !data?.signedUrl) {
        console.error("[StorageProxy] supabase error:", error?.message ?? data);
        res.status(502).send("Storage backend error");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, data.signedUrl);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
