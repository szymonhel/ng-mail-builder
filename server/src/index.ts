import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sendRouter from './routes/send';
import { apiKeyAuth } from './middleware/auth';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:4200',
    methods: ['POST'],
  })
);

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/send', apiKeyAuth, sendRouter);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
