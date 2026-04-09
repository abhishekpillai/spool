import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { processTranscodeJob } from './jobs/transcode.js';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const worker = new Worker('transcode', processTranscodeJob, {
  connection,
  concurrency: 2,
  limiter: {
    max: 2,
    duration: 1000,
  },
});

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed for video ${job.data.videoId}`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

worker.on('progress', (job, progress) => {
  console.log(`[worker] Job ${job.id} progress: ${progress}%`);
});

console.log('[worker] Spool transcoding worker started');

process.on('SIGTERM', async () => {
  console.log('[worker] Shutting down...');
  await worker.close();
  process.exit(0);
});
