// app/static/js/app.js
// Frontend logic for CRUD on tabs: itog, groups, preps, auditorii, objects

"use strict";

let currentTab = "itog";
let dataCache = { groups: [], preps: [], auditorii: [], objects: [], itog: [] };

const tableColumns = {
  itog: ["День", "Время", "Предмет", "Группа", "Преподаватель", "Аудитория", "Тип"],
  groups: ["ID", "Название"],
  preps: ["ID", "ФИО"],
  auditorii: ["ID", "Номер"],
  objects: ["ID", "Название"]
};

function $(id) { return document.getElementById(id); }

// --- API helpers ---
async function apiGet(path) {
  const resp = await fetch('/api' + path, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return await resp.json();
}
async function apiPost(path, form) {
  let options;
  if (form instanceof FormData) {
    options = { method: 'POST', body: form };
  } else {
    options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) };
  }
  const resp = await fetch('/api' + path, options);
  if (!resp.ok) { const t = await resp.text(); throw new Error(t || resp.status); }
  return await resp.json();
}
async function apiPut(path, form) {
  let options;
  if (form instanceof FormData) {
    options = { method: 'PUT', body: form };
  } else {
    options = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) };
  }
  const resp = await fetch('/api' + path, options);
  if (!resp.ok) { const t = await resp.text(); throw new Error(t || resp.status); }
  return await resp.json();
}
async function apiDelete(path) {
  const resp = await fetch('/api' + path, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Delete failed');
  try { return await resp.json(); } catch (e) { return {}; }
}

// --- Rendering headers and table (single unified renderTable) ---
function renderTableHeaders() {
  const headersRow = $('table-headers');
  if (!headersRow) return;
  headersRow.innerHTML = '';
  const cols = tableColumns[currentTab] || [];
  cols.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    headersRow.appendChild(th);
  });
}

// Unified renderTable: renderTable(tab = null, items = null)
// If tab omitted uses currentTab. If items omitted uses dataCache[currentTab].
function renderTable(tab = null, items = null) {
  if (tab) currentTab = tab;
  const tbody = document.querySelector('#main-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const list = Array.isArray(items) ? items : (dataCache[currentTab] || []);
  if (!Array.isArray(list)) return;

  if (currentTab === 'itog') {
    list.forEach(r => {
      const tr = document.createElement('tr');
      tr.dataset.id = r.id;
      // добавляем data-* атрибуты для фильтрации по DOM
      tr.dataset.groupId = r.group_id != null ? String(r.group_id) : (r.group_id === 0 ? '0' : '');
      tr.dataset.prepId = r.prep_id != null ? String(r.prep_id) : (r.prep_id === 0 ? '0' : '');
      tr.dataset.audId = r.aud_id != null ? String(r.aud_id) : (r.aud_id === 0 ? '0' : '');

      const subj = r.object_name || dataCache.objects.find(o => String(o.id) === String(r.object_id))?.name || r.object || '';
      const grp = r.group_name || dataCache.groups.find(g => String(g.id) === String(r.group_id))?.name || r.group || '';
      const prep = r.prep_fio || dataCache.preps.find(p => String(p.id) === String(r.prep_id))?.fio || r.prep || '';
      const aud = r.aud_number || dataCache.auditorii.find(a => String(a.id) === String(r.aud_id))?.number || r.aud || '';
      tr.innerHTML = `<td>${r.date || ''}</td><td>${r.time || ''}</td><td>${escapeHtml(subj)}</td><td>${escapeHtml(grp)}</td><td>${escapeHtml(prep)}</td><td>${escapeHtml(aud)}</td><td>${escapeHtml(r.type || '')}</td>`;
      tbody.appendChild(tr);
    });
  } else {
    list.forEach(r => {
      const tr = document.createElement('tr');
      tr.dataset.id = r.id;
      if (currentTab === 'groups') tr.innerHTML = `<td>${r.id}</td><td>${escapeHtml(r.name)}</td>`;
      if (currentTab === 'preps') tr.innerHTML = `<td>${r.id}</td><td>${escapeHtml(r.fio)}</td>`;
      if (currentTab === 'objects') tr.innerHTML = `<td>${r.id}</td><td>${escapeHtml(r.name)}</td>`;
      if (currentTab === 'auditorii') tr.innerHTML = `<td>${r.id}</td><td>${escapeHtml(r.number)}</td>`;
      tbody.appendChild(tr);
    });
  }
}

function escapeHtml(s) { if (!s && s !== 0) return ''; return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]); }

