(() => {
  'use strict';

  /* ----------------------------------------------------------------
     1. CONFIGURAÇÃO DAS MESAS
     Posições em % (x = left, y = top) relativas à imagem da planta.
     Ajuste aqui se trocar a imagem por uma planta diferente.
  ---------------------------------------------------------------- */
  const TABLES = [
    { id: '1',  label: '1',  capacity: 8,  x: 13.60, y: 76.55 },
    { id: '2',  label: '2',  capacity: 8,  x: 20.03, y: 76.55 },
    { id: '3',  label: '3',  capacity: 8,  x: 26.55, y: 76.55 },
    { id: '4',  label: '4',  capacity: 8,  x: 13.60, y: 63.43 },
    { id: '5',  label: '5',  capacity: 8,  x: 20.03, y: 63.43 },
    { id: '6',  label: '6',  capacity: 8,  x: 26.55, y: 63.43 },
    { id: '7',  label: '7 · noivos', capacity: 2, x: 65.13, y: 72.73 },
    { id: '8',  label: '8',  capacity: 8,  x: 51.28, y: 53.72 },
    { id: '9',  label: '9',  capacity: 8,  x: 58.12, y: 53.72 },
    { id: '10', label: '10', capacity: 8,  x: 65.29, y: 53.72 },
    { id: '11', label: '11', capacity: 8,  x: 50.70, y: 42.87 },
    { id: '12', label: '12', capacity: 8,  x: 57.46, y: 42.87 },
    { id: '13', label: '13', capacity: 8,  x: 64.13, y: 42.87 },
    { id: '14', label: '14', capacity: 8,  x: 13.19, y: 38.12 },
    { id: '15', label: '15', capacity: 8,  x: 20.36, y: 38.12 },
    { id: '16', label: '16', capacity: 8,  x: 26.96, y: 38.12 },
    { id: '17', label: '17', capacity: 8,  x: 13.19, y: 27.38 },
    { id: '18', label: '18', capacity: 8,  x: 20.36, y: 27.38 },
    { id: '19', label: '19', capacity: 8,  x: 26.96, y: 27.27 },
    { id: '20', label: 'Família', capacity: 14, x: 53.99, y: 26.65, wide: true },
    { id: '21', label: '21', capacity: 8,  x: 65.29, y: 26.24 },
    { id: '22', label: '22', capacity: 8,  x: 75.19, y: 25.72 },
    { id: '23', label: '23', capacity: 8,  x: 83.84, y: 26.14 },
    { id: '24', label: '24', capacity: 8,  x: 86.73, y: 59.61 },
  ];

  const STORAGE_KEY = 'mapa-mesas-casamento-v1';

  /* ----------------------------------------------------------------
     2. ESTADO
  ---------------------------------------------------------------- */
  let state = {
    guests: [],       // { id, name, table: string|null }
    extraTables: [],  // { id, label, capacity }
    nextGuestId: 1,
    nextExtraId: 1,
  };

  let selectedTableId = null;
  let searchTerm = '';

  function allTables() {
    return [...TABLES, ...state.extraTables];
  }

  function findTable(id) {
    return allTables().find(t => t.id === id);
  }

  function guestsOf(tableId) {
    return state.guests.filter(g => g.table === tableId);
  }

  /* ----------------------------------------------------------------
     3. PERSISTÊNCIA (localStorage)
  ---------------------------------------------------------------- */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* localStorage indisponível — segue sem persistir */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(state, parsed);
      }
    } catch (e) { /* ignora dados corrompidos */ }
  }

  /* ----------------------------------------------------------------
     4. RENDER
  ---------------------------------------------------------------- */
  const plantContainer = document.getElementById('plantContainer');
  const extraTablesEl = document.getElementById('extraTables');
  const guestListEl = document.getElementById('guestList');
  const emptyHint = document.getElementById('emptyHint');
  const sidebarDrop = document.getElementById('sidebarDrop');
  const detailPanel = document.getElementById('detailPanel');
  const detailTitle = document.getElementById('detailTitle');
  const detailCapacity = document.getElementById('detailCapacity');
  const detailList = document.getElementById('detailList');
  const removeTableBtn = document.getElementById('removeTableBtn');
  const unallocatedCountEl = document.getElementById('unallocatedCount');

  function initials(name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  function renderTables() {
    plantContainer.querySelectorAll('.table').forEach(el => el.remove());
    TABLES.forEach(t => plantContainer.appendChild(buildTableEl(t, false)));

    extraTablesEl.innerHTML = '';
    state.extraTables.forEach(t => extraTablesEl.appendChild(buildTableEl(t, true)));
  }

  // Desenha a mesa com as cadeiras ao redor (quantidade = capacidade).
  // Cadeiras douradas preenchidas = lugar ocupado; contorno apagado = livre.
  function buildTableSVG(capacity, occupied) {
    const size = 100, cx = 50, cy = 50;
    const tableR = capacity > 10 ? 24 : 20;
    const chairR = tableR + 11;
    const chairLen = capacity > 10 ? 8 : 9;
    const chairWid = 4.6;
    let chairs = '';
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2;
      const deg = angle * 180 / Math.PI + 90;
      const x = cx + chairR * Math.cos(angle);
      const y = cy + chairR * Math.sin(angle);
      const on = i < occupied;
      chairs += `<rect x="${-chairWid / 2}" y="${-chairLen / 2}" width="${chairWid}" height="${chairLen}" rx="1.6"
        transform="translate(${x} ${y}) rotate(${deg})"
        fill="${on ? 'var(--gold)' : 'none'}" stroke="${on ? 'var(--gold)' : 'var(--gold-dim)'}" stroke-width="1" />`;
    }
    return `<svg viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${tableR}" fill="#17140c" stroke="var(--gold)" stroke-width="1.4" />
      <circle cx="${cx}" cy="${cy}" r="${tableR - 5}" fill="none" stroke="var(--gold-dim)" stroke-width="0.6" />
      ${chairs}
    </svg>`;
  }

  function buildTableEl(t, isExtra) {
    const el = document.createElement('div');
    el.className = 'table' + (t.wide ? ' table--wide' : '') + (isExtra ? ' extra-table' : '');
    el.dataset.tableId = t.id;
    if (!isExtra) {
      el.style.left = t.x + '%';
      el.style.top = t.y + '%';
    }

    const count = guestsOf(t.id).length;
    el.innerHTML = `
      ${buildTableSVG(t.capacity, count)}
      <span class="table__count">${escapeHtml(t.label)} · ${count}/${t.capacity}</span>
    `;
    el.classList.toggle('has-guests', count > 0);
    el.classList.toggle('is-full', count >= t.capacity);
    el.classList.toggle('selected', t.id === selectedTableId);
    el.title = `Mesa ${t.label} — ${count}/${t.capacity} lugares`;

    el.addEventListener('click', () => openDetail(t.id));
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const val = prompt(`Capacidade da mesa "${t.label}":`, t.capacity);
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        t.capacity = num;
        save();
        renderAll();
      }
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('dragover');
    });
    el.addEventListener('dragleave', () => el.classList.remove('dragover'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('dragover');
      const guestId = e.dataTransfer.getData('text/plain');
      assignGuest(guestId, t.id);
    });

    return el;
  }

  function renderGuestList() {
    const unallocated = state.guests
      .filter(g => !g.table)
      .filter(g => normalize(g.name).includes(normalize(searchTerm)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    guestListEl.innerHTML = '';
    unallocated.forEach(g => guestListEl.appendChild(buildChip(g)));

    const totalUnallocated = state.guests.filter(g => !g.table).length;
    unallocatedCountEl.textContent = totalUnallocated;
    emptyHint.classList.toggle('show', state.guests.length === 0);
  }

  function buildChip(guest) {
    const li = document.createElement('li');
    li.className = 'guest-chip';
    li.draggable = true;
    li.dataset.guestId = guest.id;
    li.innerHTML = `
      <span class="guest-chip__avatar">${escapeHtml(initials(guest.name))}</span>
      <span class="guest-chip__name">${escapeHtml(guest.name)}</span>
    `;
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', guest.id);
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    return li;
  }

  function renderStats() {
    const total = state.guests.length;
    const alocados = state.guests.filter(g => g.table).length;
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAlocados').textContent = alocados;
    document.getElementById('statLivres').textContent = total - alocados;
    const totalSeats = allTables().reduce((sum, t) => sum + t.capacity, 0);
    document.getElementById('statLugares').textContent = totalSeats;
  }

  function renderDetail() {
    if (!selectedTableId) {
      detailPanel.classList.remove('open');
      return;
    }
    const t = findTable(selectedTableId);
    if (!t) { selectedTableId = null; detailPanel.classList.remove('open'); return; }

    detailPanel.classList.add('open');
    detailTitle.textContent = `Mesa ${t.label}`;
    const count = guestsOf(t.id).length;
    detailCapacity.textContent = `${count} de ${t.capacity} lugares ocupados`;

    detailList.innerHTML = '';
    guestsOf(t.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .forEach(g => {
        const li = document.createElement('li');
        li.className = 'guest-chip';
        li.draggable = true;
        li.dataset.guestId = g.id;
        li.innerHTML = `
          <span class="guest-chip__avatar">${escapeHtml(initials(g.name))}</span>
          <span class="guest-chip__name">${escapeHtml(g.name)}</span>
          <button class="guest-chip__remove" aria-label="Desalocar">×</button>
        `;
        li.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', g.id);
          li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
        li.querySelector('.guest-chip__remove').addEventListener('click', () => {
          assignGuest(g.id, null);
        });
        detailList.appendChild(li);
      });

    removeTableBtn.hidden = !state.extraTables.some(et => et.id === t.id);
  }

  function renderAll() {
    renderTables();
    renderGuestList();
    renderStats();
    renderDetail();
    save();
  }

  /* ----------------------------------------------------------------
     5. AÇÕES
  ---------------------------------------------------------------- */
  function assignGuest(guestId, tableId) {
    const guest = state.guests.find(g => g.id === guestId);
    if (!guest) return;

    if (tableId) {
      const t = findTable(tableId);
      if (!t) return;
      const already = guestsOf(tableId).some(g => g.id === guestId);
      if (!already && guestsOf(tableId).length >= t.capacity) {
        showToast(`Mesa ${t.label} já está com todos os lugares ocupados.`);
        return;
      }
    }

    guest.table = tableId || null;
    renderAll();
  }

  function openDetail(tableId) {
    selectedTableId = selectedTableId === tableId ? null : tableId;
    renderDetail();
    document.querySelectorAll('.table').forEach(el => {
      el.classList.toggle('selected', el.dataset.tableId === selectedTableId);
    });
  }

  function addGuest(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    state.guests.push({ id: 'g' + (state.nextGuestId++), name: trimmed, table: null });
  }

  function addExtraTable() {
    const id = 'extra-' + (state.nextExtraId++);
    state.extraTables.push({ id, label: `Externa ${state.nextExtraId - 1}`, capacity: 8 });
    renderAll();
  }

  function removeExtraTable(id) {
    const t = findTable(id);
    if (t && guestsOf(id).length > 0) {
      showToast('Desaloque os convidados dessa mesa antes de removê-la.');
      return;
    }
    state.extraTables = state.extraTables.filter(t => t.id !== id);
    if (selectedTableId === id) selectedTableId = null;
    renderAll();
  }

  function resetAll() {
    if (!confirm('Isso vai apagar todos os convidados e mesas externas. Deseja continuar?')) return;
    state = { guests: [], extraTables: [], nextGuestId: 1, nextExtraId: 1 };
    selectedTableId = null;
    renderAll();
  }

  /* ----------------------------------------------------------------
     6. IMPORTAÇÃO
  ---------------------------------------------------------------- */
  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      let names = [];
      const ext = file.name.split('.').pop().toLowerCase();

      try {
        if (ext === 'json') {
          names = parseJsonGuests(JSON.parse(text));
        } else if (ext === 'csv') {
          names = parseCsvGuests(text);
        } else {
          names = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        }
      } catch (e) {
        showToast('Não foi possível ler o arquivo. Verifique o formato.');
        return;
      }

      if (names.length === 0) {
        showToast('Nenhum nome encontrado no arquivo.');
        return;
      }

      names.forEach(addGuest);
      renderAll();
      showToast(`${names.length} convidado(s) importado(s).`);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function parseJsonGuests(data) {
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return String(item.nome || item.name || item.convidado || '').trim();
        }
        return '';
      }).filter(Boolean);
    }
    return [];
  }

  function parseCsvGuests(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const firstCell = lines[0].split(',')[0].trim().toLowerCase().replace(/"/g, '');
    const headerWords = ['nome', 'convidado', 'name', 'guest'];
    const startIdx = headerWords.includes(firstCell) ? 1 : 0;

    return lines.slice(startIdx)
      .map(line => line.split(',')[0].replace(/"/g, '').trim())
      .filter(Boolean);
  }

  /* ----------------------------------------------------------------
     7. EXPORTAÇÃO
  ---------------------------------------------------------------- */
  function tableLabelFor(guest) {
    if (!guest.table) return 'Não alocado';
    const t = findTable(guest.table);
    return t ? `Mesa ${t.label}` : 'Não alocado';
  }

  function exportCsv() {
    const rows = [['Convidado', 'Mesa']];
    state.guests
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .forEach(g => rows.push([g.name, tableLabelFor(g)]));

    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
    downloadFile(csv, 'mapeamento-mesas.csv', 'text/csv;charset=utf-8');
  }

  function exportJson() {
    const data = state.guests
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map(g => ({
        convidado: g.name,
        mesa: g.table ? findTable(g.table)?.label ?? null : null,
        mesaId: g.table || null,
      }));
    downloadFile(JSON.stringify(data, null, 2), 'mapeamento-mesas.json', 'application/json');
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function csvEscape(value) {
    const s = String(value ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  /* ----------------------------------------------------------------
     8. UTIL
  ---------------------------------------------------------------- */
  function normalize(str) {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  /* ----------------------------------------------------------------
     9. EVENTOS GLOBAIS
  ---------------------------------------------------------------- */
  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  });

  document.getElementById('addGuestForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('addGuestInput');
    if (input.value.trim()) {
      addGuest(input.value);
      input.value = '';
      renderAll();
    }
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderGuestList();
  });

  const gearBtn = document.getElementById('gearBtn');
  const optionsMenu = document.getElementById('optionsMenu');

  function closeMenu() {
    optionsMenu.classList.remove('open');
    gearBtn.setAttribute('aria-expanded', 'false');
  }

  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !optionsMenu.classList.contains('open');
    optionsMenu.classList.toggle('open', willOpen);
    gearBtn.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (e) => {
    if (!optionsMenu.contains(e.target) && e.target !== gearBtn) closeMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  document.getElementById('exportCsvBtn').addEventListener('click', () => { exportCsv(); closeMenu(); });
  document.getElementById('exportJsonBtn').addEventListener('click', () => { exportJson(); closeMenu(); });
  document.getElementById('resetBtn').addEventListener('click', () => { resetAll(); closeMenu(); });
  document.getElementById('addTableBtn').addEventListener('click', addExtraTable);
  document.getElementById('detailClose').addEventListener('click', () => { selectedTableId = null; renderDetail(); });
  document.getElementById('removeTableBtn').addEventListener('click', () => {
    if (selectedTableId) removeExtraTable(selectedTableId);
  });

  // Sidebar como dropzone: soltar um convidado aqui desaloca.
  sidebarDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    guestListEl.classList.add('dragover');
  });
  sidebarDrop.addEventListener('dragleave', (e) => {
    if (!sidebarDrop.contains(e.relatedTarget)) guestListEl.classList.remove('dragover');
  });
  sidebarDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    guestListEl.classList.remove('dragover');
    const guestId = e.dataTransfer.getData('text/plain');
    assignGuest(guestId, null);
  });

  /* ----------------------------------------------------------------
     10. INIT
  ---------------------------------------------------------------- */
  load();
  renderAll();
})();
