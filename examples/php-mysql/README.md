# PHP / MySQL: dauerhafte Notizen mit MMA-Login

Dieses Beispiel speichert Notizen in **deiner eigenen Projektdatenbank**. Der zentrale Dienst bestätigt nur, wer eine Anfrage stellt. Das PHP-Backend prüft zusätzlich, ob das Token zur konfigurierten Projekt-Origin gehört.

## Voraussetzungen

- PHP 8.1 oder neuer, mit `curl` und `pdo_mysql`.
- Eine MySQL-8- oder MariaDB-10.6+-Datenbank, z.B. in deiner lokalen Entwicklungsumgebung oder auf deinem Hosting.
- Datenbankname, Benutzer und Passwort für dieses Projekt.
- Ein MMA-Konto bzw. einen Klassencode für die erste Registrierung.

Die vorhandenen PHP-Erweiterungen kannst du mit `php -m` anzeigen. Du brauchst kein Composer und kein npm.

## 1. Projektdatenbank vorbereiten

Lege über phpMyAdmin oder dein Hosting eine **leere Projektdatenbank** an, beispielsweise `mma_projekt`, und einen Benutzer mit Zugriff auf diese Datenbank. Importiere anschliessend `schema.sql` in diese Datenbank.

Alternativ über das Terminal, mit deinem tatsächlichen Datenbankbenutzer:

```sh
mysql -h 127.0.0.1 -u mma_projekt -p mma_projekt < schema.sql
```

Den Befehl im Ordner `examples/php-mysql` ausführen. Das Passwort wird abgefragt und steht nicht in der Kommandozeile. Das Schema erstellt zwei Tabellen:

- `users`: User-ID, Name und E-Mail aus dem Auth-Service; keine Passwörter.
- `notes`: Text und die zugehörige `user_id` als Fremdschlüssel.

## 2. Konfiguration kopieren

Vom Repository-Hauptordner aus:

```sh
cd examples/php-mysql
cp config.example.php config.local.php
```

Auf Windows geht das auch durch Kopieren im Explorer. Trage in `config.local.php` die tatsächlichen Datenbank-Zugangsdaten ein:

```php
return [
    'auth_url' => 'https://auth.mmacodeclub.ch',
    'app_origin' => 'http://localhost:8000',
    'db_dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=mma_projekt;charset=utf8mb4',
    'db_user' => 'mma_projekt',
    'db_password' => 'DEIN_LOKALES_DATENBANKPASSWORT',
];
```

Der Platzhalter ist kein funktionierendes Passwort. Verwende die Zugangsdaten deiner Umgebung. `config.local.php` wird von Git ignoriert und liegt ausserhalb des öffentlichen Verzeichnisses.

## 3. PHP-Server starten

```sh
php -S localhost:8000 -t public
```

Öffne **http://localhost:8000** und melde dich an. Frontend und API werden über diesen PHP-Server ausgeliefert. **Nicht Live Server verwenden**: Er führt kein PHP aus.

Nach dem Speichern liegt deine Notiz in MySQL. Andere angemeldete Personen bekommen ihre eigene Liste. Angezeigt werden die neuesten 100 Notizen der jeweiligen Person. Beim Neustart des PHP-Servers bleiben Daten erhalten, solange die Datenbank erhalten bleibt.

## Was passiert bei einer Anfrage?

1. `public/script.js` ruft `mmaAuth.fetch('api/notes.php')` auf.
2. Das SDK sendet den Bearer-Token mit.
3. `mma-auth.php` prüft ihn bei MMA Auth und vergleicht die zurückgegebene `origin` mit `app_origin`.
4. PHP übernimmt die bestätigte Person in `users` bzw. aktualisiert Name und E-Mail.
5. Die Notizabfrage verwendet `WHERE user_id = ?` mit dieser geprüften ID.

Eine vom Browser zusätzlich gesendete `user_id` wird nicht verwendet. Auch bei späteren Bearbeiten- oder Löschen-Endpunkten musst du nach der geprüften User-ID filtern, z.B. `DELETE FROM notes WHERE id = ? AND user_id = ?`.

## Eigene API-Dateien

Nimm `public/api/notes.php` als Vorlage. Jede geschützte PHP-Datei muss selbst `mma_require_user($config)` aufrufen, bevor sie Daten ausliefert oder verändert. Eine andere Datei im selben Verzeichnis ist nicht automatisch geschützt.

Die Tokenprüfung benötigt ausgehenden HTTPS-Zugriff auf `auth.mmacodeclub.ch`. Serverfehler liefern eine allgemeine JSON-Meldung; DB-Passwörter und SQL-Abfragen werden nicht an den Browser zurückgegeben.

## Auf einem Hosting veröffentlichen

1. PHP-Laufzeit mit cURL und PDO MySQL einrichten.
2. Projektdatenbank anlegen und `schema.sql` importieren.
3. Projektdateien hochladen und `config.local.php` auf dem Server mit den echten Zugangsdaten anlegen.
4. **Document Root auf `public/` setzen.** Konfiguration und Hilfsdatei bleiben ausserhalb des Webroots.
5. In `app_origin` die exakte HTTPS-Adresse eintragen, z.B. `https://mein-projekt.example`.
6. Diese Domain beim Auth-Service freischalten, danach Login und API testen.

Bei einem Hosting mit festem Webroot verteilst du den Inhalt von `public/` ins Webroot und legst Konfiguration und Hilfsdatei ausserhalb ab. Passe dann die `require`-Pfade in `api/notes.php` an. Lade nicht einfach den ganzen Repository-Hauptordner ins öffentliche Verzeichnis hoch.

Der eingebaute PHP-Server ist für lokale Entwicklung gedacht. Für den Produktivbetrieb brauchst du einen PHP-fähigen Webserver bzw. ein entsprechendes Hosting. Wenn die Datenbank in einem Container läuft, benötigt auch **diese Projektdatenbank** persistenten Speicher und Backups. Der Auth-Service sichert deine Notizen nicht mit.

### Apache und Authorization-Header

Manche Apache-/PHP-Konfigurationen reichen den `Authorization`-Header nicht an PHP weiter. Dafür liegt `public/api/.htaccess` bei. Erlaubt dein Hoster diese Direktive nicht oder verwendest du Nginx/PHP-FPM, muss der Header in der jeweiligen Serverkonfiguration weitergegeben werden. Beim lokalen `php -S` ist die Datei nicht nötig.

### Unterordner und separate Frontends

Der Beispielpfad `api/notes.php` ist relativ und funktioniert auch unter einem Projektpfad. In `app_origin` steht trotzdem nur `https://deine-domain.example`, ohne Projektpfad. Mehrere Projekte unter derselben Origin sind im Auth-System nicht voneinander getrennt.

Das Beispiel nimmt eine gemeinsame Origin für Frontend und PHP an. Ein separat gehostetes Frontend benötigt zusätzlich eine bewusst konfigurierte CORS-Freigabe im eigenen Backend. Die Origin-Prüfung darf dafür nicht entfernt werden.

Zurück zur [vollständigen Anleitung](../../README.md).
