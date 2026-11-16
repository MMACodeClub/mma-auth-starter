-- In DEINE Projektdatenbank importieren, nicht in die Datenbank des Auth-Service.
CREATE TABLE IF NOT EXISTS users (
    -- Auth-IDs sind ASCII; Gross/Klein zählt. PHP prüft das feste ID-Format.
    id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    text VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
