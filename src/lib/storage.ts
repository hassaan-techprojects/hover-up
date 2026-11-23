
import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.NEON_STORAGE_BUCKET;

if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error("Neon Object Storage environment variables are missing.");
}

const storageEndpoint: string = endpoint;

export const storageBucket = bucket;

export const s3 = new S3Client({
  endpoint: storageEndpoint,
  region,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export function getPublicObjectUrl(key: string) {
  const baseUrl = storageEndpoint.replace(/\/+$/, "");

  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${baseUrl}/${bucket}/${encodedKey}`;
}
