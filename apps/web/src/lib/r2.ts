import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function createPresignedUploadUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

export async function createMultipartUpload(key: string): Promise<string> {
  const { UploadId } = await r2.send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key }),
  );
  return UploadId!;
}

export async function getPartUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[],
) {
  await r2.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  await r2.send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
    }),
  );
}

export async function deleteR2Objects(keys: string[]) {
  if (keys.length === 0) return;
  await r2.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}

export async function deleteR2Prefix(prefix: string) {
  const { Contents } = await r2.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }),
  );
  if (!Contents?.length) return;
  await deleteR2Objects(Contents.map((c) => c.Key!));
}

export { r2, BUCKET };
