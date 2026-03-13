import { createClient } from "@/lib/supabase/client";

// Storage bucket names
export const BUCKETS = {
  QUESTIONS: "questions",
  PASSAGES: "passages",
  UPLOADS: "uploads",
} as const;

// Base URL for public storage (cached via Supabase CDN)
const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

/**
 * Get public URL for a question image (cached)
 * @param path - Path like "mathematical-reasoning/MR_001_q.png"
 */
export function getQuestionImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${STORAGE_URL}/${BUCKETS.QUESTIONS}/${path}`;
}

/**
 * Get public URL for a passage image (cached)
 * @param path - Path like "RD_P_001.png"
 */
export function getPassageImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${STORAGE_URL}/${BUCKETS.PASSAGES}/${path}`;
}

/**
 * Upload a file to storage
 * @param bucket - Bucket name
 * @param path - Full path including filename
 * @param file - File to upload
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600", // Cache for 1 hour
    upsert: true, // Overwrite if exists
  });

  if (error) {
    return { url: null, error: error.message };
  }

  // Return public URL
  const url = `${STORAGE_URL}/${bucket}/${path}`;
  return { url, error: null };
}

/**
 * Upload multiple files to storage
 * @param bucket - Bucket name
 * @param files - Array of { path, file }
 */
export async function uploadFiles(
  bucket: string,
  files: Array<{ path: string; file: File }>
): Promise<{
  successful: Array<{ path: string; url: string }>;
  failed: Array<{ path: string; error: string }>;
}> {
  const successful: Array<{ path: string; url: string }> = [];
  const failed: Array<{ path: string; error: string }> = [];

  await Promise.all(
    files.map(async ({ path, file }) => {
      const result = await uploadFile(bucket, path, file);
      if (result.error) {
        failed.push({ path, error: result.error });
      } else if (result.url) {
        successful.push({ path, url: result.url });
      }
    })
  );

  return { successful, failed };
}

/**
 * Delete a file from storage
 * @param bucket - Bucket name
 * @param path - Full path including filename
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Get a signed URL for private files (uploads bucket)
 * @param path - Full path including filename
 * @param expiresIn - Seconds until URL expires (default 60)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 60
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKETS.UPLOADS)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Generate storage path for question images
 * @param subjectSlug - e.g., "mathematical-reasoning"
 * @param questionCode - e.g., "MR_001"
 * @param type - "q" for question, "a"/"b"/"c"/"d" for options, "s1".."sN" for solution images
 * @param extension - File extension (default "png")
 */
export function generateQuestionImagePath(
  subjectSlug: string,
  questionCode: string,
  type: string,
  extension: string = "png"
): string {
  return `${subjectSlug}/${questionCode}_${type}.${extension}`;
}

/**
 * Generate storage path for passage images
 * @param passageCode - e.g., "RD_P_001"
 * @param extension - File extension (default "png")
 */
export function generatePassageImagePath(
  passageCode: string,
  extension: string = "png"
): string {
  return `${passageCode}.${extension}`;
}

/**
 * Generate storage path for upload files
 * @param batchId - Upload batch UUID
 * @param filename - Original filename
 */
export function generateUploadPath(batchId: string, filename: string): string {
  return `${batchId}/${filename}`;
}
