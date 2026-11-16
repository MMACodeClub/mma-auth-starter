-- NUR für die ursprüngliche Starter-Struktur; vorher Datenbank sichern.
-- MySQL-DDL führt implizite Commits aus. Bei angepassten Tabellen zuerst prüfen.
-- Bestehende Notizen und User-IDs bleiben erhalten. Name/E-Mail werden entfernt.
ALTER TABLE notes DROP FOREIGN KEY notes_ibfk_1;
ALTER TABLE users
    MODIFY id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    DROP COLUMN name,
    DROP COLUMN email;
ALTER TABLE notes
    MODIFY user_id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    ADD CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
