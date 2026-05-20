import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      endpoint: process.env["S3_ENDPOINT"],
      region: "auto",
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
  }
  return _s3;
}

const BUCKET = () => requireEnv("S3_BUCKET");
const PUBLIC_URL = () => (process.env["S3_PUBLIC_URL"] ?? "").replace(/\/$/, "");

export async function uploadToStorage(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<{ key: string; url: string }> {
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${randomUUID()}${ext}`;
  await getS3().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
  const url = `${PUBLIC_URL()}/${key}`;
  return { key, url };
}

export async function deleteFromStorage(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(getS3(), new GetObjectCommand({ Bucket: BUCKET(), Key: key }), { expiresIn });
}
