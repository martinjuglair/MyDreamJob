/**
 * File storage abstraction.
 *
 * - In dev (local), uses the filesystem under /uploads (gitignored).
 * - In production (Vercel + Supabase), uses Supabase Storage bucket "cv".
 *
 * Selection is based on the presence of SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * If both env vars are set, Supabase Storage is used. Otherwise filesystem.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const BUCKET = "cv";

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Save a file. Returns a key (path/identifier) that can be passed to `readFile`.
 * The same key works across both backends.
 */
export async function saveFile(
  fileName: string,
  buffer: Buffer | Uint8Array,
  contentType = "application/pdf"
): Promise<string> {
  const supabase = getSupabase();
  const key = `uploads/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (supabase) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType, upsert: true });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return key;
  }

  // Filesystem fallback (local dev)
  const localPath = join(process.cwd(), key);
  await fs.mkdir(join(process.cwd(), "uploads"), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return key;
}

/**
 * Read a file previously saved with `saveFile`. Returns the binary content.
 */
export async function readFile(key: string): Promise<Buffer> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) {
      throw new Error(`Supabase download failed: ${error?.message || "no data"}`);
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Filesystem fallback
  const localPath = join(process.cwd(), key);
  return fs.readFile(localPath);
}

/**
 * True if a file exists at this key.
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await readFile(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a public URL or signed URL to fetch the file from the browser.
 * For Supabase: returns a signed URL valid 1 hour.
 * For filesystem: returns the static path (served by Next.js public/uploads).
 */
export async function getPublicUrl(key: string): Promise<string> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, 3600); // 1h
    if (error || !data) throw new Error(`Sign URL failed: ${error?.message}`);
    return data.signedUrl;
  }

  return `/${key}`; // /uploads/...
}

/**
 * Returns true if we are using Supabase Storage (i.e. running on Vercel
 * with credentials configured).
 */
export function isUsingSupabaseStorage(): boolean {
  return getSupabase() !== null;
}
