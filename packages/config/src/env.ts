import { z } from 'zod';

export const baseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url(),
});

export const workerEnvSchema = baseEnvSchema.extend({
  REDIS_URL: z.string().min(1),
  DEEPGRAM_API_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;
