const $ = (selector) => document.querySelector(selector);
const state = { online: false, models: [], selectedModel: '', messages: [] };
const messagesEl = $('#messages');
const composer = $('#composer');
const sendBtn = $('#sendBtn');

function notify(message, kind = 'info') {
  let toast = $('#orbitToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'orbitToast';
    toast.className = 'orbit-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function on(selector, event, handler) {
  const element = $(selector);
  if (!element) return;
  element.addEventListener(event, handler);
}

function setConnection(online, detail) {
  state.online = online;
  const card = $('#connectionCard');
  card.classList.toggle('online', online);
  $('#connectionLabel').textContent = online ? 'Ollama connected' : 'Ollama not found';
  $('#connectionDetail').textContent = detail || (online ? 'Local runtime ready' : 'Setup required');
  $('#setupBanner').classList.toggle('hidden', online);
  sendBtn.disabled = !online || !state.selectedModel;
}

function formatSize(bytes) {
  if (!bytes) return '';
  const gb = bytes / 1024 / 1024 / 1024;
  return gb > 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function renderModels() {
  const select = $('#modelSelect');
  select.innerHTML = '';
  if (!state.models.length) {
    select.innerHTML = '<option value="">No model selected</option>';
    state.selectedModel = '';
  } else {
    state.models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.name;
      option.textContent = `${model.name}${model.size ? ` · ${formatSize(model.size)}` : ''}`;
      select.appendChild(option);
    });
    state.selectedModel = state.models[0].name;
    select.value = state.selectedModel;
  }
  sendBtn.disabled = !state.online || !state.selectedModel;
}

function addMessage(role, content) {
  $('#welcomeBlock').style.display = 'none';
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;
  const avatar = role === 'user' ? 'AS' : '✦';
  wrapper.innerHTML = `<div class="message-avatar">${avatar}</div><div class="message-body"><div class="message-meta">${role === 'user' ? 'YOU' : 'ORBIT'} · JUST NOW</div><div class="message-content"></div></div>`;
  wrapper.querySelector('.message-content').textContent = content;
  messagesEl.appendChild(wrapper);
  $('#chatColumn').scrollTo({ top: $('#chatColumn').scrollHeight, behavior: 'smooth' });
}

function resetChat() {
  state.messages = [];
  messagesEl.innerHTML = '';
  $('#welcomeBlock').style.display = '';
  $('#conversationTitle').textContent = 'Untitled conversation';
  composer.value = '';
  composer.focus();
}

async function refresh() {
  $('#refreshBtn').textContent = '…';
  try {
    const status = await window.ollama.status();
    setConnection(status.online, status.online ? (status.version || 'Local runtime ready') : 'Install Ollama to continue');
    if (status.online) {
      state.models = await window.ollama.models();
      renderModels();
      notify(state.models.length ? `${state.models.length} local model${state.models.length === 1 ? '' : 's'} ready` : 'Ollama is running, but no models are installed', state.models.length ? 'success' : 'info');
    } else {
      state.models = [];
      renderModels();
    }
  } catch (error) {
    setConnection(false, 'Start the local runtime to continue');
    notify(`Could not connect to Ollama: ${error.message || 'runtime unavailable'}`, 'error');
  } finally { $('#refreshBtn').textContent = '↻'; }
}

async function sendMessage(prefill) {
  const text = (prefill ?? composer.value).trim();
  if (!text || !state.online || !state.selectedModel) return;
  composer.value = '';
  composer.style.height = 'auto';
  $('#conversationTitle').textContent = text.length > 34 ? `${text.slice(0, 34)}…` : text;
  addMessage('user', text);
  state.messages.push({ role: 'user', content: text });
  sendBtn.disabled = true;
  const loading = document.createElement('div');
  loading.className = 'message assistant';
  loading.innerHTML = '<div class="message-avatar">✦</div><div class="message-body"><div class="message-meta">ORBIT · THINKING</div><div class="message-content" style="color:#7f8993">Working locally…</div></div>';
  messagesEl.appendChild(loading);
  try {
    const reply = await window.ollama.chat({ model: state.selectedModel, messages: state.messages });
    loading.remove();
    const content = reply.content || 'The model returned an empty response.';
    addMessage('assistant', content);
    state.messages.push({ role: 'assistant', content });
  } catch (error) {
    loading.remove();
    addMessage('assistant', `I couldn't reach Ollama. ${error.message || 'Check that the local runtime is running.'}`);
  } finally { sendBtn.disabled = false; }
}

on('#newChatBtn', 'click', resetChat);
on('#refreshBtn', 'click', refresh);
on('#installBtn', 'click', async () => {
  const button = $('#installBtn');
  button.disabled = true;
  button.innerHTML = 'Installing…';
  try {
    await window.ollama.install();
    notify('Ollama installed. Checking the local runtime…', 'success');
    await refresh();
  } catch (error) {
    button.disabled = false;
    button.innerHTML = 'Open Ollama download ↗';
    notify('Automatic installation was blocked. Opening the official Ollama download page.', 'error');
    window.ollama.openDownload();
  }
});
on('#sendBtn', 'click', () => sendMessage());
on('#modelSelect', 'change', (event) => { state.selectedModel = event.target.value; sendBtn.disabled = !state.online || !state.selectedModel; notify(state.selectedModel ? `Using ${state.selectedModel}` : 'Choose an installed model first'); });
on('#modelsNav', 'click', () => { refresh(); $('#modelSelect').focus(); notify('Model list refreshed'); });
on('#composer', 'keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
on('#composer', 'input', () => { composer.style.height = 'auto'; composer.style.height = `${Math.min(composer.scrollHeight, 130)}px`; });
document.querySelectorAll('.starter-card').forEach((card) => card.addEventListener('click', () => { composer.value = card.dataset.prompt; composer.focus(); if (state.online && state.selectedModel) sendMessage(); else notify('Install Ollama and select a model to use this prompt'); }));
document.querySelectorAll('.history-item').forEach((item) => item.addEventListener('click', () => { document.querySelectorAll('.history-item').forEach((entry) => entry.classList.remove('active')); item.classList.add('active'); notify(`Opened ${item.textContent.trim()}`); }));
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((entry) => entry.classList.remove('active')); item.classList.add('active'); }));
document.querySelectorAll('.icon-button').forEach((button) => button.addEventListener('click', () => notify(button.title === 'Search' ? 'Search is coming soon' : 'Settings and commands are coming soon')));
document.querySelector('.tool-button')?.addEventListener('click', () => notify('File attachments are coming soon'));
window.addEventListener('error', (event) => notify(`Orbit UI error: ${event.message}`, 'error'));

refresh();
