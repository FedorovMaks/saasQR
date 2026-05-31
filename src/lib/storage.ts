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

/**
 * Read an env var and strip invisible junk (BOM U+FEFF, zero-width chars,
 * nbsp, control chars) plus surrounding whitespace. Some tools (e.g.
 * PowerShell piping) prepend an invisible BOM to the value, which breaks
 * bucket names, keys and URLs.
 */
function cleanEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  let out = "";
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    const isInvisible =
      code === 0xfeff || // BOM
      code === 0x2060 || // word joiner
      code === 0x00a0 || // nbsp
      (code >= 0x200b && code <= 0x200f) || // zero-width / bidi
      code < 0x20; // C0 control chars
    if (!isInvisible) out += ch;
  }
  out = out.trim();
  return out || undefined;
}

let cachedClient: S3Client | null = null;

function bucketName(): string | undefined {
  return cleanEnv("YANDEX_S3_BUCKET");
}

export function getStorageClient(): S3Client | null {
  const accessKeyId = cleanEnv("YANDEX_S3_ACCESS_KEY_ID");
  const secretAccessKey = cleanEnv("YANDEX_S3_SECRET_ACCESS_KEY");
  const bucket = bucketName();

  if (!accessKeyId || !secretAccessKey || !bucket) return null;

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: cleanEnv("YANDEX_S3_REGION") || "ru-central1",
      endpoint: cleanEnv("YANDEX_S3_ENDPOINT") || DEFAULT_ENDPOINT,
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
  const bucket = bucketName();
  if (!client || !bucket) return null;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const endpoint = cleanEnv("YANDEX_S3_ENDPOINT") || DEFAULT_ENDPOINT;
  const base = (
    cleanEnv("YANDEX_S3_PUBLIC_URL") || `${endpoint}/${bucket}`
  ).replace(/\/+$/, "");

  return `${base}/${key}`;
}
