// Nur mmaAuth.fetch ergänzt den Bearer-Token. fetch allein tut das nicht.
const endpoint = 'api/notes.php';
const status = document.querySelector('#status');
const form = document.querySelector('#note-form');
const list = document.querySelector('#list');
const workspace = document.querySelector('#workspace');
let signedIn = false;
let busy = true;
let uncertain = false;
let revision = 0;

function updateControls() {
  form.querySelectorAll('button, textarea').forEach((element) => { element.disabled = busy || uncertain || !signedIn; });
  list.querySelectorAll('button').forEach((button) => { button.disabled = busy || uncertain || !signedIn; });
  workspace.setAttribute('aria-busy', String(busy));
}

function closeWorkspace() {
  revision += 1; // Späte Antworten dürfen die private Ansicht nicht wieder öffnen.
  signedIn = false;
  workspace.hidden = true;
  list.replaceChildren();
  form.reset();
  document.querySelector('#empty').hidden = true;
  updateControls();
}

document.addEventListener('mma:user', (event) => {
  if (!event.detail) {
    closeWorkspace();
    status.textContent = 'Melde dich an, um deine Notizen zu laden.';
  }
});

function showError(error) {
  status.textContent = error.message;
  status.dataset.error = 'true';
  document.querySelector('#reload').hidden = !uncertain;
}

document.querySelector('#reload').addEventListener('click', () => location.reload());

async function request(options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const writing = options.method === 'POST' || options.method === 'DELETE';
  let rejected = false;
  try {
    const response = await mmaAuth.fetch(endpoint, { ...options, signal: controller.signal });
    if (response.status === 401 || response.status === 403) {
      rejected = true;
      closeWorkspace();
      throw new Error('Dein Login ist abgelaufen oder gehört nicht zu diesem Projekt. Bitte melde dich erneut an.');
    }
    // 4xx (ausser Timeout) bedeutet: Das Backend hat die Aktion abgelehnt.
    rejected = response.status >= 400 && response.status < 500 && response.status !== 408;
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Die Anfrage ist fehlgeschlagen.');
    if (!Array.isArray(data) || !data.every((note) => note && Number.isSafeInteger(Number(note.id)) && Number(note.id) > 0 && typeof note.text === 'string')) {
      throw new Error('Das Backend liefert keine gültige Notizliste.');
    }
    return data;
  } catch (error) {
    if (writing && !rejected) {
      // Ein Abbruch im Browser beweist nicht, dass PHP nichts gespeichert hat.
      uncertain = true;
      updateControls();
      throw new Error('Speicherstatus unklar – zuerst neu laden. Prüfe danach deine Notizen, bevor du erneut speicherst oder löschst.');
    }
    if (error.name === 'AbortError') throw new Error('Das Laden dauert zu lange. Lade die Seite erneut.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function render(notes) {
  list.replaceChildren(...notes.map((note) => {
    const item = document.createElement('li');
    const text = document.createElement('p');
    text.textContent = note.text; // Benutzereingaben immer als Text einsetzen.
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = 'Löschen';
    button.setAttribute('aria-label', `Notiz löschen: ${note.text.slice(0, 60)}`);
    button.addEventListener('click', () => {
      if (busy || uncertain || !signedIn || !confirm('Diese Notiz endgültig löschen?')) return;
      write({ method: 'DELETE', body: JSON.stringify({ id: Number(note.id) }) });
    });
    item.append(text, button);
    return item;
  }));
  document.querySelector('#empty').hidden = notes.length !== 0;
  status.dataset.error = 'false';
  status.textContent = notes.length === 1 ? '1 Notiz geladen.' : `${notes.length} Notizen geladen.`;
  updateControls();
}

async function write(options) {
  if (busy || uncertain || !signedIn) return;
  busy = true; // Eine gemeinsame Sperre für Speichern und sämtliche Löschknöpfe.
  const started = revision;
  updateControls();
  try {
    const notes = await request({ ...options, headers: { 'Content-Type': 'application/json' } });
    if (started !== revision || !signedIn) return;
    render(notes);
    if (options.method === 'POST') form.reset();
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    updateControls();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  write({ method: 'POST', body: JSON.stringify({ text: form.elements.text.value }) });
});

try {
  updateControls();
  if (!window.mmaAuth) throw new Error('Das Login-Script konnte nicht geladen werden. Lade die Seite nochmals.');
  const started = revision;
  const user = await mmaAuth.user();
  if (user && started === revision) {
    signedIn = true;
    const notes = await request();
    if (started === revision && signedIn) {
      workspace.hidden = false;
      render(notes);
    }
  } else {
    status.textContent = 'Melde dich an, um deine Notizen zu laden.';
  }
} catch (error) {
  closeWorkspace();
  showError(error);
} finally {
  busy = false;
  updateControls();
}
