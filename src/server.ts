import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { notificationQueue } from './queue.js';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(express.json());

// Define exactly what a valid notification request looks like
const notificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  channel: z.enum(['email', 'sms', 'push'], {
    message: "Channel must be 'email', 'sms', or 'push'"
  }),
  recipient: z.string().email('Invalid email address format'),
  content: z.string().min(1, 'Content cannot be empty'),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
});

app.post('/v1/notifications', async (req: Request, res: Response) => {
  // 1. Validate the payload against our schema
  const validation = notificationSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({ 
      error: 'Invalid payload', 
      details: validation.error.format() 
    });
    return;
  }

  // 2. Destructure the safely parsed, strongly-typed data
  const { userId, channel, recipient, content, idempotencyKey } = validation.data;

  try {
    const job = await notificationQueue.add(
      `send-${channel}`,
      { userId, channel, recipient, content },
      { jobId: idempotencyKey }
    );

    res.status(202).json({
      message: 'Notification request accepted and queued.',
      jobId: job.id,
    });
  } catch (error: any) {
    if (error.message.includes('jobId')) {
      res.status(409).json({ error: 'Duplicate transaction key flagged.' });
      return;
    }
    res.status(500).json({ error: 'Internal pipeline error.' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', message: 'API Gateway is online!' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Ingestion engine listening on http://localhost:${PORT}`);
});