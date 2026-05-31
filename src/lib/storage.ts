import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Object storage for user uploads (menu images, venue logos).
 *
 * Uses Yandex Object Storage via the S3-compatible protocol. Configure with
 * env vars (set them in Vercel, never commit):
 *   YANDEX_S3_ACCESS_KEY_ID
 *   YANDEX_S3_SECRET_ACCESS_KEY
 *   YANDEX_S3_BUCKET
 *   YANDEX_S3_ENDPOINT     (optional, default https://storage.yandexcloud.net)
 *   YANDEX_S3_PUBLIC_URL   (optional, e.g. a CDN/custom domain base)
 *
 * Being S3-compatible, this also works with any other S3 provider (R2, AWS,
 * Selectel, etc.) by changing endpoint + region.
 */

const DEFAULT_ENDPOINT = "https://storage.yandexcloud.net";

let cachedClient: S3Client | null = null;

export function getStorageClient(): S3Client | null {
  const accessKeyId = process.env.YANDEX_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.YANDEX_S3_SECRET_ACCESS_KEY;
  const bucket = process.env.YANDEX_S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !bucket) return null;

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.YANDEX_S3_REGION || "ru-central1",
      endpoint: process.env.YANDEX_S3_ENDPOINT || DEFAULT_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return cachedClient;
}

export function isStorageConfigured(): boolean {
  return getStorageClient() !== null;
}

/**
 * Upload a file and return its public URL, or null if storage isn't configured.
 */
export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getStorageClient();
  const bucket = process.env.YANDEX_S3_BUCKET;
  if (!client || !bucket) return null;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const endpoint = process.env.YANDEX_S3_ENDPOINT || DEFAULT_ENDPOINT;
  const base = (
    process.env.YANDEX_S3_PUBLIC_URL || `${endpoint}/${bucket}`
  ).replace(/\/+$/, "");

  return `${base}/${key}`;
}
