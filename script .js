/* =============================================
   TASKFLOW — Task Manager Script
   Features: Add, Edit, Delete, Toggle Done,
             Priority, Filter, Search, Drag & Drop,
             LocalStorage persistence, Timestamps
   ============================================= */

let tasks = [];
let filter = 'all';
let dragSrc = null;

/* ── INIT: Load from localStorage ── */
function init() {
  const saved = localStorage.getItem('taskflow_tasks');
  if (saved) {
    tasks = JSON.parse(saved);
  }
  renderTasks();
}

/* ── SAVE to localStorage ── */
function save() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

/* ── ADD TASK ── */
function addTask() {
  const inp = document.getElementById('taskInput');
  const text = inp.value.trim();
  const priority = document.getElementById('priorityInput').value;

  if (!text) {
    shake(inp);
    return;
  }

  tasks.unshift({
    id: Date.now(),
    text,
    priority,
    done: false,
    date: new Date().toISOString()
  });

  inp.value = '';
  save();
  renderTasks();
  showToast('Task added');
}

/* ── DELETE TASK ── */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  renderTasks();
  showToast('Task removed');
}

/* ── TOGGLE DONE ── */
function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (t) t.done = !t.done;
  save();
  renderTasks();
}

/* ── INLINE EDIT ── */
function startEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;

  const li = document.querySelector(`[data-id="${id}"]`);
  const span = li.querySelector('.task-text');
  const inp = document.createElement('input');
  inp.className = 'task-text-input';
  inp.value = t.text;
  span.replaceWith(inp);
  inp.focus();
  inp.select();

  const saveEdit = () => {
    const v = inp.value.trim();
    if (v) t.text = v;
    save();
    renderTasks();
  };

  inp.onblur = saveEdit;
  inp.onkeydown = e => {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') renderTasks();
  };
}

/* ── FILTER ── */
function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

/* ── RENDER ── */
function renderTasks() {
  const q = document.getElementById('searchInput').value.toLowerCase();

  let list = [...tasks];
  if (filter === 'active') list = list.filter(t => !t.done);
  else if (filter === 'done') list = list.filter(t => t.done);
  else if (filter === 'high') list = list.filter(t => t.priority === 'high');
  if (q) list = list.filter(t => t.text.toLowerCase().includes(q));

  const labels = { all: 'All tasks', active: 'Active tasks', done: 'Completed', high: 'High priority' };
  document.getElementById('sectionLabel').textContent = `${labels[filter] || 'Tasks'} (${list.length})`;

  const ul = document.getElementById('taskList');

  if (list.length === 0) {
    ul.innerHTML = `
      <div class="empty">
        <span class="empty-icon">✦</span>
        <p>${q ? 'No tasks match your search' : 'Nothing here yet — add your first task above'}</p>
      </div>
    `;
    updateHeader();
    return;
  }

  ul.innerHTML = list.map((t, i) => `
    <li class="task-item${t.done ? ' done' : ''}" data-id="${t.id}" draggable="true" style="animation-delay:${i * 0.04}s">
      <button class="check-btn${t.done ? ' checked' : ''}" onclick="toggleDone(${t.id})" aria-label="Toggle done"></button>
      <span class="priority-badge p-${t.priority}">${t.priority.toUpperCase()}</span>
      <span class="task-text">${escHTML(t.text)}</span>
      <span class="task-date">${fmtDate(t.date)}</span>
      <div class="task-actions">
        <button class="icon-btn edit-ico" onclick="startEdit(${t.id})" title="Edit task" aria-label="Edit task">✎</button>
        <button class="icon-btn del-ico" onclick="deleteTask(${t.id})" title="Delete task" aria-label="Delete task">✕</button>
      </div>
    </li>
  `).join('');

  /* Drag & Drop */
  ul.querySelectorAll('.task-item').forEach(el => {
    el.addEventListener('dragstart', () => {
      dragSrc = el;
      setTimeout(() => el.classList.add('dragging'), 0);
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      dragSrc = null;
    });
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || dragSrc === el) return;
      const fromId = +dragSrc.dataset.id;
      const toId   = +el.dataset.id;
      const fromIdx = tasks.findIndex(t => t.id === fromId);
      const toIdx   = tasks.findIndex(t => t.id === toId);
      const [moved] = tasks.splice(fromIdx, 1);
      tasks.splice(toIdx, 0, moved);
      save();
      renderTasks();
    });
  });

  updateHeader();
}

/* ── HEADER STATS ── */
function updateHeader() {
  document.getElementById('hdrTotal').textContent = tasks.length + ' ';
  document.getElementById('hdrDone').textContent  = tasks.filter(t => t.done).length + ' ';
}

/* ── FORMAT DATE ── */
function fmtDate(dateStr) {
  const now  = new Date();
  const diff = Math.floor((now - new Date(dateStr)) / 60000);
  if (diff < 1)    return 'just now';
  if (diff < 60)   return diff + 'm ago';
  if (diff < 1440) return Math.floor(diff / 60) + 'h ago';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── XSS PROTECTION ── */
function escHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

/* ── TOAST ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = '✓ ' + msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── SHAKE ── */
function shake(el) {
  el.style.outline = '2px solid #f05656';
  el.style.animation = 'sh .35s ease';
  setTimeout(() => {
    el.style.outline = '';
    el.style.animation = '';
  }, 500);
}

/* ── START ── */
init();
