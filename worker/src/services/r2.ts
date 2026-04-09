import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { readFile } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { readdir } from 'fs/promises';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function downloadFromR2(key: string, destPath: string): Promise<void> {
  const { Body } = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!Body) throw new Error(`Empty body for key: ${key}`);
  await pipeline(Body as Readable, createWriteStream(destPath));
}

export async function uploadToR2(filePath: string, key: string, contentType?: string): Promise<void> {
  const body = await readFile(filePath);
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function uploadDirectoryToR2(dirPath: string, prefix: string): Promise<void> {
  const entries = await readdir(dirPath, { withFileTypes: true, recursive: true });

  const uploads = entries
    .filter((e) => e.isFile())
    .map(async (entry) => {
      const fullPath = path.join(entry.parentPath || entry.path, entry.name);
      const relativePath = path.relative(dirPath, fullPath);
      const key = `${prefix}${relativePath}`;

      const contentType = entry.name.endsWith('.m3u8')
        ? 'application/vnd.apple.mpegurl'
        : entry.name.endsWith('.ts')
          ? 'video/MP2T'
          : 'application/octet-stream';

      await uploadToR2(fullPath, key, contentType);
    });

  await Promise.all(uploads);
}
