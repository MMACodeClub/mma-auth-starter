import express from 'express';
import { fileURLToPath } from 'node:url';
import { requireUser } from './mma-auth.js';

export function createApp(options = {}) {
  const app = express();
  const guard = requireUser({
    authUrl: options.authUrl || process.env.MMA_AUTH_URL || 'https://auth.mmacodeclub.ch',
    appOrigin: options.appOrigin || process.env.APP_ORIGIN || 'http://localhost:3000',
    fetchImpl: options.fetchImpl,
  });
  // Nur ein Lernbeispiel: Bei einem Neustart verschwinden diese Notizen.
  // Ersetze die Map für dauerhafte Daten durch eine Datenbank mit user_id.
  const notes = new Map();
  app.disable('x-powered-by');
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', guard);
  app.use(express.json({ limit: '10kb' }));
  app.get('/api/notes', (req, res) => res.json(notes.get(req.user.id) || []));
  app.post('/api/notes', (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || [...text].length > 500) {
      return res.status(400).json({ error: 'Bitte gib einen Text mit 1–500 Zeichen ein.' });
    }
    const ownNotes = notes.get(req.user.id) || [];
    if (ownNotes.length >= 100) return res.status(400).json({ error: 'Das Lernbeispiel erlaubt höchstens 100 Notizen pro Person.' });
    ownNotes.unshift({ id: crypto.randomUUID(), text });
    // req.body.user_id wird bewusst nie verwendet.
    notes.set(req.user.id, ownNotes);
    res.status(201).json(ownNotes);
  });
  app.all('/api/notes', (req, res) => res.set('Allow', 'GET, POST').status(405).json({ error: 'Methode nicht unterstützt.' }));
  app.use((error, req, res, next) => {
    const status = error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ error: status === 500 ? 'Serverfehler.' : 'Ungültige oder zu grosse Anfrage.' });
  });
  return app;
}
