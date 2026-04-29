const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const state = {
  all: [],
  filtered: [],
  charts: {}
};

const ids = {
  appExportScope: document.getElementById('appExportScope'),
  fMaterial: document.getElementById('fMaterial'),
  fEquipamento: document.getElementById('fEquipamento'),
  fOrigem: document.getElementById('fOrigem'),
  fDestino: document.getElementById('fDestino'),
  fPatrimonio: document.getElementById('fPatrimonio'),
  fModalidade: document.getElementById('fModalidade'),
  fMes: document.getElementById('fMes'),
  fDataInicio: document.getElementById('fDataInicio'),
  fDataFim: document.getElementById('fDataFim'),
  fPlaca: document.getElementById('fPlaca'),
  btnReset: document.getElementById('btnReset'),
  btnExportPdf: document.getElementById('btnExportPdf'),
  btnExportExcel: document.getElementById('btnExportExcel'),
  metaInfo: document.getElementById('metaInfo'),
  tbodyDados: document.getElementById('tbodyDados')
};

const multiSelectControls = [];
const multiSelectMap = {
  material: ids.fMaterial,
  equipamento: ids.fEquipamento,
  origem: ids.fOrigem,
  destino: ids.fDestino,
  patrimonio: ids.fPatrimonio,
  modalidade: ids.fModalidade
};

const fields = ['patrimonio', 'equipamento', 'placa_locador', 'data', 'material', 'origem', 'destino', 'modalidade', 'num_viagens', 'volume_m3', 'valor'];

const theme = {
  bg: 'transparent',
  txt: '#d8ecff',
  sub: '#8fb7d3',
  c1: '#61d6ff',
  c2: '#00f6a6',
  c3: '#ff9b3d',
  c4: '#7f8cff',
  c5: '#e767ff',
  grid: 'rgba(143,183,211,.24)'
};

