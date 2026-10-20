import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createR2Client } from "@/lib/r2/client";
import { getR2Config } from "@/lib/r2/config";

export type R2BucketUsage = {
  configured: boolean;
  bucket: string;
  objectCount: number;
  totalBytes: number;
  error?: string;
};

export async function measureR2BucketUsage(): Promise<R2BucketUsage> {
  const config = getR2Config();
  if (!config) {
    return {
      configured: false,
      bucket: "",
      objectCount: 0,
      totalBytes: 0,
      error: "R2 não configurado (variáveis R2_* na Vercel).",
    };
  }

  const client = createR2Client();
  let objectCount = 0;
  let totalBytes = 0;
  let continuationToken: string | undefined;

  try {
    for (let page = 0; page < 500; page += 1) {
      const output = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          ContinuationToken: continuationToken,
        }),
      );

      for (const item of output.Contents ?? []) {
        objectCount += 1;
        totalBytes += item.Size ?? 0;
      }

      if (!output.IsTruncated || !output.NextContinuationToken) break;
      continuationToken = output.NextContinuationToken;
    }

    return {
      configured: true,
      bucket: config.bucket,
      objectCount,
      totalBytes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar objetos.";
    return {
      configured: true,
      bucket: config.bucket,
      objectCount: 0,
      totalBytes: 0,
      error: message,
    };
  }
}
