import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import nodemailer from 'nodemailer';

// Aligned with the payload from src/server.ts
interface NotificationJobData {
  userId: string;
  channel: string;
  recipient: string;
  content: string;
  ttlSeconds?: number;
}

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

connection.on('connect', () => console.log('🔌 Connected to Redis!'));
connection.on('error', (err) => console.error('❌ Redis Error:', err.message));

const DEFAULT_OTP_TTL_MS = 5 * 60 * 1000;

export const worker = new Worker<NotificationJobData>(
  'notification-jobs', // Locked in to match src/queue.ts
  async (job: Job<NotificationJobData>) => {
    const jobAge = Date.now() - job.timestamp;
    const maxAge = (job.data.ttlSeconds ? job.data.ttlSeconds * 1000 : DEFAULT_OTP_TTL_MS);

    if (jobAge > maxAge) {
      console.warn(`⚠️ [Job ${job.id}] Discarded: Exceeded TTL threshold (${Math.round(jobAge / 1000)}s old).`);
      return { status: 'expired', skipped: true };
    }

    console.log(`[Job ${job.id}] Processing ${job.data.channel} notification for User ${job.data.userId}...`);

    await sendNotificationWithProvider({
      to: job.data.recipient,
      content: job.data.content,
      idempotencyKey: job.id,
    });

    console.log(`✅ [Job ${job.id}] Successfully delivered.`);
    return { status: 'delivered' };
  },
  { 
    connection, 
    concurrency: 5 
  }
);

worker.on('failed', (job, err) => {
  if (job) {
    console.error(`💥 [Job ${job.id}] Exhausted all attempts. Final error: ${err.message}`);
  }
});

async function sendNotificationWithProvider(payload: {
  to: string;
  content: string;
  idempotencyKey?: string;
}) {
  // Create a test Ethereal account automatically for local development preview
  let testAccount = await nodemailer.createTestAccount();

  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  let info = await transporter.sendMail({
    from: '"Notification Engine" <engine@local.test>',
    to: payload.to,
    subject: 'Your Security Code / Notification',
    text: payload.content,
    headers: {
      'X-Entity-Ref-ID': payload.idempotencyKey || '', // Provider-side deduplication header
    },
  });

  console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
}