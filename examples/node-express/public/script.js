// Nur mmaAuth.fetch ergänzt den Bearer-Token. fetch allein tut das nicht.
const endpoint = 'api/notes';
const status = document.querySelector('#status');
const form = document.querySelector('#note-form');
const list = document.querySelector('#list');

function showError(error) {
  status.textContent = error.message;
  status.dataset.error = 'true';
}

async function request(options) {
  const response = await mmaAuth.fetch(endpoint, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Dein Login ist abgelaufen. Melde dich ab und erneut an.');
    }
    throw new Error(data.error || 'Die Anfrage ist fehlgeschlagen.');
  }
  if (!Array.isArray(data)) throw new Error('Das Backend liefert keine gültige Notizliste.');
  return data;
}

function render(notes) {
  list.replaceChildren(...notes.map((note) => {
    const item = document.createElement('li');
    item.textContent = note.text; // Keine HTML-Ausführung bei Benutzereingaben.
    return item;
  }));
  document.querySelector('#empty').hidden = notes.length !== 0;
  status.dataset.error = 'false';
  status.textContent = `${notes.length} Notizen geladen.`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    render(await request({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: form.elements.text.value }),
    }));
    form.reset();
  } catch (error) {
    showError(error);
  } finally {
    button.disabled = false;
  }
});

try {
  if (!window.mmaAuth) throw new Error('Das Login-Script konnte nicht geladen werden. Lade die Seite nochmals.');
  const user = await mmaAuth.user();
  if (user) {
    document.querySelector('#workspace').hidden = false;
    render(await request());
  } else {
    status.textContent = 'Melde dich an, um deine Notizen zu laden.';
  }
} catch (error) {
  showError(error);
}
