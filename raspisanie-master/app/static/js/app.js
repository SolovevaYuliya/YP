// app/static/js/app.js
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

async function apiPost(path, data) {
  let options;
  if (data instanceof FormData) {
    options = { method: 'POST', body: data };
  } else {
    options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
  }
  const resp = await fetch('/api' + path, options);
  if (!resp.ok) { const t = await resp.text(); throw new Error(t || resp.status); }
  return await resp.json();
}

async function apiPut(path, data) {
  let options;
  if (data instanceof FormData) {
    options = { method: 'PUT', body: data };
  } else {
    options = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
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

// --- Render Logic ---
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
      tr.dataset.groupId = r.group_id != null ? String(r.group_id) : '0';
      tr.dataset.prepId = r.prep_id != null ? String(r.prep_id) : '0';
      tr.dataset.audId = r.aud_id != null ? String(r.aud_id) : '0';

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

async function loadDataForTab(tab) {
  try {
    if (tab === 'itog') {
      const [groups, objects, preps, auds] = await Promise.all([
        apiGet('/groups'), apiGet('/objects'), apiGet('/preps'), apiGet('/auditorii')
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
  if ($('filter-or-sort')) $('filter-or-sort').value = '';
  if ($('filter-input')) $('filter-input').value = '';
  loadDataForTab(tab);
}

// --- Modals (Create / Edit) ---

function openModalForCreate() {
  const modal = $('modal'); if (!modal) return;
  modal.classList.remove('hidden');
  $('modal-title').textContent = currentTab === 'itog' ? 'Добавить занятие' : 'Добавить запись';
  const fields = $('modal-fields'); if (!fields) return;
  fields.innerHTML = '';
  fields.style.display = 'flex'; fields.style.flexDirection = 'column'; fields.style.gap = '0.75rem';

  const addField = (labelText, el) => {
    const label = document.createElement('label');
    label.style.display = 'flex'; label.style.flexDirection = 'column';
    const title = document.createElement('span'); title.textContent = labelText;
    label.appendChild(title); label.appendChild(el);
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

    addField('Дата', date); addField('Время', time);
    addField('Предмет', subj); addField('Группа', group);
    addField('Преподаватель', prep); addField('Аудитория', aud);
    addField('Тип', type);

    fillSelectOptions('f_object', dataCache.objects || [], 'name');
    fillSelectOptions('f_group', dataCache.groups || [], 'name');
    fillSelectOptions('f_prep', dataCache.preps || [], 'fio');
    fillSelectOptions('f_aud', dataCache.auditorii || [], 'number');

    $('modal-save').onclick = async () => {
      const payload = {
        data: $('f_date').value || null,
        time: $('f_time').value || null,
        id_obj_fk: $('f_object').value ? parseInt($('f_object').value) : null,
        id_group_fk: $('f_group').value ? parseInt($('f_group').value) : null,
        id_prep_fk: $('f_prep').value ? parseInt($('f_prep').value) : null,
        id_au_fk: $('f_aud').value ? parseInt($('f_aud').value) : null,
        type: $('f_type').value || null
      };
      try { await apiPost('/itog', payload); closeModal(); await loadDataForTab('itog'); }
      catch (e) { console.error('create itog error', e); alert('Ошибка сохранения (см. консоль)'); }
    };
  } else {
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'f_name';
    addField(currentTab === 'preps' ? 'ФИО' : currentTab === 'auditorii' ? 'Номер' : 'Название', nameInput);

    $('modal-save').onclick = async () => {
      const name = $('f_name').value || '';
      if (!name) { alert('Заполните поле'); return; }
      try {
        let payload = {};
        let url = '';
        if (currentTab === 'groups') { payload = { name: name }; url = '/groups'; }
        if (currentTab === 'preps') { payload = { fio: name }; url = '/preps'; }
        if (currentTab === 'objects') { payload = { name: name }; url = '/objects'; }
        if (currentTab === 'auditorii') { payload = { number: name }; url = '/auditorii'; }

        await apiPost(url, payload);
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
  const fields = $('modal-fields'); fields.innerHTML = '';
  fields.style.display = 'flex'; fields.style.flexDirection = 'column'; fields.style.gap = '0.75rem';

  const addField = (labelText, el) => {
    const label = document.createElement('label');
    label.style.display = 'flex'; label.style.flexDirection = 'column';
    const title = document.createElement('span'); title.textContent = labelText;
    label.appendChild(title); label.appendChild(el);
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

    addField('Дата', date); addField('Время', time);
    addField('Предмет', subj); addField('Группа', group);
    addField('Преподаватель', prep); addField('Аудитория', aud);
    addField('Тип', type);

    fillSelectOptions('f_object', dataCache.objects || [], 'name', item.object_id);
    fillSelectOptions('f_group', dataCache.groups || [], 'name', item.group_id);
    fillSelectOptions('f_prep', dataCache.preps || [], 'fio', item.prep_id);
    fillSelectOptions('f_aud', dataCache.auditorii || [], 'number', item.aud_id);

    $('modal-save').onclick = async () => {
      const payload = {
        data: $('f_date').value || null,
        time: $('f_time').value || null,
        id_obj_fk: $('f_object').value ? parseInt($('f_object').value) : null,
        id_group_fk: $('f_group').value ? parseInt($('f_group').value) : null,
        id_prep_fk: $('f_prep').value ? parseInt($('f_prep').value) : null,
        id_au_fk: $('f_aud').value ? parseInt($('f_aud').value) : null,
        type: $('f_type').value || null
      };
      try { await apiPut('/itog/' + id, payload); closeModal(); await loadDataForTab('itog'); }
      catch (e) { console.error('update itog error', e); alert('Ошибка обновления (см. консоль)'); }
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
        let payload = {};
        let url = '';
        if (currentTab === 'groups') { payload = { name: v }; url = '/groups/' + id; }
        if (currentTab === 'preps') { payload = { fio: v }; url = '/preps/' + id; }
        if (currentTab === 'objects') { payload = { name: v }; url = '/objects/' + id; }
        if (currentTab === 'auditorii') { payload = { number: v }; url = '/auditorii/' + id; }

        await apiPut(url, payload);
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

function fillSelectOptions(selId, items, key, selectedId) {
  const sel = $(selId); if (!sel) return;
  sel.innerHTML = '<option value="">— none —</option>';
  (items || []).forEach(it => {
    const o = document.createElement('option');
    o.value = it.id;
    o.textContent = it[key] || '';
    if (selectedId != null && String(it.id) === String(selectedId)) o.selected = true;
    sel.appendChild(o);
  });
}

// --- Delete ---
async function deleteSelected() {
  const tr = document.querySelector('#main-table tbody tr.selected');
  if (!tr) { alert('Выберите строку'); return; }
  if (!confirm('Удалить?')) return;
  const id = tr.dataset.id;
  try {
    let url = '';
    if (currentTab === 'itog') url = '/itog/' + id;
    if (currentTab === 'groups') url = '/groups/' + id;
    if (currentTab === 'preps') url = '/preps/' + id;
    if (currentTab === 'objects') url = '/objects/' + id;
    if (currentTab === 'auditorii') url = '/auditorii/' + id;

    await apiDelete(url);
    await loadDataForTab(currentTab);
  } catch (e) { console.error('delete error', e); alert('Ошибка удаления (см. консоль)'); }
}

// --- Import/Export ---
async function handleImport(e) {
  const f = e.target.files[0]; if (!f) return;
  const fd = new FormData(); fd.append('file', f);
  try {
    const res = await fetch('/api/import', { method: 'POST', body: fd });
    if(!res.ok) throw new Error("Import failed");
    const json = await res.json();
    alert('Импортировано: ' + (json.count || 0));
    await loadDataForTab('itog');
  } catch (err) { console.error('import error', err); alert('Ошибка импорта'); }
  finally { e.target.value = ''; }
}

async function exportPdf() {
    try {
        const resp = await fetch('/api/export_pdf');
        if (!resp.ok) throw new Error('PDF export failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        const today = new Date();
        a.download = `Приказ_расписание_${today.toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('Ошибка экспорта в PDF'); }
}

async function exportExcel() {
    try {
        const resp = await fetch('/api/export_excel');
        if (!resp.ok) throw new Error('Excel export failed');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'Ведомость_нагрузки.xlsx';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('Ошибка экспорта в Excel'); }
}

function openWordExportModal() {
    const modal = document.getElementById('modal'); if (!modal) return;
    modal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = 'Экспорт в Word';
    const fields = document.getElementById('modal-fields'); fields.innerHTML = '';
    fields.style.display = 'flex'; fields.style.flexDirection = 'column'; fields.style.gap = '0.75rem';

    const addField = (lbl, el) => {
        const l = document.createElement('label'); l.style.display='flex'; l.style.flexDirection='column';
        l.appendChild(document.createTextNode(lbl)); l.appendChild(el); fields.appendChild(l);
    };

    const selGroup = document.createElement('select'); selGroup.id = 'f_group_export';
    selGroup.innerHTML = '<option value="">-- Выберите группу --</option>';
    (dataCache.groups || []).forEach(g => {
        const opt = document.createElement('option'); opt.value = g.name || g.id; opt.textContent = g.name || g.id; selGroup.appendChild(opt);
    });
    addField('Выберите группу', selGroup);

    const ds = document.createElement('input'); ds.type='date'; addField('Дата начала', ds);
    const de = document.createElement('input'); de.type='date'; addField('Дата окончания', de);

    $('modal-save').onclick = async () => {
        const g = selGroup.value; const s = ds.value; const e = de.value;
        const p = new URLSearchParams();
        if(g) p.append('group', g); if(s) p.append('date_start', s); if(e) p.append('date_end', e);
        try {
            const resp = await fetch('/api/export_word?' + p.toString());
            if(!resp.ok) throw new Error('Err');
            const blob = await resp.blob();
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Расписание.docx`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch(ex) { console.error(ex); alert('Ошибка экспорта'); }
        finally { closeModal(); }
    };
    $('modal-cancel').onclick = closeModal;
}

function setupExportDropdown() {
  const btn = $('export-dropdown-btn'); const menu = $('export-menu');
  if(!btn || !menu) return;
  btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); };
  document.onclick = () => menu.classList.add('hidden');
  document.querySelectorAll('.export-option').forEach(o => {
      o.onclick = async (e) => {
          e.stopPropagation(); menu.classList.add('hidden');
          const fmt = e.target.dataset.format;
          if(fmt === 'word') openWordExportModal();
          if(fmt === 'pdf') await exportPdf();
          if(fmt === 'excel') await exportExcel();
      };
  });
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const filterOrSort = document.querySelector("#filter-or-sort");
  const filterInput = document.querySelector("#filter-input");

  const btnCreate = $('add-btn');
  const btnEdit = $('edit-btn');
  const btnDelete = $('delete-btn');
  const inpImport = $('import-file');

  if (btnCreate) btnCreate.onclick = openModalForCreate;
  if (btnEdit) btnEdit.onclick = openModalForEdit;
  if (btnDelete) btnDelete.onclick = deleteSelected;
  if (inpImport) inpImport.onchange = handleImport;

  setupExportDropdown();

  const btnTheme = document.getElementById("theme-toggle");
  let theme = localStorage.getItem("theme") || "light";
  if (theme === "dark") document.body.classList.add("dark");

  if (btnTheme) btnTheme.onclick = () => {
      theme = theme === "light" ? "dark" : "light";
      document.body.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
  }; // Исправлено здесь!

  const tbody = document.querySelector('#main-table tbody');

  tbody.onclick = (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    document.querySelectorAll('#main-table tbody tr').forEach(row => {
      row.classList.remove('selected');
    });
    tr.classList.add('selected');
  };


  function setupFilterOrSortUI(tab) {
    if (!filterOrSort || !filterInput) return;
    filterOrSort.innerHTML = ''; filterInput.value = '';

    if (tab === "itog") {
      const def = document.createElement("option"); def.value = ""; def.textContent = "Фильтр"; filterOrSort.appendChild(def);
      (dataCache.groups || []).forEach(g => { const o = document.createElement("option"); o.value = "group-" + g.id; o.textContent = "Г:" + g.name; filterOrSort.appendChild(o); });
      (dataCache.preps || []).forEach(p => { const o = document.createElement("option"); o.value = "prep-" + p.id; o.textContent = "П:" + p.fio; filterOrSort.appendChild(o); });
      (dataCache.auditorii || []).forEach(a => { const o = document.createElement("option"); o.value = "aud-" + a.id; o.textContent = "А:" + a.number; filterOrSort.appendChild(o); });

      filterOrSort.onchange = () => {
        const val = filterOrSort.value;
        const rows = document.querySelectorAll('#main-table tbody tr');
        rows.forEach(tr => tr.style.display = '');
        if (!val) return;
        const [prefix, id] = val.split('-');
        rows.forEach(tr => {
            let hide = false;
            if (prefix === 'group' && tr.dataset.groupId !== id) hide = true;
            if (prefix === 'prep' && tr.dataset.prepId !== id) hide = true;
            if (prefix === 'aud' && tr.dataset.audId !== id) hide = true;
            if (hide) tr.style.display = 'none';
        });
      };

      filterInput.oninput = () => {
          const txt = filterInput.value.trim().toLowerCase();
          document.querySelectorAll('#main-table tbody tr').forEach(tr => {
             tr.style.display = tr.textContent.toLowerCase().includes(txt) ? '' : 'none';
          });
      };
    } else {
      filterOrSort.innerHTML = `<option value="">Сортировка</option><option value="id-asc">ID ↑</option><option value="id-desc">ID ↓</option><option value="name-asc">А–Я</option><option value="name-desc">Я–А</option>`;
      filterOrSort.onchange = () => {
         const v = filterOrSort.value;
         let sorted = [...(dataCache[currentTab] || [])];
         if(v.includes("id")) sorted.sort((a,b)=>v.endsWith("asc")?a.id-b.id:b.id-a.id);
         else if(v.includes("name")) {
             const k = currentTab === "preps" ? "fio" : currentTab === "auditorii" ? "number" : "name";
             sorted.sort((a,b)=>v.endsWith("asc") ? String(a[k]).localeCompare(String(b[k])) : String(b[k]).localeCompare(String(a[k])));
         }
         renderTable(currentTab, sorted);
      };
      filterInput.oninput = () => {
          const txt = filterInput.value.trim().toLowerCase();
          const d = (dataCache[currentTab] || []).filter(x => Object.values(x).some(v=>String(v).toLowerCase().includes(txt)));
          renderTable(currentTab, d);
      };
    }
  }

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove("active")); tab.classList.add("active");
      setActiveTab(tab.dataset.tab); setupFilterOrSortUI(tab.dataset.tab);
    };
  });

  setActiveTab("itog"); setupFilterOrSortUI("itog");
});