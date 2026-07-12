import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sendRouter from './routes/send';
import aiImportRouter from './routes/aiImport';
import aiImportPdfRouter from './routes/aiImportPdf';
import aiTranslateRouter from './routes/aiTranslate';
import assetsRouter from './routes/assets';
import templatesRouter from './routes/templates';
import categoriesRouter from './routes/categories';
import settingsRouter from './routes/settings';
import { checkJwt } from './middleware/auth';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/send', checkJwt, sendRouter);
app.use('/ai/import-image', checkJwt, aiImportRouter);
app.use('/ai/import-pdf', checkJwt, aiImportPdfRouter);
app.use('/ai/translate', checkJwt, aiTranslateRouter);
app.use('/assets', checkJwt, assetsRouter);
app.use('/templates', checkJwt, templatesRouter);
app.use('/categories', checkJwt, categoriesRouter);
app.use('/settings', checkJwt, settingsRouter);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