function renderStats() {
  if ($('stat-groups')) $('stat-groups').textContent = `Групп: ${dataCache.groups.length || 0}`;
  if ($('stat-preps')) $('stat-preps').textContent = `Преподавателей: ${dataCache.preps.length || 0}`;
  if ($('stat-aud')) $('stat-aud').textContent = `Аудиторий: ${dataCache.auditorii.length || 0}`;
  if ($('stat-itog')) $('stat-itog').textContent = `Занятий: ${dataCache.itog.length || 0}`;
}

function populateFilterField() {
  const sel = $('filter-field');
  if (!sel) return;
  sel.innerHTML = '<option value="">Фильтр</option>';
  if (currentTab === 'itog') {
    (dataCache.groups || []).forEach(g => { const o = document.createElement('option'); o.value = g.id; o.textContent = 'Г:' + g.name; sel.appendChild(o); });
    (dataCache.preps || []).forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = 'П:' + p.fio; sel.appendChild(o); });
    (dataCache.auditorii || []).forEach(a => { const o = document.createElement('option'); o.value = a.id; o.textContent = 'А:' + a.number; sel.appendChild(o); });
  } else {
    const list = dataCache[currentTab] || [];
    list.forEach(it => { const o = document.createElement('option'); o.value = it.id; o.textContent = it.name || it.fio || it.number || ''; sel.appendChild(o); });
  }
}

// --- Load data for a tab and update cache ---
async function loadDataForTab(tab) {
  try {
    if (tab === 'itog') {
      // Для itog сначала подтянем справочники, затем itog
      const [groups, objects, preps, auds] = await Promise.all([
        apiGet('/groups'),
        apiGet('/objects'),
        apiGet('/preps'),
        apiGet('/auditorii')
      ]);
      dataCache.groups = groups || [];
      dataCache.objects = objects || [];
      dataCache.preps = preps || [];
      dataCache.auditorii = auds || [];
      dataCache.itog = await apiGet('/itog') || [];
    } else if (tab === 'groups') {
      dataCache.groups = await apiGet('/groups') || [];
    } else if (tab === 'preps') {
      dataCache.preps = await apiGet('/preps') || [];
    } else if (tab === 'objects') {
      dataCache.objects = await apiGet('/objects') || [];
    } else if (tab === 'auditorii') {
      dataCache.auditorii = await apiGet('/auditorii') || [];
    }
    renderTable();
    renderStats();
    populateFilterField();
  } catch (e) {
    console.error('loadDataForTab error', e);
    alert('Ошибка загрузки данных (подробнее в консоли)');
  }
}

function setActiveTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderTableHeaders();
  // очистим поля фильтра/сортировки, если есть
  if ($('filter-or-sort')) $('filter-or-sort').value = '';
  if ($('filter-input')) $('filter-input').value = '';
  loadDataForTab(tab);
}

// --- Filtering / Searching / Sorting ---

// For non-itog: local filtering and render filtered set
function loadFiltered() {
  const fld = $('filter-field') ? $('filter-field').value : '';
  const q = $('filter-input') ? $('filter-input').value.trim() : '';

  if (currentTab !== 'itog') {
    const list = dataCache[currentTab] || [];
    let filtered = list;
    if (fld) filtered = filtered.filter(x => String(x.id) === String(fld));
    if (q) {
      const ql = q.toLowerCase();
      filtered = filtered.filter(x => (x.name || x.fio || x.number || '').toLowerCase().includes(ql));
    }
    renderTable(currentTab, filtered);
    return;
  }

  // For itog: build query params and ask server (keeps server-side filtering)
  const filters = {};
  if (fld && fld !== '') {
    if ((dataCache.groups || []).find(g => String(g.id) === String(fld))) filters['group_id'] = fld;
    else if ((dataCache.preps || []).find(p => String(p.id) === String(fld))) filters['prep_id'] = fld;
    else if ((dataCache.auditorii || []).find(a => String(a.id) === String(fld))) filters['aud_id'] = fld;
  }
  if (q) {
    const grp = (dataCache.groups || []).find(g => g.name && g.name.toLowerCase().includes(q.toLowerCase()));
    if (grp) filters['group_id'] = grp.id;
  }
  const params = new URLSearchParams(filters).toString();
  apiGet('/itog' + (params ? ('?' + params) : '')).then(res => {
    dataCache.itog = res || [];
    renderTable();
    renderStats();
  }).catch(e => { console.error('itog filter error', e); alert('Ошибка фильтра (подробнее в консоли)'); });
}

