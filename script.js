// Einstieg: Das SDK stellt window.mmaAuth bereit. Du brauchst keinen API-Key.
const status = document.querySelector('#status');
const note = document.querySelector('#note');
let storageKey = null;

function message(text, error = false) {
  status.textContent = text;
  status.dataset.error = String(error);
}

function showUser(user) {
  storageKey = user ? `mma-starter:note:${user.id}` : null;
  document.querySelector('#notes').hidden = !user;
  note.value = '';
  if (!user) return message('Bereit. Melde dich mit deinem MMA-Konto an.');
  try {
    // Die User-ID trennt die Notizen in diesem Browser. Das ist kein Zugriffsschutz.
    note.value = localStorage.getItem(storageKey) || '';
    message('Angemeldet. Deine Notiz bleibt auf diesem Gerät.');
  } catch {
    message('Dein Browser erlaubt keinen lokalen Speicher. Du kannst die Notiz hier nicht speichern.', true);
  }
}

document.querySelector('#note-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, note.value);
    message('Notiz in diesem Browser gespeichert.');
  } catch {
    message('Speichern fehlgeschlagen. Der Browserspeicher ist gesperrt oder voll.', true);
  }
});

document.querySelector('#delete-note').addEventListener('click', () => {
  if (!storageKey) return;
  try {
    localStorage.removeItem(storageKey);
    note.value = '';
    message('Lokale Notiz gelöscht.');
  } catch {
    message('Die Notiz konnte nicht gelöscht werden.', true);
  }
});

if (!window.mmaAuth) {
  message('Das Login-Script konnte nicht geladen werden. Prüfe deine Verbindung und lade die Seite neu.', true);
  document.querySelector('[data-mma-login]').disabled = true;
} else {
  document.addEventListener('mma:user', (event) => showUser(event.detail));
  showUser(await mmaAuth.user());
}
