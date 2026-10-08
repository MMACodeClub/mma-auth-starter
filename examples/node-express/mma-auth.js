// Token immer beim zentralen Service prüfen. User-ID und Origin aus dieser
// Antwort verwenden, niemals eine User-ID aus dem Formular übernehmen.
export function requireUser({ authUrl, appOrigin, fetchImpl = fetch }) {
  const expectedOrigin = new URL(appOrigin).origin;
  if (expectedOrigin !== appOrigin) throw new Error('APP_ORIGIN muss eine Origin ohne Pfad sein.');
  return async (req, res, next) => {
    const authorization = req.get('authorization') || '';
    if (!/^Bearer [A-Za-z0-9_-]{20,200}$/.test(authorization)) {
      return res.status(401).json({ error: 'Bitte melde dich an.' });
    }
    try {
      const response = await fetchImpl(new URL('/api/me', authUrl), {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ error: 'Dein Login ist abgelaufen. Bitte melde dich erneut an.' });
      }
      if (!response.ok) throw new Error('Auth-Service nicht verfügbar');
      const data = await response.json();
      if (data.origin !== expectedOrigin) {
        return res.status(403).json({ error: 'Dieses Token gehört zu einem anderen Projekt.' });
      }
      if (!data.user || typeof data.user.id !== 'string' || !data.user.id) throw new Error('Ungültige Auth-Antwort');
      req.user = data.user;
      next();
    } catch {
      res.status(502).json({ error: 'Der Login-Service ist gerade nicht erreichbar. Bitte versuche es später nochmals.' });
    }
  };
}
