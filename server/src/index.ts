import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sendRouter from './routes/send';
import aiImportRouter from './routes/aiImport';
import aiImportPdfRouter from './routes/aiImportPdf';
import aiChatRouter from './routes/aiChat';
import aiTranslateRouter from './routes/aiTranslate';
import assetsRouter from './routes/assets';
import templatesRouter from './routes/templates';
import categoriesRouter from './routes/categories';
import blockPresetsRouter from './routes/blockPresets';
import settingsRouter from './routes/settings';
import apiKeysRouter from './routes/apikeys';
import historyRouter from './routes/history';
import { checkJwt } from './middleware/auth';
import { apiKeyOrJwt } from './middleware/apiKeyAuth';

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

// External services may authenticate /send and /templates with an X-Api-Key header;
// inside those routers, key-authenticated requests are limited to POST /send/template
// and GET /templates/:id/contract. Everything else is Auth0-only.
app.use('/send', apiKeyOrJwt, sendRouter);
app.use('/ai/import-image', checkJwt, aiImportRouter);
app.use('/ai/import-pdf', checkJwt, aiImportPdfRouter);
app.use('/ai/chat', checkJwt, aiChatRouter);
app.use('/ai/translate', checkJwt, aiTranslateRouter);
app.use('/assets', checkJwt, assetsRouter);
app.use('/templates', apiKeyOrJwt, templatesRouter);
app.use('/categories', checkJwt, categoriesRouter);
app.use('/block-presets', checkJwt, blockPresetsRouter);
app.use('/settings', checkJwt, settingsRouter);
app.use('/apikeys', checkJwt, apiKeysRouter);
app.use('/history', checkJwt, historyRouter);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