// Alternative server-backed itog filter (works with input select or text)
async function applyItogFilterServer(val, text) {
  let url = "/api/itog";
  const params = new URLSearchParams();
  if (val) params.append("group", val);
  if (text) params.append("q", text);
  if ([...params].length > 0) url += "?" + params.toString();

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Ошибка фильтра");
    const data = await res.json();
    dataCache.itog = data || [];
    renderTable("itog", dataCache.itog);
    renderStats();
  } catch (err) {
    console.error("Ошибка фильтра", err);
  }
}

// --- Selection handling ---
document.addEventListener('click', e => {
  const tr = e.target.closest('#main-table tbody tr');
  if (tr) {
    document.querySelectorAll('#main-table tbody tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
  }
});

// --- Fill select helper ---
function fillSelectOptions(selId, items, key, selectedId) {
  const sel = $(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— none —</option>';
  (items || []).forEach(it => {
    const o = document.createElement('option');
    o.value = it.id;
    o.textContent = it[key] || '';
    if (selectedId != null && String(it.id) === String(selectedId)) o.selected = true;
    sel.appendChild(o);
  });
}

// --- Modal helpers (create/edit/close) ---
function openModalForCreate() {
  const modal = $('modal'); if (!modal) return;
  modal.classList.remove('hidden');
  $('modal-title').textContent = currentTab === 'itog' ? 'Добавить занятие' : 'Добавить запись';
  const fields = $('modal-fields'); if (!fields) return;
  fields.innerHTML = '';
  fields.style.display = 'flex';
  fields.style.flexDirection = 'column';
  fields.style.gap = '0.75rem';

  const addField = (labelText, el) => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.flexDirection = 'column';
    const title = document.createElement('span'); title.textContent = labelText;
    label.appendChild(title);
    label.appendChild(el);
    fields.appendChild(label);
  };

  if (currentTab === 'itog') {
    const date = document.createElement('input'); date.type = 'date'; date.id = 'f_date';
    const time = document.createElement('input'); time.type = 'text'; time.id = 'f_time'; time.placeholder = 'HH:MM';
    const subj = document.createElement('select'); subj.id = 'f_object';
    const group = document.createElement('select'); group.id = 'f_group';
    const prep = document.createElement('select'); prep.id = 'f_prep';
    const aud = document.createElement('select'); aud.id = 'f_aud';
    const type = document.createElement('input'); type.type = 'text'; type.id = 'f_type';

    addField('Дата', date);
    addField('Время', time);
    addField('Предмет', subj);
    addField('Группа', group);
    addField('Преподаватель', prep);
    addField('Аудитория', aud);
    addField('Тип', type);

    fillSelectOptions('f_object', dataCache.objects || [], 'name');
    fillSelectOptions('f_group', dataCache.groups || [], 'name');
    fillSelectOptions('f_prep', dataCache.preps || [], 'fio');
    fillSelectOptions('f_aud', dataCache.auditorii || [], 'number');

    $('modal-save').onclick = async () => {
      const form = new FormData();
      form.append('data', $('f_date').value || '');
      form.append('time', $('f_time').value || '');
      form.append('id_obj_fk', $('f_object').value || '');
      form.append('id_group_fk', $('f_group').value || '');
      form.append('id_prep_fk', $('f_prep').value || '');
      form.append('id_au_fk', $('f_aud').value || '');
      form.append('type', $('f_type').value || '');
      try { await apiPost('/itog', form); closeModal(); await loadDataForTab('itog'); } catch (e) { console.error('create itog error', e); alert('Ошибка сохранения (см. консоль)'); }
    };
  } else {
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'f_name';
    addField(currentTab === 'preps' ? 'ФИО' : currentTab === 'auditorii' ? 'Номер' : 'Название', nameInput);

    $('modal-save').onclick = async () => {
      const name = $('f_name').value || '';
      if (!name) { alert('Заполните поле'); return; }
      try {
        const f = new FormData();
        if (currentTab === 'groups') { f.append('name', name); await apiPost('/groups', f); }
        if (currentTab === 'preps') { f.append('fio', name); await apiPost('/preps', f); }
        if (currentTab === 'objects') { f.append('name', name); await apiPost('/objects', f); }
        if (currentTab === 'auditorii') { f.append('number', name); await apiPost('/auditorii', f); }
        closeModal(); await loadDataForTab(currentTab);
      } catch (e) { console.error('create error', e); alert('Ошибка создания (см. консоль)'); }
    };
  }

  $('modal-cancel').onclick = closeModal;
}

function openModalForEdit() {
  const tr = document.querySelector('#main-table tbody tr.selected');
  if (!tr) { alert('Выберите строку'); return; }
  const id = tr.dataset.id;
  const modal = $('modal'); if (!modal) return;
  modal.classList.remove('hidden');
  $('modal-title').textContent = 'Изменить';
  const fields = $('modal-fields');
  if (!fields) return;
  fields.innerHTML = '';
  fields.style.display = 'flex';
  fields.style.flexDirection = 'column';
  fields.style.gap = '0.75rem';

  const addField = (labelText, el) => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.flexDirection = 'column';
    const title = document.createElement('span'); title.textContent = labelText;
    label.appendChild(title);
    label.appendChild(el);
    fields.appendChild(label);
  };

  if (currentTab === 'itog') {
    const item = (dataCache.itog || []).find(x => String(x.id) === String(id));
    if (!item) { alert('Элемент не найден'); closeModal(); return; }
    const date = document.createElement('input'); date.type = 'date'; date.id = 'f_date'; date.value = item.date || '';
    const time = document.createElement('input'); time.type = 'text'; time.id = 'f_time'; time.value = item.time || '';
    const subj = document.createElement('select'); subj.id = 'f_object';
    const group = document.createElement('select'); group.id = 'f_group';
    const prep = document.createElement('select'); prep.id = 'f_prep';
    const aud = document.createElement('select'); aud.id = 'f_aud';
    const type = document.createElement('input'); type.type = 'text'; type.id = 'f_type'; type.value = item.type || '';

    addField('Дата', date);
    addField('Время', time);
    addField('Предмет', subj);
    addField('Группа', group);
    addField('Преподаватель', prep);
    addField('Аудитория', aud);
    addField('Тип', type);

    fillSelectOptions('f_object', dataCache.objects || [], 'name', item.object_id);
    fillSelectOptions('f_group', dataCache.groups || [], 'name', item.group_id);
    fillSelectOptions('f_prep', dataCache.preps || [], 'fio', item.prep_id);
    fillSelectOptions('f_aud', dataCache.auditorii || [], 'number', item.aud_id);

    $('modal-save').onclick = async () => {
      const form = new FormData();
      form.append('data', $('f_date').value || '');
      form.append('time', $('f_time').value || '');
      form.append('id_obj_fk', $('f_object').value || '');
      form.append('id_group_fk', $('f_group').value || '');
      form.append('id_prep_fk', $('f_prep').value || '');
      form.append('id_au_fk', $('f_aud').value || '');
      form.append('type', $('f_type').value || '');
      try { await apiPut('/itog/' + id, form); closeModal(); await loadDataForTab('itog'); } catch (e) { console.error('update itog error', e); alert('Ошибка обновления (см. консоль)'); }
    };
  } else {
    const list = dataCache[currentTab] || [];
    const item = list.find(x => String(x.id) === String(id));
    if (!item) { alert('Элемент не найден'); closeModal(); return; }
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'f_name';
    nameInput.value = item.name || item.fio || item.number || '';
    addField(currentTab === 'preps' ? 'ФИО' : currentTab === 'auditorii' ? 'Номер' : 'Название', nameInput);

    $('modal-save').onclick = async () => {
      const v = $('f_name').value || '';
      try {
        const f = new FormData();
        if (currentTab === 'groups') { f.append('name', v); await apiPut('/groups/' + id, f); }
        if (currentTab === 'preps') { f.append('fio', v); await apiPut('/preps/' + id, f); }
        if (currentTab === 'objects') { f.append('name', v); await apiPut('/objects/' + id, f); }
        if (currentTab === 'auditorii') { f.append('number', v); await apiPut('/auditorii/' + id, f); }
        closeModal(); await loadDataForTab(currentTab);
      } catch (e) { console.error('update error', e); alert('Ошибка обновления (см. консоль)'); }
    };
  }

  $('modal-cancel').onclick = closeModal;
}

