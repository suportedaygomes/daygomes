import { S3Client } from "@aws-sdk/client-s3";
import { getR2Config } from "@/lib/r2/config";

export function createR2Client() {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 não configurado.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}
