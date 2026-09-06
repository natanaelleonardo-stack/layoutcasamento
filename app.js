(() => {
  'use strict';

  /* ----------------------------------------------------------------
     1. CONFIGURAÇÃO DAS MESAS
     Posições em % (x = left, y = top) relativas à imagem da planta.
     Ajuste aqui se trocar a imagem por uma planta diferente.
  ---------------------------------------------------------------- */
 const TABLES = [
    { id: '1', label: '1', capacity: 8, x: 10, y: 80.98 },
    { id: '2', label: '2', capacity: 8, x: 18.38, y: 81.22 },
    { id: '3', label: '3', capacity: 8, x: 26.84, y: 81.1 },
    { id: '4', label: '4', capacity: 8, x: 10, y: 66.14 },
    { id: '5', label: '5', capacity: 8, x: 18.18, y: 66.01 },
    { id: '6', label: '6', capacity: 8, x: 26.55, y: 66.14 },
    { id: '7', label: '7 · noivos', capacity: 2, x: 68.05, y: 73.34 },
    { id: '8', label: '8', capacity: 8, x: 49.04, y: 57.65 },
    { id: '9', label: '9', capacity: 8, x: 58.31, y: 57.78 },
    { id: '10', label: '10', capacity: 8, x: 67.04, y: 57.16 },
    { id: '11', label: '11', capacity: 8, x: 49.24, y: 43.24 },
    { id: '12', label: '12', capacity: 8, x: 58.04, y: 43.24 },
    { id: '13', label: '13', capacity: 8, x: 66.85, y: 43.24 },
    { id: '14', label: '14', capacity: 8, x: 10.08, y: 36.77 },
    { id: '15', label: '15', capacity: 8, x: 19.58, y: 36.89 },
    { id: '16', label: '16', capacity: 8, x: 29.1, y: 36.89 },
    { id: '17', label: '17', capacity: 8, x: 9.88, y: 22.34 },
    { id: '18', label: '18', capacity: 8, x: 19.48, y: 22.46 },
    { id: '19', label: '19', capacity: 8, x: 29.2, y: 22.47 },
    { id: '20', label: 'Família', capacity: 14, x: 55.55, y: 23.82, wide: true },
    { id: '21', label: '21', capacity: 8, x: 67.72, y: 22.31 },
    { id: '22', label: '22', capacity: 8, x: 80.05, y: 22.15 },
    { id: '23', label: '23', capacity: 8, x: 88.02, y: 22.08 },
    { id: '24', label: '24', capacity: 8, x: 89.26, y: 61.45 },
  ];

  const STORAGE_KEY = 'mapa-mesas-casamento-v1';

  /* ----------------------------------------------------------------
     2. ESTADO
  ---------------------------------------------------------------- */
  let state = {
    guests: [],       // { id, name, table: string|null }
    extraTables: [],  // { id, label, capacity }
    drawings: [],      // { id, type: 'wall'|'circle'|'rect'|'text', ...geometry }
    positions: {},     // { tableId: { x, y } } — sobrescreve a posição padrão das mesas
    nextGuestId: 1,
    nextExtraId: 1,
    nextDrawId: 1,
  };

  let selectedTableId = null;
  let searchTerm = '';
  let selectedDrawId = null;
  let drawMode = false;
  let currentTool = 'select';

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
  // Arrastar a própria mesa para reposicioná-la na planta.
  function startMoveTable(t, downEvent, el) {
    const startClientX = downEvent.clientX;
    const startClientY = downEvent.clientY;
    let moved = false;
    const box = plantContainer.getBoundingClientRect();
    const startXPct = ((startClientX - box.left) / box.width) * 100;
    const startYPct = ((startClientY - box.top) / box.height) * 100;
    const current = state.positions[t.id];
    const origX = current ? current.x : t.x;
    const origY = current ? current.y : t.y;
    let pendingX = origX, pendingY = origY;

    function onMove(e) {
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      if (!moved && Math.hypot(dx, dy) > 4) moved = true;
      if (!moved) return;
      const box2 = plantContainer.getBoundingClientRect();
      const nowXPct = ((e.clientX - box2.left) / box2.width) * 100;
      const nowYPct = ((e.clientY - box2.top) / box2.height) * 100;
      pendingX = origX + (nowXPct - startXPct);
      pendingY = origY + (nowYPct - startYPct);
      el.style.left = pendingX + '%';
      el.style.top = pendingY + '%';
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (moved) {
        state.positions[t.id] = { x: pendingX, y: pendingY };
        suppressNextClick = true;
        save();
      }
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  const seatPopupEl = document.getElementById('seatPopup');

  function buildSeatPopupHTML(t, guests) {
    const capacity = t.capacity;
    let seatSpans = '';
    guests.forEach((g, i) => {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2;
      const r = 42;
      const x = 50 + r * Math.cos(angle);
      const y = 50 + r * Math.sin(angle);
      const firstName = g.name.trim().split(/\s+/)[0];
      seatSpans += `<span class="seat-name" style="left:${x}%; top:${y}%">${escapeHtml(firstName)}</span>`;
    });
    return `
      <div class="seat-popup__title">Mesa ${escapeHtml(t.label)} · ${guests.length}/${capacity}</div>
      <div class="seat-popup__diagram">${buildTableSVG(capacity, guests.length)}${seatSpans}</div>
    `;
  }

  function showSeatPopup(t, el) {
    const guests = guestsOf(t.id).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (guests.length === 0) return;
    seatPopupEl.innerHTML = buildSeatPopupHTML(t, guests);
    seatPopupEl.classList.add('show');

    const rect = el.getBoundingClientRect();
    const popupRect = seatPopupEl.getBoundingClientRect();
    let left = rect.right + 12;
    if (left + popupRect.width > window.innerWidth - 8) left = rect.left - popupRect.width - 12;
    left = Math.max(8, left);
    let top = rect.top + rect.height / 2 - popupRect.height / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - popupRect.height - 8));

    seatPopupEl.style.left = left + 'px';
    seatPopupEl.style.top = top + 'px';
  }

  function hideSeatPopup() {
    seatPopupEl.classList.remove('show');
  }

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

  let suppressNextClick = false;

  function buildTableEl(t, isExtra) {
    const el = document.createElement('div');
    el.className = 'table' + (t.wide ? ' table--wide' : '') + (isExtra ? ' extra-table' : '');
    el.dataset.tableId = t.id;
    if (!isExtra) {
      const pos = state.positions[t.id];
      el.style.left = (pos ? pos.x : t.x) + '%';
      el.style.top = (pos ? pos.y : t.y) + '%';
    }

    const count = guestsOf(t.id).length;
    el.innerHTML = `
      ${buildTableSVG(t.capacity, count)}
      <span class="table__count">${escapeHtml(t.label)} · ${count}/${t.capacity}</span>
    `;
    el.classList.toggle('has-guests', count > 0);
    el.classList.toggle('is-full', count >= t.capacity);
    el.classList.toggle('selected', t.id === selectedTableId);
    el.title = `Mesa ${t.label} — ${count}/${t.capacity} lugares` + (isExtra ? '' : ' · arraste para mover');

    if (!isExtra) {
      el.addEventListener('pointerdown', (e) => {
        if (drawMode) return;
        hideSeatPopup();
        e.stopPropagation();
        startMoveTable(t, e, el);
      });
    }

    el.addEventListener('mouseenter', () => { if (!drawMode) showSeatPopup(t, el); });
    el.addEventListener('mouseleave', hideSeatPopup);

    el.addEventListener('click', () => {
      if (suppressNextClick) { suppressNextClick = false; return; }
      openDetail(t.id);
    });
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
      <button class="guest-chip__icon-btn" data-action="edit" aria-label="Editar nome" title="Editar nome">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
      </button>
      <button class="guest-chip__icon-btn danger" data-action="delete" aria-label="Excluir convidado" title="Excluir convidado">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>
      </button>
    `;
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', guest.id);
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const val = prompt('Editar nome do convidado:', guest.name);
      if (val && val.trim()) renameGuest(guest.id, val);
    });
    li.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGuest(guest.id);
    });
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
          <button class="guest-chip__icon-btn" data-action="edit" aria-label="Editar nome" title="Editar nome">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          </button>
          <button class="guest-chip__icon-btn danger" data-action="delete" aria-label="Excluir convidado" title="Excluir convidado">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>
          </button>
          <button class="guest-chip__remove" aria-label="Desalocar">×</button>
        `;
        li.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', g.id);
          li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
        li.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
          e.stopPropagation();
          const val = prompt('Editar nome do convidado:', g.name);
          if (val && val.trim()) renameGuest(g.id, val);
        });
        li.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteGuest(g.id);
        });
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
    renderDrawings();
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

  function renameGuest(id, newName) {
    const guest = state.guests.find(g => g.id === id);
    if (!guest) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    guest.name = trimmed;
    renderAll();
  }

  function deleteGuest(id) {
    const guest = state.guests.find(g => g.id === id);
    if (!guest) return;
    if (!confirm(`Excluir "${guest.name}" definitivamente da lista?`)) return;
    state.guests = state.guests.filter(g => g.id !== id);
    renderAll();
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
    if (!confirm('Isso vai apagar todos os convidados, mesas externas, desenhos e posições movidas. Deseja continuar?')) return;
    state = { guests: [], extraTables: [], drawings: [], positions: {}, nextGuestId: 1, nextExtraId: 1, nextDrawId: 1 };
    selectedTableId = null;
    selectedDrawId = null;
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
  function exportPositions() {
    const round = (n) => Math.round(n * 100) / 100;
    const lines = TABLES.map(t => {
      const pos = state.positions[t.id];
      const x = pos ? round(pos.x) : t.x;
      const y = pos ? round(pos.y) : t.y;
      const parts = [`id: '${t.id}'`, `label: '${t.label.replace(/'/g, "\\'")}'`, `capacity: ${t.capacity}`, `x: ${x}`, `y: ${y}`];
      if (t.wide) parts.push('wide: true');
      return `    { ${parts.join(', ')} },`;
    });
    const code =
      '// Cole este bloco no lugar do array TABLES no início do app.js\n' +
      '// (substitui as posições antigas pelas que você acabou de arrastar)\n' +
      'const TABLES = [\n' + lines.join('\n') + '\n  ];\n';
    downloadFile(code, 'mesas-posicoes.txt', 'text/plain;charset=utf-8');
    showToast('Baixado! Abra o arquivo e cole substituindo o array TABLES em app.js.');
  }

  function tableLabelFor(guest) {
    if (!guest.table) return 'Não alocado';
    const t = findTable(guest.table);
    return t ? `Mesa ${t.label}` : 'Não alocado';
  }

  function openGuestListModal() {
    const rows = state.guests
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map(g => `<div class="modal-guest-row"><span>${escapeHtml(g.name)}</span><span class="table-tag">${escapeHtml(tableLabelFor(g))}</span></div>`)
      .join('');
    document.getElementById('guestListModalBody').innerHTML = rows || '<p>Nenhum convidado ainda.</p>';
    document.getElementById('guestListModal').hidden = false;
  }

  function closeGuestListModal() {
    document.getElementById('guestListModal').hidden = true;
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
     9. DESENHAR (paredes, círculo, retângulo, caixa de texto)
  ---------------------------------------------------------------- */
  const guestPanel = document.getElementById('guestPanel');
  const drawPanel = document.getElementById('drawPanel');
  const drawSvg = document.getElementById('drawSvg');
  const drawTextLayer = document.getElementById('drawTextLayer');

  function containerBox() {
    return plantContainer.getBoundingClientRect();
  }

  // Converte coordenadas de tela (px) para % independente por eixo,
  // o que permite que um círculo desenhado com raio igual em pixels
  // continue parecendo um círculo mesmo com a imagem não sendo quadrada.
  function pxToPct(clientX, clientY) {
    const box = containerBox();
    return {
      xPct: ((clientX - box.left) / box.width) * 100,
      yPct: ((clientY - box.top) / box.height) * 100,
      w: box.width,
      h: box.height,
    };
  }

  function renderDrawings() {
    drawSvg.innerHTML = '';
    drawTextLayer.innerHTML = '';

    state.drawings.forEach(d => {
      if (d.type === 'text') {
        const box = document.createElement('div');
        box.className = 'draw-text-box' + (d.id === selectedDrawId ? ' selected' : '');
        box.style.left = d.x + '%';
        box.style.top = d.y + '%';
        box.textContent = d.text || 'Texto';
        box.dataset.drawId = d.id;
        box.style.pointerEvents = drawMode ? 'auto' : 'none';
        attachDrawInteraction(box, d);
        drawTextLayer.appendChild(box);
        return;
      }

      const ns = 'http://www.w3.org/2000/svg';
      let el;
      if (d.type === 'wall') {
        el = document.createElementNS(ns, 'line');
        el.setAttribute('x1', d.x1); el.setAttribute('y1', d.y1);
        el.setAttribute('x2', d.x2); el.setAttribute('y2', d.y2);
        el.setAttribute('class', 'draw-wall' + (d.id === selectedDrawId ? ' selected' : ''));
      } else if (d.type === 'circle') {
        el = document.createElementNS(ns, 'ellipse');
        el.setAttribute('cx', d.cx); el.setAttribute('cy', d.cy);
        el.setAttribute('rx', d.rx); el.setAttribute('ry', d.ry);
        el.setAttribute('class', 'draw-shape' + (d.id === selectedDrawId ? ' selected' : ''));
      } else if (d.type === 'rect') {
        el = document.createElementNS(ns, 'rect');
        el.setAttribute('x', d.x); el.setAttribute('y', d.y);
        el.setAttribute('width', d.w); el.setAttribute('height', d.h);
        el.setAttribute('rx', 2);
        el.setAttribute('class', 'draw-shape' + (d.id === selectedDrawId ? ' selected' : ''));
      }
      if (el) {
        el.dataset.drawId = d.id;
        el.style.pointerEvents = drawMode ? 'auto' : 'none';
        attachDrawInteraction(el, d);
        drawSvg.appendChild(el);
      }
    });
  }

  function attachDrawInteraction(el, d) {
    el.addEventListener('pointerdown', (e) => {
      if (!drawMode || currentTool !== 'select') return;
      e.stopPropagation();
      selectDrawing(d.id);
      startMoveDrawing(d, e);
    });
    if (d.type === 'text') {
      el.addEventListener('dblclick', (e) => {
        if (!drawMode) return;
        e.stopPropagation();
        editTextBox(el, d);
      });
    }
  }

  function selectDrawing(id) {
    selectedDrawId = id;
    renderDrawings();
  }

  function startMoveDrawing(d, downEvent) {
    const start = pxToPct(downEvent.clientX, downEvent.clientY);
    const orig = JSON.parse(JSON.stringify(d));

    function onMove(e) {
      const now = pxToPct(e.clientX, e.clientY);
      const dx = now.xPct - start.xPct;
      const dy = now.yPct - start.yPct;
      if (d.type === 'wall') {
        d.x1 = orig.x1 + dx; d.y1 = orig.y1 + dy;
        d.x2 = orig.x2 + dx; d.y2 = orig.y2 + dy;
      } else if (d.type === 'circle') {
        d.cx = orig.cx + dx; d.cy = orig.cy + dy;
      } else if (d.type === 'rect') {
        d.x = orig.x + dx; d.y = orig.y + dy;
      } else if (d.type === 'text') {
        d.x = orig.x + dx; d.y = orig.y + dy;
      }
      renderDrawings();
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      save();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  function editTextBox(el, d) {
    el.contentEditable = 'true';
    el.focus();
    document.execCommand('selectAll', false, null);
    function finish() {
      el.contentEditable = 'false';
      d.text = el.textContent.trim() || 'Texto';
      el.removeEventListener('blur', finish);
      renderDrawings();
      save();
    }
    el.addEventListener('blur', finish);
  }

  function deleteSelectedDrawing() {
    if (!selectedDrawId) {
      showToast('Selecione um desenho na planta para apagar.');
      return;
    }
    state.drawings = state.drawings.filter(d => d.id !== selectedDrawId);
    selectedDrawId = null;
    renderDrawings();
    save();
  }

  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.draw-tool-btn[data-tool]').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
    plantContainer.style.cursor = tool === 'select' ? 'default' : 'crosshair';
  }

  function enterDrawMode() {
    drawMode = true;
    hideSeatPopup();
    guestPanel.hidden = true;
    drawPanel.hidden = false;
    plantContainer.classList.add('draw-mode');
    drawSvg.style.pointerEvents = 'auto';
    setTool('select');
    renderDrawings();
  }

  function exitDrawMode() {
    drawMode = false;
    guestPanel.hidden = false;
    drawPanel.hidden = true;
    plantContainer.classList.remove('draw-mode');
    plantContainer.style.cursor = 'default';
    drawSvg.style.pointerEvents = 'none';
    selectedDrawId = null;
    renderDrawings();
  }

  // Desenhar com arrastar (parede / círculo / retângulo) e clicar (texto)
  let dragStart = null;
  let previewEl = null;

  plantContainer.addEventListener('pointerdown', (e) => {
    if (!drawMode || currentTool === 'select') return;
    if (e.target.closest('.table')) return;

    if (currentTool === 'text') {
      const p = pxToPct(e.clientX, e.clientY);
      const d = { id: 'draw' + (state.nextDrawId++), type: 'text', x: p.xPct, y: p.yPct, text: 'Texto' };
      state.drawings.push(d);
      renderDrawings();
      save();
      const el = drawTextLayer.querySelector(`[data-draw-id="${d.id}"]`);
      if (el) editTextBox(el, d);
      setTool('select');
      return;
    }

    dragStart = pxToPct(e.clientX, e.clientY);
    const ns = 'http://www.w3.org/2000/svg';
    if (currentTool === 'wall') {
      previewEl = document.createElementNS(ns, 'line');
      previewEl.setAttribute('class', 'draw-wall');
      previewEl.setAttribute('x1', dragStart.xPct);
      previewEl.setAttribute('y1', dragStart.yPct);
      previewEl.setAttribute('x2', dragStart.xPct);
      previewEl.setAttribute('y2', dragStart.yPct);
    } else if (currentTool === 'circle') {
      previewEl = document.createElementNS(ns, 'ellipse');
      previewEl.setAttribute('class', 'draw-shape');
      previewEl.setAttribute('cx', dragStart.xPct);
      previewEl.setAttribute('cy', dragStart.yPct);
      previewEl.setAttribute('rx', 0);
      previewEl.setAttribute('ry', 0);
    } else if (currentTool === 'rect') {
      previewEl = document.createElementNS(ns, 'rect');
      previewEl.setAttribute('class', 'draw-shape');
      previewEl.setAttribute('rx', 2);
      previewEl.setAttribute('x', dragStart.xPct);
      previewEl.setAttribute('y', dragStart.yPct);
      previewEl.setAttribute('width', 0);
      previewEl.setAttribute('height', 0);
    }
    if (previewEl) drawSvg.appendChild(previewEl);
  });

  plantContainer.addEventListener('pointermove', (e) => {
    if (!dragStart || !previewEl) return;
    const now = pxToPct(e.clientX, e.clientY);

    if (currentTool === 'wall') {
      previewEl.setAttribute('x2', now.xPct);
      previewEl.setAttribute('y2', now.yPct);
    } else if (currentTool === 'circle') {
      const rPx = Math.hypot((now.xPct - dragStart.xPct) / 100 * now.w, (now.yPct - dragStart.yPct) / 100 * now.h);
      previewEl.setAttribute('rx', (rPx / now.w) * 100);
      previewEl.setAttribute('ry', (rPx / now.h) * 100);
    } else if (currentTool === 'rect') {
      const x = Math.min(dragStart.xPct, now.xPct);
      const y = Math.min(dragStart.yPct, now.yPct);
      previewEl.setAttribute('x', x);
      previewEl.setAttribute('y', y);
      previewEl.setAttribute('width', Math.abs(now.xPct - dragStart.xPct));
      previewEl.setAttribute('height', Math.abs(now.yPct - dragStart.yPct));
    }
  });

  plantContainer.addEventListener('pointerup', (e) => {
    if (!dragStart || !previewEl) { dragStart = null; return; }
    const now = pxToPct(e.clientX, e.clientY);
    let d = null;

    if (currentTool === 'wall') {
      if (Math.hypot(now.xPct - dragStart.xPct, now.yPct - dragStart.yPct) > 0.5) {
        d = { id: 'draw' + (state.nextDrawId++), type: 'wall', x1: dragStart.xPct, y1: dragStart.yPct, x2: now.xPct, y2: now.yPct };
      }
    } else if (currentTool === 'circle') {
      const rPx = Math.hypot((now.xPct - dragStart.xPct) / 100 * now.w, (now.yPct - dragStart.yPct) / 100 * now.h);
      if (rPx > 4) {
        d = { id: 'draw' + (state.nextDrawId++), type: 'circle', cx: dragStart.xPct, cy: dragStart.yPct, rx: (rPx / now.w) * 100, ry: (rPx / now.h) * 100 };
      }
    } else if (currentTool === 'rect') {
      const w = Math.abs(now.xPct - dragStart.xPct);
      const h = Math.abs(now.yPct - dragStart.yPct);
      if (w > 0.5 && h > 0.5) {
        d = { id: 'draw' + (state.nextDrawId++), type: 'rect', x: Math.min(dragStart.xPct, now.xPct), y: Math.min(dragStart.yPct, now.yPct), w, h };
      }
    }

    previewEl.remove();
    previewEl = null;
    dragStart = null;
    if (d) { state.drawings.push(d); save(); }
    renderDrawings();
  });

  // Clicar em área vazia da planta, em modo seleção, desmarca o desenho atual.
  plantContainer.addEventListener('click', (e) => {
    if (!drawMode || currentTool !== 'select') return;
    if (e.target.closest('[data-draw-id]')) return;
    if (selectedDrawId) { selectedDrawId = null; renderDrawings(); }
  });

  /* ----------------------------------------------------------------
     10. EVENTOS GLOBAIS
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

  document.getElementById('drawBtn').addEventListener('click', () => { enterDrawMode(); closeMenu(); });
  document.getElementById('savePositionsBtn').addEventListener('click', () => { exportPositions(); closeMenu(); });
  document.getElementById('guestListBtn').addEventListener('click', () => { openGuestListModal(); closeMenu(); });
  document.getElementById('guestListModalClose').addEventListener('click', closeGuestListModal);
  document.getElementById('printGuestListBtn').addEventListener('click', () => window.print());
  document.getElementById('guestListModal').addEventListener('click', (e) => {
    if (e.target.id === 'guestListModal') closeGuestListModal();
  });
  document.getElementById('drawBackBtn').addEventListener('click', exitDrawMode);
  document.getElementById('drawFinishBtn').addEventListener('click', exitDrawMode);
  document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedDrawing);
  document.querySelectorAll('.draw-tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });
  document.addEventListener('keydown', (e) => {
    if (drawMode && (e.key === 'Delete' || e.key === 'Backspace') && selectedDrawId) {
      const active = document.activeElement;
      if (active && active.isContentEditable) return;
      deleteSelectedDrawing();
    }
  });
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
     11. INIT
  ---------------------------------------------------------------- */
  load();
  renderAll();
})();
