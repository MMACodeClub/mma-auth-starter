# MMA Auth Starter · PHP + MySQL

**Dein eigenes Webprojekt mit MMA-Login und dauerhaft gespeicherten Daten.**

Diese öffentliche Vorlage enthält ein vollständiges Minimalprojekt: HTML, CSS und JavaScript im Frontend, PHP und MySQL im Backend. Du kannst dich anmelden, deine eigenen Notizen laden, speichern und löschen. Der zentrale Dienst [auth.mmacodeclub.ch](https://auth.mmacodeclub.ch) übernimmt Registrierung und Anmeldung. Deine Projektdaten bleiben in deiner eigenen Datenbank.

**[Eigenes Repository aus dieser Vorlage erstellen →](https://github.com/MMACodeClub/mma-auth-starter/generate)**

## 1. Dein Projekt anlegen

Klicke auf **Use this template → Create a new repository**. Klone anschliessend dein neues Repository und öffne den Projektordner:

```sh
git clone https://github.com/DEIN-ACCOUNT/DEIN-PROJEKT.git
cd DEIN-PROJEKT
```

Ersetze die Platzhalter durch deinen GitHub-Namen und deinen Projektnamen. Ein Fork ist ebenfalls möglich. Du brauchst keinen API-Key, kein JWT-Secret, keinen eigenen Mailserver und keinen Zugriff auf die Datenbank des Auth-Dienstes. Composer und npm sind nicht nötig.

## 2. Lokal starten

Wähle einen der beiden Wege. Beide starten dasselbe PHP-Projekt.

### Mit Docker Desktop

Starte Docker Desktop und führe im Projektordner aus:

```sh
docker compose up --build -d
```

Öffne **http://localhost:8000**. Compose startet PHP mit Apache und eine eigene MySQL-Datenbank, importiert `schema.sql` beim ersten Start und setzt die Konfiguration automatisch. Du musst keine Konfigurationsdatei anlegen. Beim ersten Start werden Images geladen; das kann einige Minuten dauern.

Änderungen in `public/` und `app/` werden direkt übernommen. Andere Änderungen am Image übernimmst du mit demselben Startbefehl. Hilfreiche Befehle:

```sh
docker compose logs web
docker compose down
docker compose up -d
```

`down` stoppt das Projekt; die Notizen bleiben im Volume `project-data` erhalten. Das Schema wird nur bei einer leeren Datenbank automatisch importiert. Die Demo-Zugangsdaten in `compose.yaml` sind ausschliesslich für lokale Entwicklung. MySQL ist nicht vom Host aus erreichbar; die Website wird nur an `127.0.0.1` veröffentlicht.

### Mit vorhandenem PHP und MySQL (auch MAMP/XAMPP)

Voraussetzungen: **PHP 8.1+** mit `curl` und `pdo_mysql`, dazu **MySQL 8+ oder MariaDB 10.6+**. Mit `php -m` siehst du die PHP-Erweiterungen.

1. Lege über phpMyAdmin oder dein Hosting eine leere Projektdatenbank an, z.B. `mma_projekt`, und einen Benutzer mit Zugriff darauf.
2. Importiere `schema.sql` in diese Datenbank. Sie enthält `users` (Identität ohne Passwörter) und `notes` (Notizen mit User-Zuordnung).
3. Kopiere im Projektordner die Konfiguration:

   ```sh
   cp config.example.php config.local.php
   ```

   Auf Windows kannst du die Datei im Explorer kopieren. Trage in `config.local.php` deine tatsächlichen Datenbankdaten ein. Port und Host hängen von deiner Installation ab:

   ```php
   return [
       'auth_url' => 'https://auth.mmacodeclub.ch',
       'app_origin' => 'http://localhost:8000',
       'db_dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=mma_projekt;charset=utf8mb4',
       'db_user' => 'mma_projekt',
       'db_password' => 'DEIN_DATENBANKPASSWORT',
   ];
   ```

   `config.local.php` wird von Git ignoriert und liegt ausserhalb des öffentlichen Verzeichnisses. Sie hat Vorrang vor Umgebungsvariablen.

4. Starte im Projektordner:

   ```sh
   php -S localhost:8000 -t public
   ```

5. Öffne **http://localhost:8000**. Alternativ richte in MAMP/XAMPP den Document Root auf `public/` ein und setze `app_origin` auf die dort verwendete Adresse inklusive Port.

**Frontend und API müssen über denselben PHP-fähigen Server laufen.** Live Server, GitHub Pages und `file://` führen kein PHP aus. Wechsle während der Anmeldung nicht zwischen `localhost` und `127.0.0.1`: Es sind unterschiedliche Origins.

## 3. Anmelden und ausprobieren

1. Klicke auf **Anmelden oder registrieren**.
2. Melde dich mit deinem MMA-Konto an. Für ein neues Konto brauchst du Name, E-Mail-Adresse und den Klassencode deiner Lehrperson.
3. Bestätige den Code aus der E-Mail und erlaube deinem Projekt den Zugriff auf Name, E-Mail-Adresse und Klasse.
4. Speichere eine Notiz, lade die Seite neu und lösche sie wieder.

Notizen bleiben nach einem Serverneustart erhalten. Jede Person sieht ausschliesslich ihre eigenen neuesten 100 Notizen. Mit einem zweiten Konto kannst du die Trennung ausprobieren. Abmelden beendet den Login; deine Notizen bleiben in deiner Projektdatenbank.

## Projektstruktur

```text
public/                   Einziger öffentlich erreichbarer Ordner
  index.html              Seite, Login-Button und Notizformular
  style.css               Gestaltung
  script.js               Login-Zustand und API-Aufrufe
  api/notes.php           Notizen laden, speichern und löschen
  api/.htaccess           Authorization-Header für Apache weitergeben
app/
  auth.php                Bearer-Token und Projekt-Origin prüfen
  config.php              Lokale Datei oder Umgebungsvariablen laden
config.example.php        Vorlage für deine Zugangsdaten
schema.sql                Tabellen für deine Projektdatenbank
compose.yaml              Lokaler PHP-/MySQL-Start mit Docker
Dockerfile                PHP mit Apache und PDO MySQL
```

Ersetze die Notizen durch deine Projektidee. HTML/CSS bleiben frei gestaltbar; das Backend zeigt den Ablauf für eigene API-Endpunkte und Datenbanktabellen.

## So arbeiten Login und PHP zusammen

1. `public/index.html` lädt `https://auth.mmacodeclub.ch/sdk.js` vor dem eigenen Script.
2. `mmaAuth.user()` liefert die angemeldete Person oder `null`.
3. `mmaAuth.fetch('api/notes.php')` sendet den Bearer-Token an dein Backend.
4. `app/auth.php` prüft das Token bei `GET https://auth.mmacodeclub.ch/api/me` und vergleicht die zurückgegebene `origin` mit der fest konfigurierten `app_origin`.
5. Erst dann verwendet PHP die bestätigte `user.id` für vorbereitete SQL-Abfragen. Beim Löschen werden **Notiz-ID und User-ID** geprüft.

Eine vom Browser gesendete `user_id` ist kein Identitätsnachweis. Auch gültige Tokens anderer Projekte werden abgelehnt. Jeder neue geschützte API-Endpunkt muss die Prüfung selbst ausführen:

```php
<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/../../app/auth.php';
$config = require __DIR__ . '/../../app/config.php';
$user = mma_require_user($config);

// Erst jetzt Projektdaten für $user['id'] laden oder verändern.
echo json_encode(['user' => $user], JSON_UNESCAPED_UNICODE);
```

Dieses Beispiel gehört nach `public/api/mein-endpunkt.php`. Die Notiz-API unterstützt:

| Methode | JSON-Body | Ergebnis |
| --- | --- | --- |
| `GET` | keiner | Eigene neueste 100 Notizen |
| `POST` | `{"text":"Meine Idee"}` | Notiz erstellen (1–500 Zeichen), Status 201 und aktualisierte Liste |
| `DELETE` | `{"id":123}` | Eigene Notiz löschen und aktualisierte Liste; fremde/fehlende Notiz: 404 |

Für POST und DELETE ist `Content-Type: application/json` nötig. `mmaAuth.fetch` ergänzt das Token, prüft aber den HTTP-Status nicht automatisch:

```js
const response = await mmaAuth.fetch('api/notes.php');
const data = await response.json();
if (!response.ok) throw new Error(data.error || 'Anfrage fehlgeschlagen');
```

Ein normales `fetch`, ein Formular mit `action` oder ein Link senden das Token nicht automatisch. Verwende `mmaAuth.fetch` nur für deine vertrauenswürdige API.

## SDK für eigene Funktionen

| Aufruf | Wirkung |
| --- | --- |
| `await mmaAuth.user()` | User oder `null`, ohne Weiterleitung |
| `await mmaAuth.requireLogin()` | User; startet den Login, falls nötig |
| `mmaAuth.login()` | Anmeldung starten |
| `mmaAuth.logout()` | Sitzung und zugehörige Tokens beenden, Seite neu laden |
| `await mmaAuth.fetch(url, options)` | `fetch` mit Bearer-Token |

Der User enthält `id`, `name`, `email` und `klasse`. Verwende `id` als stabilen Schlüssel für Projektdaten. `klasse` ist ein Anzeigename, keine Berechtigung.

| HTML-Attribut | Wirkung |
| --- | --- |
| `data-mma="name"` (auch `email`, `klasse`, `id`) | Kontodaten als Text anzeigen |
| `data-mma-show="in"` | Nur angemeldet anzeigen; anfangs `hidden` setzen |
| `data-mma-show="out"` | Nur abgemeldet anzeigen |
| `data-mma-login` / `data-mma-logout` | Anmeldung / Abmeldung beim Klick |

Für eine Seite mit verpflichtendem Login kannst du `<script src="https://auth.mmacodeclub.ch/sdk.js" data-require-login></script>` im `<head>` verwenden. Das Ausblenden schützt keine API und keine Dateien; vertrauliche Daten liefert erst das geprüfte Backend aus. Texte aus Benutzereingaben mit `textContent` einsetzen.

## Auf einem Hosting veröffentlichen

1. PHP mit cURL und PDO MySQL sowie eine eigene MySQL-/MariaDB-Datenbank bereitstellen.
2. `schema.sql` in die Projektdatenbank importieren.
3. Dateien hochladen und `config.local.php` mit den echten Zugangsdaten anlegen.
4. **Document Root auf `public/` setzen.** `app/`, Konfiguration und SQL-Datei bleiben ausserhalb des Webroots.
5. `app_origin` exakt auf deine HTTPS-Origin setzen, z.B. `https://mein-projekt.example`, ohne Pfad oder abschliessenden Schrägstrich. `auth_url` bleibt `https://auth.mmacodeclub.ch`.
6. Deine Domain unter [Mein Konto](https://auth.mmacodeclub.ch/konto#domains) freischalten; Sonderfälle mit der Lehrperson klären.
7. Login, Speicherung und Trennung zwischen zwei Konten auf dem Hosting prüfen.

Bei festem Webroot legst du den Inhalt von `public/` dort ab, Konfiguration und `app/` ausserhalb. Passe dann die beiden `require`-Pfade in den API-Dateien an. Lade nicht den ganzen Repository-Ordner ins Webroot.

Lokal sind `localhost`, `127.0.0.1` und `::1` beim Auth-Dienst freigeschaltet. Online brauchst du HTTPS. Eine Origin besteht aus Schema, Host und optional Port. Pfade trennen Projekte im Auth-System nicht: Verwende möglichst eine eigene Subdomain pro Projekt. Das Beispiel erwartet Frontend und API unter derselben Origin.

Apache reicht mit `public/api/.htaccess` den Authorization-Header weiter. Bei Nginx/PHP-FPM oder gesperrten `.htaccess`-Direktiven muss dein Hosting den Header in der Serverkonfiguration weitergeben. Das Backend benötigt ausgehenden HTTPS-Zugriff zum Auth-Dienst.

## Häufige Probleme

| Problem | Prüfen / lösen |
| --- | --- |
| Port 8000 belegt | Anderen Port wählen und `app_origin` passend ändern; bei Docker auch die Portzuordnung |
| Konfiguration fehlt (503) | `config.local.php` anlegen oder Docker Compose verwenden |
| Datenbank nicht verfügbar (503) | Zugangsdaten, Host, Port und importiertes Schema prüfen |
| API liefert HTML statt JSON | PHP-Server und richtigen API-Pfad verwenden; kein Live Server |
| API liefert 401 | `mmaAuth.fetch` verwenden; abmelden und erneut anmelden |
| API liefert 403 | `app_origin` mit der Browseradresse vergleichen, inklusive Schema und Port |
| PHP erkennt kein Token | Weitergabe des Authorization-Headers beim Hosting prüfen |
| Adresse nicht freigeschaltet | Domain im Konto eintragen oder Lehrperson fragen |
| Klassencode fehlt / Klasse geschlossen | Lehrperson fragen |
| Login-Mail fehlt | Spam und E-Mail-Adresse prüfen; bei Versandfehler Lehrperson informieren |
| Docker startet nicht | Docker Desktop starten, dann `docker compose logs` prüfen |

## Tests und Grenzen

Die PHP-Integrationstests verwenden erfundene Konten und einen lokalen Auth-Testserver. Sie prüfen echte MySQL-Abfragen, User-Trennung, Token- und Origin-Prüfung sowie Fehlerfälle, ohne Login-Mails zu senden:

```sh
docker compose exec -T web php < tests/integration.php
```

Der Test legt eine separate Testdatenbank an und entfernt sie danach. Dafür nutzt er nur die lokalen Demo-Zugangsdaten aus Compose; niemals gegen eine Produktivdatenbank ausführen. Benötigt werden eine laufende Compose-Umgebung und das lokal vorhandene Testscript.

Diese Vorlage ist ein Lernstart. Eigene Rollen, Freigaben, Backups und Aufbewahrung ergänzt du für dein Projekt. Eine Kontolöschung beim Auth-Dienst löscht nicht automatisch deine Projektdaten. Abmelden beendet auch zugehörige Projekt-Tokens derselben Auth-Sitzung. Tokens und Zugangsdaten gehören weder in Logs noch ins Repository. Ist die Tokenprüfung nicht möglich, liefert das Backend keine geschützten Daten aus.

## Lizenz

[MIT](LICENSE). Die Lizenz betrifft diese Vorlage; der zentrale Auth-Dienst wird separat betrieben.
