import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createR2Client } from "@/lib/r2/client";
import { getR2Config } from "@/lib/r2/config";

export function avatarObjectKey(userId: string, extension: string) {
  return `avatars/${userId}/avatar.${extension}`;
}

export function submissionObjectKey(
  userId: string,
  enrollmentId: string,
  phaseId: string,
  extension: string,
) {
  return `submissions/${userId}/${enrollmentId}/${phaseId}/original.${extension}`;
}

export function submissionPreviewPdfKey(
  userId: string,
  enrollmentId: string,
  phaseId: string,
) {
  return `submissions/${userId}/${enrollmentId}/${phaseId}/preview.pdf`;
}

export function supportAttachmentKey(ticketId: string, extension: string) {
  return `support/${ticketId}/attachment.${extension}`;
}

export function supportReplyAttachmentKey(
  ticketId: string,
  replyId: string,
  extension: string,
) {
  return `support/${ticketId}/reply-${replyId}.${extension}`;
}

export function editalAttachmentKey(
  editalId: string,
  attachmentId: string,
  extension: string,
) {
  return `editais/${editalId}/${attachmentId}.${extension}`;
}

export function isR2ObjectKey(path: string) {
  return (
    path.startsWith("avatars/") ||
    path.startsWith("submissions/") ||
    path.startsWith("support/") ||
    path.startsWith("editais/")
  );
}

export async function putR2Object(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  const config = getR2Config();
  if (!config) {
    return { ok: false as const, error: "R2 não configurado." };
  }

  const client = createR2Client();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao enviar arquivo.";
    return { ok: false as const, error: message };
  }
}

export async function deleteR2Object(key: string) {
  const config = getR2Config();
  if (!config) return;

  const client = createR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export async function getR2SignedDownloadUrl(key: string, expiresInSeconds = 120) {
  const config = getR2Config();
  if (!config) {
    return { ok: false as const, error: "R2 não configurado." };
  }

  const client = createR2Client();
  try {
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );
    return { ok: true as const, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arquivo indisponível.";
    return { ok: false as const, error: message };
  }
}

export async function getR2ObjectStream(key: string) {
  const config = getR2Config();
  if (!config) {
    return { ok: false as const, error: "R2 não configurado." };
  }

  const client = createR2Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      return { ok: false as const, error: "Arquivo vazio." };
    }

    return {
      ok: true as const,
      body: response.Body,
      contentType: response.ContentType ?? "application/octet-stream",
      cacheControl: response.CacheControl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arquivo indisponível.";
    return { ok: false as const, error: message };
  }
}
