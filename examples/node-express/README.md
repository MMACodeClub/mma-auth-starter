# Node / Express: eigene API mit MMA-Login

Ein Frontend und eine API auf demselben Node-Server. Das Backend prüft das Token und seine Origin vor jedem Zugriff. Notizen werden pro User-ID getrennt.

## Starten

Voraussetzung: Node.js 22 oder neuer und npm.

Vom Repository-Hauptordner aus:

```sh
cd examples/node-express
npm ci
cp .env.example .env
npm start
```

Auf Windows kannst du `.env.example` im Explorer als `.env` kopieren. Öffne **http://localhost:3000**, melde dich an und lege eine Notiz an. Für die Registrierung brauchst du den Klassencode deiner Lehrperson.

**Die Notizen liegen nur im Arbeitsspeicher. Ein Neustart löscht sie.** Es gibt absichtlich keine Datenbank-Einrichtung in diesem Beispiel. Für dauerhafte Daten kannst du SQLite, MySQL oder PostgreSQL ergänzen und weiterhin nach der geprüften `req.user.id` filtern. Maximal 100 Notizen pro Person sind in dieser Demo erlaubt.

## Dateien

| Datei | Aufgabe |
| --- | --- |
| `public/index.html`, `style.css`, `script.js` | Oberfläche; API-Aufrufe über `mmaAuth.fetch` |
| `server.js` | Server starten |
| `app.js` | Geschützte Notiz-Endpunkte und Beispiel-Speicher |
| `mma-auth.js` | Bearer-Token beim Dienst prüfen und Projekt-Origin vergleichen |
| `.env` | Lokale Konfiguration; wird nicht eingecheckt |
| `test/auth.test.js` | Tests mit lokalem Auth-Testserver |

## Konfiguration

| Variable | Lokal | Online |
| --- | --- | --- |
| `PORT` | `3000` | Interner Port deines Hostings |
| `APP_ORIGIN` | `http://localhost:3000` | z.B. `https://mein-projekt.example` |
| `MMA_AUTH_URL` | `https://auth.mmacodeclub.ch` | Bleibt unverändert |

`APP_ORIGIN` ist die Adresse des Frontends, ohne Pfad oder abschliessenden Schrägstrich. Änderst du lokal den Port, passe auch diese Variable an. Eine andere Origin wird absichtlich mit 403 abgewiesen.

## Eigene Endpunkte

Alle `/api`-Routen sind durch die Middleware geschützt. Nach der Prüfung steht `req.user` zur Verfügung:

```js
app.get('/api/meine-daten', (req, res) => {
  // Diese Route in app.js NACH app.use('/api', guard) einfügen.
  // In deiner DB: SELECT ... WHERE user_id = req.user.id
  res.json({ name: req.user.name });
});
```

Das Frontend ruft sie mit `mmaAuth.fetch('/api/meine-daten')` auf. Sende die User-ID nicht als Beweis aus dem Frontend mit; sie kommt bereits aus der geprüften Antwort des Auth-Service.

## Veröffentlichen, beispielsweise mit Coolify

1. Das eigene Git-Repository verbinden.
2. `examples/node-express` als Basisverzeichnis setzen, wenn du die Ordnerstruktur beibehältst. Alternativ den Inhalt dieses Ordners als eigenes Projekt verwenden.
3. Eine Node-22+-Laufzeit verwenden, mit `npm ci` installieren und mit `npm start` starten.
4. Internen Port `3000`, HTTPS-Domain und `APP_ORIGIN` setzen.
5. Domain beim Auth-Service freischalten und deployen.

Die Dateien in `public/` werden durch Express ausgeliefert. Für diese Variante ist kein zusätzlicher Live Server nötig. Es müssen keine SMTP-Zugangsdaten und kein Admin-Passwort des Auth-Service hinterlegt werden.

## Tests

```sh
npm test
```

Die Tests prüfen fehlende und ungültige Tokens, falsche Projekt-Origins, Ausfall des Auth-Service, Eingabevalidierung und getrennte Notizen zweier Personen. Sie versenden keine E-Mails und verändern keine Daten im zentralen Dienst.

Zurück zur [vollständigen Anleitung](../../README.md).
