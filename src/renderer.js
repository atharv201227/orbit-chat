const $ = (selector) => document.querySelector(selector);
const state = { online: false, models: [], selectedModel: '', messages: [] };
const messagesEl = $('#messages');
const composer = $('#composer');
const sendBtn = $('#sendBtn');

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
    } else {
      state.models = [];
      renderModels();
    }
  } catch (error) {
    setConnection(false, 'Start the local runtime to continue');
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

$('#newChatBtn').addEventListener('click', resetChat);
$('#refreshBtn').addEventListener('click', refresh);
$('#installBtn').addEventListener('click', async () => {
  const button = $('#installBtn');
  button.disabled = true;
  button.innerHTML = 'Installing…';
  try {
    await window.ollama.install();
    await refresh();
  } catch (error) {
    button.disabled = false;
    button.innerHTML = 'Open Ollama download ↗';
    window.ollama.openDownload();
  }
});
$('#sendBtn').addEventListener('click', () => sendMessage());
$('#modelSelect').addEventListener('change', (event) => { state.selectedModel = event.target.value; sendBtn.disabled = !state.online || !state.selectedModel; });
composer.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
composer.addEventListener('input', () => { composer.style.height = 'auto'; composer.style.height = `${Math.min(composer.scrollHeight, 130)}px`; });
document.querySelectorAll('.starter-card').forEach((card) => card.addEventListener('click', () => { composer.value = card.dataset.prompt; composer.focus(); if (state.online && state.selectedModel) sendMessage(); }));

refresh();
