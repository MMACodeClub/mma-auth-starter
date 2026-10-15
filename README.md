# MMA Auth Starter

Dein Projekt mit **HTML, CSS, JavaScript, PHP und einer Hostpoint-Datenbank**. Der [MMA-Login](https://auth.mmacodeclub.ch) ist eingebaut. Als Beispiel kannst du eigene Notizen speichern und löschen.

## 1. Eigenes Repository erstellen

Klicke auf **[Use this template → Create a new repository](https://github.com/MMACodeClub/mma-auth-starter/generate)**. Lade dein neues Repository auf deinen Computer und öffne den Projektordner im Editor.

Du brauchst eine Projektadresse mit HTTPS, einen SFTP-Zugang und eine Datenbank bei Hostpoint. Die Angaben erhältst du von deiner Lehrperson oder im Hostpoint Control Panel. Verwende für dein Projekt eine eigene Domain oder Subdomain.

## 2. Datenbank bei Hostpoint vorbereiten

1. Öffne im Hostpoint Control Panel **Datenbanken** und wähle deine Projektdatenbank bzw. lege eine neue an.
2. Öffne dazu **phpMyAdmin**, wähle die Datenbank und importiere über **Importieren** die Datei `schema.sql`.
3. Halte Datenbankhost, Datenbankname, Datenbankbenutzer und Passwort bereit. Verwende den Hostnamen aus dem Control Panel.

Das Schema erstellt `users` für die Zuordnung zum MMA-Konto und `notes` für die Notizen.

## 3. Konfiguration ausfüllen

Kopiere `config.example.php` und nenne die Kopie **`config.php`**. Trage dort ein:

| Einstellung | Dein Wert |
| --- | --- |
| `app_origin` | Deine HTTPS-Projektadresse, z.B. `https://mein-projekt.ch`, ohne Pfad und ohne `/` am Ende |
| `db_host` | Datenbankhost aus Hostpoint |
| `db_name` | Name deiner Projektdatenbank |
| `db_user` | Zugewiesener Datenbankbenutzer |
| `db_password` | Passwort dieses Datenbankbenutzers |

`auth_url` bleibt unverändert. **`config.php` wird von Git ignoriert.** Lade sie separat per SFTP hoch; Zugangsdaten gehören ausschliesslich in diese Datei.

## 4. Per SFTP hochladen

1. Richte im Hostpoint Control Panel unter **Websites** die Projektadresse ein. Wähle PHP 8.1 oder neuer und aktiviere HTTPS.
2. Setze das **Document-Root** (Startverzeichnis der Website) auf `www/dein-projekt/public`. Ersetze `dein-projekt` durch deinen tatsächlichen Projektordner.
3. Verbinde dich mit deinem SFTP-Programm mit Hostpoint. Verwende die erhaltenen SFTP-Zugangsdaten und Port **22**. Der SSH-Zugang muss bei Hostpoint aktiviert sein.
4. Lade die Ordner **`app/`**, **`public/`** und deine **`config.php`** nach `www/dein-projekt/` hoch. Übertrage auch die versteckte Datei `public/api/.htaccess`.

Die Struktur auf Hostpoint sieht danach so aus:

```text
www/dein-projekt/
├── app/
│   ├── auth.php
│   └── load-config.php
├── config.php
└── public/             ← Document-Root deiner Website
    ├── index.html
    ├── style.css
    ├── script.js
    └── api/
        ├── .htaccess
        └── notes.php
```

Nur `public/` ist über die Projektadresse erreichbar. `config.php` und `app/` bleiben ausserhalb. `schema.sql` brauchst du nur für den Import; README, Vorlage und Git-Dateien müssen nicht auf den Webserver.

Hostpoint-Hilfe: [Document-Root](https://support.hostpoint.ch/de/produkte/webhosting/erste-schritte/wo-liegt-das-document-root-meiner-website) · [SFTP-Zugang](https://support.hostpoint.ch/de/produkte/webhosting/erste-schritte/wie-verbinde-ich-mich-via-ftp-sftp-auf-meinen-server)

## 5. Login und Notizen ausprobieren

1. Trage deine Projektdomain unter [Mein Konto → Domains](https://auth.mmacodeclub.ch/konto#domains) ein. Falls nötig, hilft deine Lehrperson.
2. Öffne deine HTTPS-Projektadresse und klicke auf **Anmelden oder registrieren**. Für ein neues Konto brauchst du den Klassencode deiner Lehrperson und den Bestätigungscode aus der E-Mail.
3. Erlaube deinem Projekt den Zugriff auf deine Kontodaten. Speichere eine Notiz, lade die Seite neu und lösche sie wieder.

Jede Person sieht nur ihre eigenen neuesten 100 Notizen. Sie bleiben in deiner Hostpoint-Datenbank gespeichert, auch nach dem Abmelden.

## Dein eigenes Projekt bauen

- **`public/index.html`**: Inhalt und Aufbau deiner Seite.
- **`public/style.css`**: Gestaltung.
- **`public/script.js`**: Funktionen im Browser. `mmaAuth.fetch('api/notes.php')` sendet den Login an PHP.
- **`public/api/notes.php`**: Notizen laden, speichern und löschen. Vorlage für deine eigenen API-Endpunkte.

Jeder geschützte PHP-Endpunkt muss zuerst `app/auth.php` und `app/load-config.php` laden und `mma_require_user($config)` aufrufen. Verwende danach die geprüfte `$user['id']` für deine Datenbankabfragen. Die Prüfung kontrolliert auch, ob das Token zu deinem Projekt gehört. Benutzereingaben im Browser mit `textContent` anzeigen.

## Wenn etwas nicht klappt

| Problem | Prüfen |
| --- | --- |
| Konfiguration fehlt | Liegt `config.php` neben `app/` und `public/` auf Hostpoint? |
| Datenbank nicht verfügbar | Stimmen die vier Datenbankangaben und ist `schema.sql` importiert? |
| Login nicht erlaubt / API liefert 403 | Domain freigeschaltet? Stimmt `app_origin` exakt mit deiner Projektadresse überein? |
| API liefert 401 | Abmelden und erneut anmelden; API mit `mmaAuth.fetch` aufrufen. Ist `.htaccess` hochgeladen? |
| Startseite fehlt | Zeigt das Document-Root auf den Ordner `public/`? |

[MIT-Lizenz](LICENSE)
