# MMA Auth Starter

Dein Projekt mit **HTML, CSS, JavaScript, PHP und einer Hostpoint-Datenbank**. Der [MMA-Login](https://auth.mmacodeclub.ch) ist eingebaut. Als Beispiel kannst du eigene Notizen speichern und löschen. Beni, das MMACodeClub-Maskottchen, begrüsst dich auf der Startseite.

## 1. Eigenes Repository erstellen

Klicke auf **[Use this template → Create a new repository](https://github.com/MMACodeClub/mma-auth-starter/generate)**. Lade dein neues Repository auf deinen Computer und öffne den Projektordner im Editor.

Du brauchst eine Projektadresse mit HTTPS, einen SFTP-Zugang und eine Datenbank bei Hostpoint. Die Angaben erhältst du von deiner Lehrperson oder im Hostpoint Control Panel. Verwende für dein Projekt eine eigene Domain oder Subdomain.

## 2. Datenbank bei Hostpoint vorbereiten

1. Öffne im Hostpoint Control Panel **Datenbanken** und wähle deine Projektdatenbank bzw. lege eine neue an.
2. Öffne dazu **phpMyAdmin**, wähle die Datenbank und importiere über **Importieren** die Datei `schema.sql`.
3. Halte Datenbankhost, Datenbankname, Datenbankbenutzer und Passwort bereit. Verwende den Hostnamen aus dem Control Panel.

Das Schema erstellt `users` mit der stabilen MMA-User-ID und `notes` für die Notizen. Namen und E-Mail-Adressen werden dafür nicht in deine Datenbank kopiert. Auth-IDs sind ASCII; beide ID-Spalten unterscheiden Gross-/Kleinschreibung ausdrücklich mit `ascii_bin`. Gültige Auth-IDs bestehen aus `u_` und 16 Kleinbuchstaben/Ziffern aus dem vereinbarten Auth-Alphabet; PHP prüft dieses Format vor dem Datenbankzugriff.

## 3. Konfiguration ausfüllen

Kopiere `config.example.php` und nenne die Kopie **`config.php`**. Trage dort ein:

| Einstellung | Dein Wert |
| --- | --- |
| `app_origin` | Deine HTTPS-Projektadresse, z.B. `https://mein-projekt.ch`, ohne Pfad und ohne `/` am Ende |
| `db_host` | Datenbankhost aus Hostpoint |
| `db_name` | Name deiner Projektdatenbank |
| `db_user` | Zugewiesener Datenbankbenutzer |
| `db_password` | Passwort dieses Datenbankbenutzers |

`auth_url` bleibt unverändert. Beide Adressen müssen exakte HTTPS-Origins sein: kleingeschriebene Domains ohne Pfad, abschliessenden `/`, Standardport `:443`, Query, Fragment oder Benutzername/Passwort. PHP weist fehlerhafte Konfigurationen mit 503 ab. **`config.php` wird von Git ignoriert.** Lade sie separat per SFTP hoch; Zugangsdaten gehören ausschliesslich in diese Datei.

## 4. Per SFTP hochladen

1. Richte im Hostpoint Control Panel unter **Websites** die Projektadresse ein. Wähle PHP 8.1 oder neuer und aktiviere HTTPS.
2. Setze das **Document-Root** (Startverzeichnis der Website) auf `www/dein-projekt/public`. Ersetze `dein-projekt` durch deinen tatsächlichen Projektordner.
3. Verbinde dich mit deinem SFTP-Programm mit Hostpoint. Verwende die erhaltenen SFTP-Zugangsdaten und Port **22**. Der SSH-Zugang muss bei Hostpoint aktiviert sein.
4. Lade die Ordner **`app/`**, **`public/`** und deine **`config.php`** nach `www/dein-projekt/` hoch. Übertrage auch die versteckten Dateien **`public/.htaccess`** und **`public/api/.htaccess`**. Die erste setzt Sicherheitsheader für die HTML-Seite, die zweite reicht den Authorization-Header an PHP weiter.

Die Struktur auf Hostpoint sieht danach so aus:

```text
www/dein-projekt/
├── app/
│   ├── auth.php
│   ├── config-validation.php
│   ├── db.php
│   ├── http.php
│   └── load-config.php
├── config.php
└── public/             ← Document-Root deiner Website
    ├── .htaccess       ← Sicherheitsheader auch für HTML
    ├── index.html
    ├── beni.png        ← Unser Maskottchen
    ├── style.css
    ├── script.js
    └── api/
        ├── .htaccess
        └── notes.php
```

Nur `public/` ist über die Projektadresse erreichbar. `config.php` und `app/` bleiben ausserhalb. `schema.sql` brauchst du nur für den Import; README, Vorlage und Git-Dateien müssen nicht auf den Webserver.

Hostpoint-Hilfe: [Document-Root](https://support.hostpoint.ch/de/produkte/webhosting/erste-schritte/wo-liegt-das-document-root-meiner-website) · [SFTP-Zugang](https://support.hostpoint.ch/de/produkte/webhosting/erste-schritte/wie-verbinde-ich-mich-via-ftp-sftp-auf-meinen-server)

## 5. Login und Notizen ausprobieren

1. Neu dabei? [Erstelle dein MMA-Konto](https://auth.mmacodeclub.ch/registrieren) mit dem Klassencode deiner Lehrperson und trage im Feld **Domain deines Projekts** deine Projektdomain ein. Bestätige den Code aus der E-Mail. Hast du schon ein Konto, ergänze die Domain unter [Mein Konto → Domains](https://auth.mmacodeclub.ch/konto#domains). Für Adressen auf `*.mmacodeclub.ch` musst du nichts eintragen.
2. Öffne deine HTTPS-Projektadresse, melde dich an und erlaube deinem Projekt den Zugriff auf deine Kontodaten.
3. Speichere eine Notiz, lade die Seite neu und lösche sie wieder.

Jede Person kann höchstens **100 eigene Notizen** speichern. Das Backend prüft dieses Limit auch bei gleichzeitigen Anfragen aus mehreren Tabs. Sie bleiben in deiner Hostpoint-Datenbank gespeichert, auch nach dem Abmelden.

## Dein eigenes Projekt bauen

- **`public/index.html`**: Inhalt und Aufbau deiner Seite.
- **`public/style.css`**: Gestaltung.
- **`public/script.js`**: Funktionen im Browser. `mmaAuth.fetch('api/notes.php')` sendet den Login an PHP.
- **`public/api/notes.php`**: Notizen laden, speichern und löschen. Vorlage für deine eigenen API-Endpunkte.

Für deine Projektidee ergänzt du eine Tabelle in `schema.sql` mit `user_id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin` und einem Fremdschlüssel auf `users(id)`. Importiere die neue Tabelle auch in deine Hostpoint-Datenbank; eine Änderung an der Datei allein ändert die Datenbank nicht.

Nimm `public/api/notes.php` als Vorlage für deinen Endpunkt:

- `mma_require_user($config)` prüft den Login und ob das Token zu deinem Projekt gehört.
- `mma_db($config, $user)` verbindet die Datenbank und übernimmt die geprüfte Person in `users`.
- `read_json()` liest ein JSON-Objekt als Array, auch verschachtelte Objekte. Welche Felder erlaubt sind, prüfst du im Endpunkt.

Ein kleiner Lese-Endpunkt für die bestehenden Notizen sieht so aus:

```php
<?php
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/db.php';
$config = require __DIR__ . '/../../app/load-config.php';
$user = mma_require_user($config);

$pdo = mma_db($config, $user);
$query = $pdo->prepare('SELECT id, text FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 100');
$query->execute([$user['id']]);
echo json_encode($query->fetchAll(), JSON_UNESCAPED_UNICODE);
```

Beim Lesen, Ändern und Löschen filterst du immer nach der geprüften `$user['id']`; beim Speichern setzt du sie als `user_id`. Verwende im Frontend `mmaAuth.fetch()` für deine API und `textContent` für Benutzereingaben.

Die Helfer in `app/` sind für **JSON-APIs**, nicht für HTML-Seiten: `http.php` setzt beim Laden die JSON-Header. Fehler liefern eine JSON-Meldung (Verbindungsfehler: 503; Abfragefehler und sonstige Ausnahmen: 500). Bei unbehandelten Ausnahmen stehen Fehlertyp und Fundstelle im PHP-Fehlerlog auf dem Server. Dafür brauchst du kein eigenes `try/catch`.

## Wenn etwas nicht klappt

| Problem | Prüfen |
| --- | --- |
| Konfiguration fehlt | Liegt `config.php` neben `app/` und `public/` auf Hostpoint? |
| Keine Verbindung zur Datenbank (503) | Stimmen die vier Datenbankangaben in `config.php`? |
| Datenbankabfrage fehlgeschlagen (500) | Ist die Tabelle importiert? Stimmen Tabellen- und Spaltennamen in deiner SQL-Abfrage? |
| Login nicht erlaubt / API liefert 403 | Domain freigeschaltet? Stimmt `app_origin` exakt mit deiner Projektadresse überein? |
| API liefert 401 | Abmelden und erneut anmelden; API mit `mmaAuth.fetch` aufrufen. Ist `.htaccess` hochgeladen? |
| «Das Backend liefert keine gültige Notizliste» | Läuft die Seite lokal, z.B. mit Live Server? PHP und Datenbank dieses Starters laufen bei Hostpoint. Teste auf deiner HTTPS-Projektadresse. |
| Startseite fehlt | Zeigt das Document-Root auf den Ordner `public/`? |

## Verstehen, wo was passiert

Das Lernrezept [Login und persönliche Notizen](https://auth.mmacodeclub.ch/lernen) zeigt Browser → MMA Auth-Service → eigenes PHP-Backend → eigene MySQL-Datenbank. Es trennt Anmeldung und Speichern und zeigt auch abgelaufene Logins und fremde Notiz-IDs. Die Demo ist ausdrücklich eine Browser-Simulation mit künstlichen Tokens.

Das Formular im Browser auszublenden schützt keine Daten. Dein PHP-Backend prüft bei **jeder** Anfrage den Login und die genaue Projektadresse. Der Auth-Service speichert keine Projektnotizen.

## Verhalten bei Fehlern

- Bei 401/403 schliesst die private Ansicht. Angezeigte Notizen und der Entwurf werden entfernt.
- API-Anfragen haben ein Zeitlimit von 10 Sekunden; der serverseitige Auth-Aufruf hat 5 Sekunden. Während einer Schreibaktion sind Speichern und Löschen gemeinsam gesperrt.
- Vor dem Löschen fragt der Browser nach. Der tatsächliche Zugriffsschutz bleibt der Nutzerfilter in PHP.
- Nach einer unterbrochenen oder unklar beantworteten Schreibanfrage erscheint **„Speicherstatus unklar – zuerst neu laden“**. Weitere Schreibaktionen bleiben gesperrt. Auch wenn die Antwort fehlt, kann die Notiz bereits gespeichert sein. Neu laden und die Liste prüfen; kein automatischer zweiter Speicherversuch.
- `mmaAuth.fetch()` sendet Tokens nur an die eigene Projektadresse und folgt keinen Weiterleitungen. Für Drittanbieter-APIs verwendest du `fetch()` ohne Login-Token.

## SDK-Version und bestehende Projekte aktualisieren

Die Vorlage lädt **`/sdk/v1.1.0.js`** mit einem SHA-384-Integritätswert (`integrity`) und `crossorigin="anonymous"`. Diese Version bleibt unverändert. Für ein SDK-Update werden Adresse **und** Integritätswert in `public/index.html` bewusst gemeinsam ersetzt. Der Auth-Service veröffentlicht die Werte unter `/sdk/releases.json`. Die unversionierte `/sdk.js` bleibt für bestehende Integrationen verfügbar und erhält zentrale Korrekturen.

**Reihenfolge für diese Änderung:** Zuerst den Auth-Service mit der neuen SDK-Version veröffentlichen und deren Erreichbarkeit prüfen, dann den Starter aktualisieren. Eine noch nicht veröffentlichte Version kann der Browser nicht laden.

Bei einer **bestehenden Datenbank nach der ursprünglichen Starter-Struktur**:

1. Sichere deine Projektdatenbank.
2. Prüfe [migrations/2026-11-auth-ids.sql](migrations/2026-11-auth-ids.sql). Die Migration setzt die ursprünglichen Tabellen und den automatisch vergebenen Fremdschlüsselnamen `notes_ibfk_1` voraus. Bei eigener Struktur zuerst anpassen. Sie entfernt die Spalten `name` und `email` und vereinheitlicht die ID-Spalten; Notizen bleiben erhalten. MySQL-DDL führt implizite Commits aus.
3. Importiere die geprüfte Migration in einem Wartungsfenster und lade danach die neuen PHP-Dateien hoch. Bis beides passt, bleiben API-Anfragen geschlossen. `schema.sql` allein aktualisiert bestehende Tabellen nicht.
4. Prüfe Anmeldung, eigene Notizen und Löschen. Bestehende Projekte mit mehr als 100 Notizen behalten diese; weitere Notizen sind erst unterhalb des Limits möglich.

Es werden keine Datenbanken automatisch migriert.

## Automatisierte Prüfungen für die Vorlage

Für Tests brauchst du Node >=22 und PHP >=8.1 mit cURL/PDO-MySQL. Node und Docker werden **nicht** für dein Hostpoint-Projekt benötigt.

```sh
npm ci
npx playwright install chromium
npm test                 # Browser: private Ansicht, Schreibsperre, Abbruch, Bestätigung
npm run test:integration  # echtes PHP + kurzlebiger, isolierter MySQL-Dockercontainer
npm run test:headers      # tatsächliche HTML-Header mit lokalem Apache
```

Die Integrationstests verwenden ausschliesslich künstliche Konten, eine temporäre HTTPS-Auth-Gegenstelle mit eigener Test-CA und eine neue MySQL-Testdatenbank. Sie prüfen zwei Nutzer, fremde Notiz-IDs, Projektbindung, Auth-Ausfälle, ungültige Konfiguration, parallele Anfragen am Limit und die Migration. Echte `config.php` und Projektdatenbanken werden nicht gelesen oder verändert. Testcontainer und temporäre Dateien werden entfernt. Standardimage: `mysql:8.4.13`; über `MMA_TEST_MYSQL_IMAGE` austauschbar. Die Containerdaten liegen im RAM.

Der Apache-Test verwendet auf macOS `/usr/sbin/httpd` und `/usr/libexec/apache2`; andere Installationen können `MMA_TEST_HTTPD` und `MMA_TEST_APACHE_MODULES` setzen. Die angegebene `TypesConfig` setzt `/etc/apache2/mime.types` voraus.

[MIT-Lizenz](LICENSE)