function norm(v) {
  return (v ?? '').toString().trim();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function keyBy(items, keyFn, valFn = () => 1) {
  const map = new Map();
  for (const item of items) {
    const k = keyFn(item);
    const prev = map.get(k) || 0;
    map.set(k, prev + valFn(item));
  }
  return map;
}

function setSelectOptions(sel, values, selectedValues = getSelectedValues(sel)) {
  sel.innerHTML = '';
  values.forEach(v => {
    const op = document.createElement('option');
    op.value = v;
    op.textContent = v;
    op.selected = selectedValues.includes(v);
    sel.appendChild(op);
  });
  refreshMultiSelect(sel);
}

function getSelectedValues(sel) {
  return [...sel.selectedOptions].map(o => o.value);
}

function getMultiSelectLabel(sel) {
  const wrapper = sel.closest('.multi-select');
  const placeholder = wrapper?.dataset.placeholder || 'Selecionar';
  const selected = getSelectedValues(sel);
  if (selected.length === 0) return placeholder;
  if (selected.length <= 2) return selected.join(', ');
  return `${selected.length} selecionados`;
}

function refreshMultiSelectLabel(sel) {
  const wrapper = sel.closest('.multi-select');
  const label = wrapper?.querySelector('.multi-select-label');
  if (label) {
    label.textContent = getMultiSelectLabel(sel);
  }
}

function renderMultiSelectChips(sel) {
  const wrapper = sel.closest('.multi-select');
  const chips = wrapper?.querySelector('.multi-select-chips');
  if (!chips) return;

  const selected = [...sel.options]
    .map((option, index) => ({ option, index }))
    .filter(item => item.option.selected);

  if (selected.length === 0) {
    chips.innerHTML = '';
    return;
  }

  chips.innerHTML = selected.map(({ option, index }) => `
    <span class="multi-select-chip">
      <span class="multi-select-chip-text">${escapeHtml(option.value)}</span>
      <button class="multi-select-chip-remove" type="button" data-index="${index}" aria-label="Remover ${escapeHtml(option.value)}">×</button>
    </span>
  `).join('');
}

function renderMultiSelectOptions(sel) {
  const wrapper = sel.closest('.multi-select');
  const optionsHost = wrapper?.querySelector('.multi-select-options');
  const search = wrapper?.querySelector('.multi-select-search');
  const action = wrapper?.querySelector('.multi-select-action');
  if (!optionsHost) return;

  const term = norm(search?.value).toLowerCase();
  const options = [...sel.options]
    .map((option, index) => ({ option, index }))
    .filter(item => item.option.value.toLowerCase().includes(term));

  if (action) {
    const allSelected = sel.options.length > 0 && [...sel.options].every(option => option.selected);
    action.textContent = allSelected ? 'Limpar todos' : 'Selecionar todos';
  }

  if (options.length === 0) {
    optionsHost.innerHTML = '<div class="multi-select-empty">Nenhum item encontrado.</div>';
    return;
  }

  optionsHost.innerHTML = options.map(({ option, index }) => `
    <label class="multi-select-option">
      <input type="checkbox" data-index="${index}" ${option.selected ? 'checked' : ''} />
      <span class="multi-select-option-label">${escapeHtml(option.value)}</span>
    </label>
  `).join('');
}

function refreshMultiSelect(sel) {
  refreshMultiSelectLabel(sel);
  renderMultiSelectChips(sel);
  renderMultiSelectOptions(sel);
}

function closeAllMultiSelects(except) {
  multiSelectControls.forEach(wrapper => {
    if (wrapper === except) return;
    wrapper.classList.remove('open');
    const trigger = wrapper.querySelector('.multi-select-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

function setupMultiSelect(sel) {
  const wrapper = sel.closest('.multi-select');
  if (!wrapper) return;
  const trigger = wrapper.querySelector('.multi-select-trigger');
  const search = wrapper.querySelector('.multi-select-search');
  const action = wrapper.querySelector('.multi-select-action');
  const optionsHost = wrapper.querySelector('.multi-select-options');
  const chips = wrapper.querySelector('.multi-select-chips');
  if (!trigger) return;

  multiSelectControls.push(wrapper);
  refreshMultiSelect(sel);

  trigger.addEventListener('click', () => {
    const willOpen = !wrapper.classList.contains('open');
    closeAllMultiSelects(wrapper);
    wrapper.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen && search) {
      search.focus();
      renderMultiSelectOptions(sel);
    }
  });

  sel.addEventListener('change', () => {
    refreshMultiSelect(sel);
  });

  if (search) {
    search.addEventListener('input', () => {
      renderMultiSelectOptions(sel);
    });
  }

  if (action) {
    action.addEventListener('click', () => {
      const allSelected = sel.options.length > 0 && [...sel.options].every(option => option.selected);
      [...sel.options].forEach(option => {
        option.selected = !allSelected;
      });
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  if (optionsHost) {
    optionsHost.addEventListener('change', (event) => {
      const input = event.target.closest('input[type="checkbox"][data-index]');
      if (!input) return;
      const option = sel.options[Number(input.dataset.index)];
      if (!option) return;
      option.selected = input.checked;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  if (chips) {
    chips.addEventListener('click', (event) => {
      const btn = event.target.closest('.multi-select-chip-remove');
      if (!btn) return;
      const option = sel.options[Number(btn.dataset.index)];
      if (!option) return;
      option.selected = false;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}

function populateFilters(data) {
  syncFilterOptions({
    material: [],
    equipamento: [],
    origem: [],
    destino: [],
    patrimonio: [],
    modalidade: [],
    mes: '',
    dataInicio: '',
    dataFim: '',
    placa: ''
  });
}

function getFilters() {
  return {
    material: getSelectedValues(ids.fMaterial),
    equipamento: getSelectedValues(ids.fEquipamento),
    origem: getSelectedValues(ids.fOrigem),
    destino: getSelectedValues(ids.fDestino),
    patrimonio: getSelectedValues(ids.fPatrimonio),
    modalidade: getSelectedValues(ids.fModalidade),
    mes: norm(ids.fMes.value),
    dataInicio: norm(ids.fDataInicio.value),
    dataFim: norm(ids.fDataFim.value),
    placa: norm(ids.fPlaca.value).toUpperCase()
  };
}

function matchesDateFilters(record, filters) {
  const monthMatch = !filters.mes || (record.data && record.data.startsWith(filters.mes));
  const startMatch = !filters.dataInicio || (record.data && record.data >= filters.dataInicio);
  const endMatch = !filters.dataFim || (record.data && record.data <= filters.dataFim);
  return monthMatch && startMatch && endMatch;
}

function filterData(data, filters) {
  return data.filter(d =>
    (filters.material.length === 0 || filters.material.includes(d.material)) &&
    (filters.equipamento.length === 0 || filters.equipamento.includes(d.equipamento)) &&
    (filters.origem.length === 0 || filters.origem.includes(d.origem)) &&
    (filters.destino.length === 0 || filters.destino.includes(d.destino)) &&
    (filters.patrimonio.length === 0 || filters.patrimonio.includes(d.patrimonio)) &&
    (filters.modalidade.length === 0 || filters.modalidade.includes(d.modalidade)) &&
    matchesDateFilters(d, filters) &&
    (!filters.placa || d.placa_locador.toUpperCase().includes(filters.placa))
  );
}

function syncFilterOptions(filters) {
  const dateScopedData = state.all.filter(item => matchesDateFilters(item, filters));
  const optionSets = {
    material: [...new Set(dateScopedData.map(d => d.material).filter(Boolean))].sort(),
    equipamento: [...new Set(dateScopedData.map(d => d.equipamento).filter(Boolean))].sort(),
    origem: [...new Set(dateScopedData.map(d => d.origem).filter(Boolean))].sort(),
    destino: [...new Set(dateScopedData.map(d => d.destino).filter(Boolean))].sort(),
    patrimonio: [...new Set(dateScopedData.map(d => d.patrimonio).filter(Boolean))].sort(),
    modalidade: [...new Set(dateScopedData.map(d => d.modalidade).filter(Boolean))].sort()
  };

  Object.entries(multiSelectMap).forEach(([key, select]) => {
    const currentSelected = getSelectedValues(select).filter(value => optionSets[key].includes(value));
    setSelectOptions(select, optionSets[key], currentSelected);
  });
}

function applyFilters() {
  const filters = getFilters();
  syncFilterOptions(filters);
  state.filtered = filterData(state.all, getFilters());
  renderAll();
}

function baseAxis() {
  return {
    axisLine: { lineStyle: { color: theme.sub } },
    axisLabel: { color: theme.sub },
    splitLine: { lineStyle: { color: theme.grid } }
  };
}

function topNFromMap(map, n = 10) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function updateKpis(data) {
  const totalReg = data.length;
  const totalViagens = data.reduce((a, b) => a + b.num_viagens, 0);
  const totalVolume = data.reduce((a, b) => a + b.volume_m3, 0);
  const totalValor = data.reduce((a, b) => a + b.valor, 0);
  const eficiencia = totalViagens > 0 ? totalVolume / totalViagens : 0;
  const placas = new Set(data.map(d => d.placa_locador).filter(Boolean)).size;
  const patrimonios = new Set(data.map(d => d.patrimonio).filter(Boolean)).size;

  document.getElementById('kpiRegistros').textContent = fmtInt.format(totalReg);
  document.getElementById('kpiViagens').textContent = fmtInt.format(totalViagens);
  document.getElementById('kpiVolume').textContent = fmtInt.format(totalVolume);
  document.getElementById('kpiValorTotal').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValor);
  document.getElementById('kpiEf').textContent = fmtDec.format(eficiencia);
  document.getElementById('kpiPlacas').textContent = fmtInt.format(placas);
  document.getElementById('kpiPatrimonio').textContent = fmtInt.format(patrimonios);
}

function setMeta(meta, data) {
  const dates = data.map(d => d.data).filter(Boolean).sort();
  const ini = dates[0] || '-';
  const fim = dates[dates.length - 1] || '-';
  ids.metaInfo.innerHTML = `
    <strong>${fmtInt.format(data.length)}</strong> registros<br>
    <span>${ini} até ${fim}</span><br>
    <small>Fonte: ${meta.fonte || 'dados.json'}</small>
  `;
}

function chartTimeline(data) {
  const byDate = new Map();
  for (const r of data) {
    if (!r.data) continue;
    const row = byDate.get(r.data) || { viagens: 0, volume: 0 };
    row.viagens += r.num_viagens;
    row.volume += r.volume_m3;
    byDate.set(r.data, row);
  }
  const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  state.charts.timeline.setOption({
    backgroundColor: theme.bg,
    color: [theme.c1, theme.c2],
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: theme.sub } },
    grid: { left: 52, right: 52, top: 36, bottom: 44 },
    xAxis: { type: 'category', data: sorted.map(v => v[0]), ...baseAxis() },
    yAxis: [
      { type: 'value', name: 'Volume (m³)', nameTextStyle: { color: theme.sub }, ...baseAxis() },
      { type: 'value', name: 'Viagens', nameTextStyle: { color: theme.sub }, ...baseAxis() }
    ],
    series: [
      { name: 'Volume (m³)', type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.15 }, data: sorted.map(v => v[1].volume) },
      { name: 'Viagens', yAxisIndex: 1, type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.09 }, data: sorted.map(v => v[1].viagens) }
    ]
  });
}

function chartMateriais(data) {
  const top = topNFromMap(keyBy(data, d => d.material || 'Sem material', d => d.volume_m3), 12).reverse();
  state.charts.materiais.setOption({
    color: [theme.c3],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 140, right: 20, top: 16, bottom: 26 },
    xAxis: { type: 'value', ...baseAxis() },
    yAxis: { type: 'category', data: top.map(v => v[0]), ...baseAxis() },
    series: [{ type: 'bar', data: top.map(v => v[1]), barWidth: 14, itemStyle: { borderRadius: [0, 8, 8, 0] } }]
  });
}

function chartSankey(data) {
  const route = keyBy(data, d => `${d.origem || 'Sem origem'}|||${d.destino || 'Sem destino'}`, d => d.volume_m3);
  const links = [...route.entries()]
    .map(([k, v]) => {
      const [o, d] = k.split('|||');
      return {
        source: `origem::${o}`,
        target: `destino::${d}`,
        value: v
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const nodesSet = new Set();
  links.forEach(l => { nodesSet.add(l.source); nodesSet.add(l.target); });
  const nodes = [...nodesSet].map(n => ({
    name: n,
    displayName: n.replace('origem::', '').replace('destino::', '')
  }));

  state.charts.sankey.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'sankey',
      data: nodes,
      links,
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', curveness: 0.5 },
      itemStyle: { borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' },
      label: {
        color: theme.txt,
        fontSize: 11,
        formatter: p => p.data.displayName || p.name
      }
    }]
  });
}

function chartRotas(data) {
  const top = topNFromMap(keyBy(data, d => `${d.origem || 'Sem origem'} → ${d.destino || 'Sem destino'}`, d => d.volume_m3), 10);
  state.charts.rotas.setOption({
    color: [theme.c2],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 56, right: 18, top: 26, bottom: 100 },
    xAxis: { type: 'category', data: top.map(v => v[0]), axisLabel: { color: theme.sub, rotate: 28 }, axisLine: { lineStyle: { color: theme.sub } } },
    yAxis: { type: 'value', ...baseAxis() },
    series: [{ type: 'bar', data: top.map(v => v[1]), barMaxWidth: 36, itemStyle: { borderRadius: [8, 8, 0, 0] } }]
  });
}

function chartEquipamento(data) {
  const eqMap = new Map();
  for (const r of data) {
    const k = r.equipamento || 'Sem equipamento';
    const e = eqMap.get(k) || { viagens: 0, volume: 0 };
    e.viagens += r.num_viagens;
    e.volume += r.volume_m3;
    eqMap.set(k, e);
  }
  const names = [...eqMap.keys()];
  const viagens = names.map(n => eqMap.get(n).viagens);
  const volumes = names.map(n => eqMap.get(n).volume);

  state.charts.equipamento.setOption({
    color: [theme.c1, theme.c5],
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: theme.sub } },
    grid: { left: 50, right: 20, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: names, ...baseAxis() },
    yAxis: [{ type: 'value', ...baseAxis() }, { type: 'value', ...baseAxis() }],
    series: [
      { name: 'Viagens', type: 'bar', data: viagens, yAxisIndex: 0, barMaxWidth: 30 },
      { name: 'Volume (m³)', type: 'line', data: volumes, yAxisIndex: 1, smooth: true }
    ]
  });
}

function chartPlacas(data) {
  const top = topNFromMap(keyBy(data, d => d.placa_locador || 'Sem placa', d => d.num_viagens), 12).reverse();
  state.charts.placas.setOption({
    color: [theme.c4],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 14, top: 14, bottom: 26 },
    xAxis: { type: 'value', ...baseAxis() },
    yAxis: { type: 'category', data: top.map(v => v[0]), ...baseAxis() },
    series: [{ type: 'bar', data: top.map(v => v[1]), barWidth: 13, itemStyle: { borderRadius: [0, 7, 7, 0] } }]
  });
}

function chartPatrimonios(data) {
  const top = topNFromMap(keyBy(data, d => d.patrimonio || 'Sem patrimônio', d => d.volume_m3), 12);
  state.charts.patrimonios.setOption({
    color: [theme.c3],
    tooltip: { trigger: 'item' },
    grid: { left: 50, right: 16, top: 24, bottom: 72 },
    xAxis: { type: 'category', data: top.map(v => v[0]), axisLabel: { color: theme.sub, rotate: 25 }, axisLine: { lineStyle: { color: theme.sub } } },
    yAxis: { type: 'value', ...baseAxis() },
    series: [{ type: 'line', smooth: true, data: top.map(v => v[1]), areaStyle: { opacity: 0.2 }, symbolSize: 7 }]
  });
}

function chartTreemap(data) {
  const tree = topNFromMap(keyBy(data, d => d.material || 'Sem material', d => d.volume_m3), 20)
    .map(([name, value]) => ({ name, value }));
  state.charts.treemap.setOption({
    tooltip: { formatter: p => `${p.name}<br>${fmtInt.format(p.value)} m³` },
    series: [{
      type: 'treemap',
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      itemStyle: { borderColor: 'rgba(255,255,255,.18)' },
      label: { color: theme.txt },
      levels: [{
        color: [theme.c1, theme.c2, theme.c3, theme.c4, theme.c5],
        colorSaturation: [0.35, 0.75]
      }],
      data: tree
    }]
  });
}

function chartFinanceiro(data) {
  const map = new Map();
  for (const r of data) {
    const k = r.modalidade || 'Sem modalidade';
    const item = map.get(k) || { valor: 0, viagens: 0, volume: 0 };
    item.valor += r.valor;
    item.viagens += r.num_viagens;
    item.volume += r.volume_m3;
    map.set(k, item);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 12);

  state.charts.financeiro.setOption({
    color: [theme.c3, theme.c1, theme.c2],
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: theme.sub } },
    grid: { left: 60, right: 40, top: 34, bottom: 50 },
    xAxis: {
      type: 'category',
      data: sorted.map(v => v[0]),
      axisLabel: { color: theme.sub, rotate: 0, interval: 0 },
      axisLine: { lineStyle: { color: theme.sub } }
    },
    yAxis: [
      { type: 'value', name: 'R$', nameTextStyle: { color: theme.sub }, ...baseAxis() },
      { type: 'value', name: 'Viagens', nameTextStyle: { color: theme.sub }, ...baseAxis() }
    ],
    series: [
      { name: 'Valor (R$)', type: 'bar', data: sorted.map(v => v[1].valor), barMaxWidth: 34 },
      { name: 'Viagens', type: 'line', yAxisIndex: 1, data: sorted.map(v => v[1].viagens), smooth: true },
      { name: 'Volume (m³)', type: 'line', yAxisIndex: 1, data: sorted.map(v => v[1].volume), smooth: true }
    ]
  });
}

function chartHeatmap(data) {
  const basculanteData = data.filter(d =>
    d.equipamento.toUpperCase().includes('BASCULANTE') && d.volume_m3 > 0
  );
  const matsRank = topNFromMap(
    keyBy(basculanteData, d => d.material || 'Sem material', d => d.volume_m3),
    35
  ).map(([m]) => m);
  const mats = matsRank.length ? matsRank : ['Sem material'];
  const eqs = ['Basculante'];
  const idxMat = new Map(mats.map((m, i) => [m, i]));
  const idxEq = new Map([['Basculante', 0]]);

  const acc = new Map();
  for (const r of basculanteData) {
    if (!idxMat.has(r.material || 'Sem material')) continue;
    const k = `${r.material || 'Sem material'}|||Basculante`;
    acc.set(k, (acc.get(k) || 0) + r.volume_m3);
  }
  const values = [...acc.entries()].map(([k, v]) => {
    const [m, e] = k.split('|||');
    return [idxEq.get(e), idxMat.get(m), v];
  });

  state.charts.heatmap.setOption({
    tooltip: {
      formatter: p => `${mats[p.value[1]]}<br>${eqs[p.value[0]]}<br>${fmtInt.format(p.value[2])} m³`
    },
    grid: { left: 130, right: 30, top: 20, bottom: 90 },
    xAxis: { type: 'category', data: eqs, axisLabel: { color: theme.sub, rotate: 0 }, axisLine: { lineStyle: { color: theme.sub } } },
    yAxis: { type: 'category', data: mats, axisLabel: { color: theme.sub }, axisLine: { lineStyle: { color: theme.sub } } },
    visualMap: {
      min: 0,
      max: Math.max(1, ...values.map(v => v[2]), 1),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 20,
      textStyle: { color: theme.sub },
      inRange: { color: ['#0f1b30', '#114a6a', '#0eddb0', '#fff57c'] }
    },
    series: [{ type: 'heatmap', data: values, progressive: 1000 }]
  });
}

function exportFilteredToExcel() {
  if (!window.XLSX) {
    alert('Biblioteca de exportação Excel não carregou.');
    return;
  }
  const rows = state.filtered.map(r => ({
    Data: r.data || '',
    Material: r.material || '',
    Origem: r.origem || '',
    Destino: r.destino || '',
    Modalidade: r.modalidade || '',
    Viagens: r.num_viagens,
    'Volume (m³)': r.volume_m3,
    'Valor (R$)': r.valor,
    Equipamento: r.equipamento || '',
    Placa: r.placa_locador || '',
    Patrimonio: r.patrimonio || ''
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Amostra Filtrada');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  XLSX.writeFile(wb, `amostra-filtrada-${stamp}.xlsx`);
}

async function exportDashboardToPdf() {
  if (!window.html2pdf) {
    alert('Biblioteca de exportação PDF não carregou.');
    return;
  }
  ids.btnExportPdf.disabled = true;
  ids.btnExportPdf.textContent = 'Gerando PDF...';
  try {
    document.body.classList.add('pdf-mode');
    await new Promise(r => requestAnimationFrame(r));
    Object.values(state.charts).forEach(c => c.resize());
    await new Promise(r => requestAnimationFrame(r));
    Object.values(state.charts).forEach(c => c.resize());
    window.dispatchEvent(new Event('resize'));
    await new Promise(r => setTimeout(r, 350));
    await html2pdf()
      .set({
        margin: [6, 6, 6, 6],
        filename: `dashboard-vlt-salvador-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#050913' },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.chart-panel', '.chart-panel h2', '.kpi', '.hero', '.filters', '.export-actions']
        }
      })
      .from(ids.appExportScope)
      .save();
  } finally {
    document.body.classList.remove('pdf-mode');
    Object.values(state.charts).forEach(c => c.resize());
    ids.btnExportPdf.disabled = false;
    ids.btnExportPdf.textContent = 'Exportar Dashboard em PDF';
  }
}

function fillTable(data) {
  const rows = data.slice(0, 400).map(r => `
    <tr>
      <td>${r.data || '-'}</td>
      <td>${r.material || '-'}</td>
      <td>${r.origem || '-'}</td>
      <td>${r.destino || '-'}</td>
      <td>${r.modalidade || '-'}</td>
      <td>${fmtInt.format(r.num_viagens)}</td>
      <td>${fmtInt.format(r.volume_m3)}</td>
      <td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valor)}</td>
      <td>${r.equipamento || '-'}</td>
      <td>${r.placa_locador || '-'}</td>
      <td>${r.patrimonio || '-'}</td>
    </tr>
  `).join('');
  ids.tbodyDados.innerHTML = rows;
}

function renderAll() {
  const data = state.filtered;
  updateKpis(data);
  try { chartTimeline(data); } catch (e) { console.error('timeline', e); }
  try { chartMateriais(data); } catch (e) { console.error('materiais', e); }
  try { chartSankey(data); } catch (e) { console.error('sankey', e); }
  try { chartRotas(data); } catch (e) { console.error('rotas', e); }
  try { chartEquipamento(data); } catch (e) { console.error('equipamento', e); }
  try { chartPlacas(data); } catch (e) { console.error('placas', e); }
  try { chartPatrimonios(data); } catch (e) { console.error('patrimonios', e); }
  try { chartTreemap(data); } catch (e) { console.error('treemap', e); }
  try { chartFinanceiro(data); } catch (e) { console.error('financeiro', e); }
  try { chartHeatmap(data); } catch (e) { console.error('heatmap', e); }
  fillTable(data);
}

function initCharts() {
  state.charts.timeline = echarts.init(document.getElementById('chartTimeline'));
  state.charts.materiais = echarts.init(document.getElementById('chartMateriais'));
  state.charts.sankey = echarts.init(document.getElementById('chartSankey'));
  state.charts.rotas = echarts.init(document.getElementById('chartRotas'));
  state.charts.equipamento = echarts.init(document.getElementById('chartEquipamento'));
  state.charts.placas = echarts.init(document.getElementById('chartPlacas'));
  state.charts.patrimonios = echarts.init(document.getElementById('chartPatrimonios'));
  state.charts.treemap = echarts.init(document.getElementById('chartTreemap'));
  state.charts.financeiro = echarts.init(document.getElementById('chartFinanceiro'));
  state.charts.heatmap = echarts.init(document.getElementById('chartHeatmap'));

  window.addEventListener('resize', () => Object.values(state.charts).forEach(c => c.resize()));
}

function initMultiSelects() {
  [ids.fMaterial, ids.fEquipamento, ids.fOrigem, ids.fDestino, ids.fPatrimonio, ids.fModalidade].forEach(setupMultiSelect);

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.multi-select')) {
      closeAllMultiSelects();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllMultiSelects();
    }
  });
}

function normalizeData(raw) {
  return raw
    .filter(row => fields.every(f => Object.prototype.hasOwnProperty.call(row, f)))
    .map(row => ({
      patrimonio: norm(row.patrimonio),
      equipamento: norm(row.equipamento),
      placa_locador: norm(row.placa_locador),
      data: norm(row.data),
      material: norm(row.material),
      origem: norm(row.origem),
      destino: norm(row.destino),
      modalidade: norm(row.modalidade),
      num_viagens: num(row.num_viagens),
      volume_m3: num(row.volume_m3),
      valor: num(row.valor)
    }));
}

async function boot() {
  const res = await fetch('dados.json');
  const json = await res.json();
  state.all = normalizeData(json.dados || []);
  state.filtered = [...state.all];

  initCharts();
  initMultiSelects();
  populateFilters(state.all);
  setMeta(json.meta || {}, state.all);
  renderAll();

  [ids.fMaterial, ids.fEquipamento, ids.fOrigem, ids.fDestino, ids.fPatrimonio, ids.fModalidade].forEach(el => el.addEventListener('change', applyFilters));
  [ids.fMes, ids.fDataInicio, ids.fDataFim].forEach(el => el.addEventListener('change', applyFilters));
  ids.fPlaca.addEventListener('input', applyFilters);
  ids.btnReset.addEventListener('click', () => {
    [ids.fMaterial, ids.fEquipamento, ids.fOrigem, ids.fDestino, ids.fPatrimonio, ids.fModalidade].forEach(s => {
      [...s.options].forEach(o => { o.selected = false; });
      const wrapper = s.closest('.multi-select');
      const search = wrapper?.querySelector('.multi-select-search');
      if (search) search.value = '';
      refreshMultiSelect(s);
    });
    ids.fMes.value = '';
    ids.fDataInicio.value = '';
    ids.fDataFim.value = '';
    ids.fPlaca.value = '';
    closeAllMultiSelects();
    applyFilters();
  });
  ids.btnExportExcel.addEventListener('click', exportFilteredToExcel);
  ids.btnExportPdf.addEventListener('click', exportDashboardToPdf);
}

boot().catch(err => {
  console.error(err);
  ids.metaInfo.textContent = 'Falha ao carregar dados.';
});