function closeModal() {
  const modal = $('modal');
  if (!modal) return;
  modal.classList.add('hidden');
  const fields = $('modal-fields'); if (fields) fields.innerHTML = '';
  $('modal-save').onclick = null;
  $('modal-cancel').onclick = null;
}

// --- Delete selected ---
async function deleteSelected() {
  const tr = document.querySelector('#main-table tbody tr.selected');
  if (!tr) { alert('Выберите строку'); return; }
  if (!confirm('Удалить?')) return;
  const id = tr.dataset.id;
  try {
    if (currentTab === 'itog') await apiDelete('/itog/' + id);
    if (currentTab === 'groups') await apiDelete('/groups/' + id);
    if (currentTab === 'preps') await apiDelete('/preps/' + id);
    if (currentTab === 'objects') await apiDelete('/objects/' + id);
    if (currentTab === 'auditorii') await apiDelete('/auditorii/' + id);
    await loadDataForTab(currentTab);
  } catch (e) {
    console.error('delete error', e);
    alert('Ошибка удаления (см. консоль)');
  }
}

// В функциях экспорта меняем названия файлов:

async function exportWord() {
    try {
        const resp = await fetch('/api/export_word');
        if (!resp.ok) throw new Error('Word export failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ОТЧЕТ_О_РАСПИСАНИИ_ЗАНЯТИЙ.docx';
        document.body.appendChild(a);
        a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) {
        console.error('word export error', e);
        alert('Ошибка экспорта в Word (см. консоль)');
    }
}

async function exportPdf() {
    try {
        const resp = await fetch('/api/export_pdf');
        if (!resp.ok) throw new Error('PDF export failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Генерируем имя файла с текущей датой для уникальности
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        a.download = `Приказ_расписание_${day}.${month}.${year}.pdf`;

        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('pdf export error', e);
        alert('Ошибка экспорта в PDF (см. консоль)');
    }
}

async function exportExcel() {
    try {
        const resp = await fetch('/api/export_excel');
        if (!resp.ok) throw new Error('Excel export failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Ведомость_нагрузки.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('excel export error', e);
        alert('Ошибка экспорта в Excel');
    }
}

async function handleImport(e) {
  const f = e.target.files[0]; if (!f) return;
  const fd = new FormData(); fd.append('file', f);
  try {
    const res = await apiPost('/import', fd);
    alert('Импортировано: ' + (res.count || 0));
    await loadDataForTab('itog');
  } catch (err) {
    console.error('import error', err);
    alert('Ошибка импорта (см. консоль)');
  } finally {
    e.target.value = '';
  }
}

// --- Dropdown export menu ---
function setupExportDropdown() {
  const dropdownBtn = document.getElementById('export-dropdown-btn');
  const dropdownMenu = document.getElementById('export-menu');

  if (!dropdownBtn || !dropdownMenu) return;

  // Toggle dropdown
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdownMenu.classList.add('hidden');
  });

  // Handle export option clicks
  const exportOptions = document.querySelectorAll('.export-option');
  exportOptions.forEach(option => {
    option.addEventListener('click', async (e) => {
      e.stopPropagation();
      const format = e.target.dataset.format;
      dropdownMenu.classList.add('hidden');

      switch (format) {
        case 'word':
          openWordExportModal();
          break;
        case 'pdf':
          await exportPdf();
          break;
        case 'excel':
          await exportExcel();
          break;
      }
    });
  });
}

// --- Initialization and event wiring (integrated, no demo data) ---
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const filterOrSort = document.querySelector("#filter-or-sort");
  const filterInput = document.querySelector("#filter-input");
  const filterField = document.querySelector("#filter-field");

  // Подключаем кнопки модалки/CRUD
  const btnCreate = document.getElementById('add-btn');
  const btnEdit = document.getElementById('edit-btn');
  const btnDelete = document.getElementById('delete-btn');
  const inpImport = document.getElementById('import-file');

  if (btnCreate) btnCreate.addEventListener('click', openModalForCreate);
  if (btnEdit) btnEdit.addEventListener('click', openModalForEdit);
  if (btnDelete) btnDelete.addEventListener('click', deleteSelected);
  if (inpImport) inpImport.addEventListener('change', handleImport);

  // Настройка выпадающего меню экспорта
  setupExportDropdown();

  const btnTheme = document.getElementById("theme-toggle");
  const body = document.body;

  // загрузка сохранённой темы
  let theme = localStorage.getItem("theme") || "light";
  if (theme === "dark") body.classList.add("dark");

  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      theme = theme === "light" ? "dark" : "light";
      if (theme === "dark") body.classList.add("dark");
      else body.classList.remove("dark");
      localStorage.setItem("theme", theme);
    });
  }

  // --- Фильтры и поиск для вкладки "itog" ---
  function setupFilterOrSortUI(tab) {
    const filterOrSort = document.getElementById("filter-or-sort");
    const filterInput = document.getElementById("filter-input");

    if (!filterOrSort || !filterInput) return;

    filterOrSort.innerHTML = '';
    filterInput.value = '';

    if (tab === "itog") {
      // --- Создаём опции фильтра ---
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Фильтр";
      filterOrSort.appendChild(defaultOpt);

      // группы
      (dataCache.groups || []).forEach(g => {
        const opt = document.createElement("option");
        opt.value = "group-" + g.id;
        opt.textContent = "Г:" + g.name;
        filterOrSort.appendChild(opt);
      });

      // преподаватели
      (dataCache.preps || []).forEach(p => {
        const opt = document.createElement("option");
        opt.value = "prep-" + p.id;
        opt.textContent = "П:" + p.fio;
        filterOrSort.appendChild(opt);
      });

      // аудитории
      (dataCache.auditorii || []).forEach(a => {
        const opt = document.createElement("option");
        opt.value = "aud-" + a.id;
        opt.textContent = "А:" + a.number;
        filterOrSort.appendChild(opt);
      });

      // --- Фильтр по выпадающему списку (по DOM, без dataCache.itog) ---
      filterOrSort.onchange = () => {
        const val = filterOrSort.value;
        const rows = Array.from(document.querySelectorAll('#main-table tbody tr'));

        // Показываем все строки сначала
        rows.forEach(tr => { tr.style.display = ''; });

        if (!val) return; // если выбрано "Фильтр" — показываем всё

        const parts = val.split('-');
        const prefix = parts[0];
        const idPart = parts[1];

        rows.forEach(tr => {
          const gid = tr.dataset.groupId || '';
          const pid = tr.dataset.prepId || '';
          const aid = tr.dataset.audId || '';

          let hide = false;
          if (prefix === 'group' && gid !== idPart) hide = true;
          if (prefix === 'prep' && pid !== idPart) hide = true;
          if (prefix === 'aud' && aid !== idPart) hide = true;

          if (hide) tr.style.display = 'none';
        });
      };

      // --- Поиск по всем полям (по DOM, без dataCache.itog) ---
      filterInput.oninput = () => {
        const text = filterInput.value.trim().toLowerCase();
        const rows = Array.from(document.querySelectorAll('#main-table tbody tr'));

        if (!text) {
          rows.forEach(tr => { tr.style.display = ''; });
          return;
        }

        rows.forEach(tr => {
          const txt = (tr.textContent || '').toLowerCase();
          tr.style.display = txt.includes(text) ? '' : 'none';
        });
      };

    } else {
      // --- Остальные вкладки: сортировка ---
      filterOrSort.innerHTML = `
        <option value="">Сортировка</option>
        <option value="id-asc">ID ↑</option>
        <option value="id-desc">ID ↓</option>
        <option value="name-asc">А–Я</option>
        <option value="name-desc">Я–А</option>
      `;
      filterOrSort.onchange = () => applySortUI();
      filterInput.oninput = () => applySearchUI();
    }
  }

    function openWordExportModal() {
        const modal = document.getElementById('modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        document.getElementById('modal-title').textContent = 'Экспорт в Word';

        const fields = document.getElementById('modal-fields');
        fields.innerHTML = '';
        fields.style.display = 'flex';
        fields.style.flexDirection = 'column';
        fields.style.gap = '0.75rem';

        const addField = (labelText, el) => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.flexDirection = 'column';
            const span = document.createElement('span');
            span.textContent = labelText;
            label.appendChild(span);
            label.appendChild(el);
            fields.appendChild(label);
        };

        // Группа
        const selGroup = document.createElement('select');
        selGroup.id = 'f_group_export';

        // Проверяем, что группы есть
        console.log('dataCache.groups', dataCache.groups);

        if (Array.isArray(dataCache.groups) && dataCache.groups.length > 0) {
            // Очищаем селект на всякий случай
            selGroup.innerHTML = '';
            // Добавляем пустой вариант
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Выберите группу --';
            selGroup.appendChild(emptyOption);

            // Добавляем группы
            dataCache.groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.name || g.group_name || g.id; // берём name, group_name или id
                opt.textContent = g.name || g.group_name || `Группа ${g.id}`;
                selGroup.appendChild(opt);
            });
        } else {
            // Если групп нет, выводим сообщение
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Нет доступных групп';
            selGroup.appendChild(opt);
        }

        addField('Выберите группу', selGroup);

        // Даты
        const dateStart = document.createElement('input');
        dateStart.type = 'date';
        dateStart.id = 'f_date_start';
        addField('Дата начала', dateStart);

        const dateEnd = document.createElement('input');
        dateEnd.type = 'date';
        dateEnd.id = 'f_date_end';
        addField('Дата окончания', dateEnd);

        // Кнопки
        const btnSave = document.getElementById('modal-save');
        const btnCancel = document.getElementById('modal-cancel');

        btnSave.onclick = async () => {
            const group = selGroup.value;
            const start = dateStart.value;
            const end = dateEnd.value;

            const params = new URLSearchParams();
            if (group) params.append('group', group);
            if (start) params.append('date_start', start);
            if (end) params.append('date_end', end);

            const url = '/api/export_word' + (params.toString() ? '?' + params.toString() : '');
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Word export failed');
                const blob = await resp.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `Расписание_группы_${group || 'все'}.docx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (e) {
                console.error('word export error', e);
                alert('Ошибка экспорта в Word (см. консоль)');
            } finally {
                closeModal();
            }
        };

        btnCancel.onclick = closeModal;
    }


  // applySort for UI (uses server data fetched into cache)
  async function applySortUI() {
    const value = filterOrSort.value;
    let data = dataCache[currentTab] || [];
    let sorted = [...data];

    if (value.includes("id")) {
      sorted.sort((a, b) => value.endsWith("asc") ? (a.id - b.id) : (b.id - a.id));
    } else if (value.includes("name")) {
      const key = currentTab === "preps" ? "fio" :
                  currentTab === "auditorii" ? "number" : "name";
      sorted.sort((a, b) =>
        value.endsWith("asc")
          ? (String(a[key] || '').localeCompare(String(b[key] || ''), "ru"))
          : (String(b[key] || '').localeCompare(String(a[key] || ''), "ru"))
      );
    }
    renderTable(currentTab, sorted);
  }

  // applySearch for UI
  function applySearchUI() {
    const text = filterInput.value.trim().toLowerCase();
    let data = dataCache[currentTab] || [];

    if (currentTab === "itog") {
      if (text) {
        data = data.filter(d => {
          return (
            (d.object_name || "").toLowerCase().includes(text) ||
            (d.group_name || "").toLowerCase().includes(text) ||
            (d.prep_fio || "").toLowerCase().includes(text) ||
            (d.aud_number || "").toLowerCase().includes(text) ||
            (d.type || "").toLowerCase().includes(text) ||
            (d.date || "").toLowerCase().includes(text) ||
            (d.time || "").toLowerCase().includes(text)
          );
        });
      }
    } else {
      if (text)
        data = data.filter(d =>
          Object.values(d)
            .some(v => String(v).toLowerCase().includes(text))
        );
    }

    renderTable(currentTab, data);
  }

  // tabs switching
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      setActiveTab(tab.dataset.tab);
      setupFilterOrSortUI(tab.dataset.tab);
    });
  });

  // Первая загрузка
  setActiveTab("itog");
  setupFilterOrSortUI("itog");
      // Привязка кнопки Word к открытию модального окна
    const btnWord = document.querySelector('.export-option[data-format="word"]');
    if (btnWord) {
        btnWord.addEventListener('click', openWordExportModal);
    }

});

// End of file