import { S3Client } from "@aws-sdk/client-s3";

function getStorageConfig() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.NEON_STORAGE_BUCKET;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Neon Object Storage environment variables are missing.");
  }

  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

export const storageBucket = process.env.NEON_STORAGE_BUCKET ?? "";

let client: S3Client | undefined;

function getS3Client(): S3Client {
  if (client) return client;

  const { endpoint, region, accessKeyId, secretAccessKey } = getStorageConfig();
  client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

// Created on first use so importing this module never fails at build time
// when storage credentials aren't present (e.g. Preview builds).
export const s3 = new Proxy({} as S3Client, {
  get(_target, property) {
    const instance = getS3Client();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function getPublicObjectUrl(key: string) {
  const { endpoint, bucket } = getStorageConfig();
  const baseUrl = endpoint.replace(/\/+$/, "");

  const encodedKey = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${baseUrl}/${bucket}/${encodedKey}`;
}
