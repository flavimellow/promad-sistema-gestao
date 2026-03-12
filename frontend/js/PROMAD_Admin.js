/* ═══════════════════════════════════════════
   PROMAD · Frontend — integração com API
   Arquivo: frontend/js/PROMAD_Admin.js
═══════════════════════════════════════════ */
'use strict';

const API = '/api';

/* ════════════════════════════
   MÁSCARAS
════════════════════════════ */
function msk(el, tipo) {
  let v = el.value.replace(/\D/g, '');
  switch (tipo) {
    case 'cpf':
      v = v.slice(0,11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      break;
    case 'cnpj':
      v = v.slice(0,14);
      v = v.replace(/(\d{2})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1/$2')
           .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
      break;
    case 'tel':
      v = v.slice(0,11);
      if (v.length <= 10)
        v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      else
        v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
      break;
    case 'cep':
      v = v.slice(0,8);
      v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');
      break;
    case 'data':
      v = v.slice(0,8);
      v = v.replace(/(\d{2})(\d)/, '$1/$2')
           .replace(/(\d{2})(\d)/, '$1/$2');
      break;
    case 'valor':
      el.value = el.value.replace(/[^\d,\.]/g, '');
      return;
  }
  el.value = v;
}

/* Converte dd/mm/aaaa → aaaa-mm-dd para o banco */
function toISO(d) {
  if (!d) return null;
  if (d.includes('-')) return d; // já está em ISO
  const [dd, mm, aaaa] = d.split('/');
  if (!dd || !mm || !aaaa || aaaa.length < 4) return null;
  return `${aaaa}-${mm}-${dd}`;
}

/* Converte aaaa-mm-dd → dd/mm/aaaa para exibição */
const fd = d => d ? d.slice(0,10).split('-').reverse().join('/') : '—';
const fm = v => v ? 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',') : '—';
const bc = s => ({ Ativo:'ba', Inativo:'bi', Pendente:'bp', Encerrado:'be', Vigente:'bv' }[s] || 'bi');
const gv  = id => (document.getElementById(id)?.value || '').trim();
const sv  = (id, v) => { const e = document.getElementById(id); if (e) e.value = v ?? ''; };
const clr = ids => ids.forEach(i => sv(i, ''));

const PG = {
  dashboard:  { l:'Dashboard',   b:'Visão Geral' },
  aprendizes: { l:'Aprendizes',  b:'Cadastros'   },
  empresas:   { l:'Empresas',    b:'Parceiros'   },
  contratos:  { l:'Contratos',   b:'Registros'   },
  uniformes:  { l:'Uniformes',   b:'Controle'    },
  ferias:     { l:'Férias',      b:'Previsão'    },
  licencas:   { l:'Lic. Médica', b:'Saúde'       },
  financeiro: { l:'Financeiro',  b:'Gestão Financeira' },
};

const flt = { ap:'todos', ct:'todos' };
const eid = { ap:null, em:null, ct:null };
let drId  = null;
let _ems  = [];
let _aps  = [];

/* ── Fetch helpers ── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}
const GET    = path      => api('GET',    path);
const POST   = (path, b) => api('POST',   path, b);
const PUT    = (path, b) => api('PUT',    path, b);
const DELETE = path      => api('DELETE', path);

/* ── Alerta global ── */
function showAlrt(m, tp = 'ok') {
  const e = document.getElementById('global-alrt');
  e.textContent = (tp === 'ok' ? '✓ ' : '✗ ') + m;
  e.className = 'alrt ' + tp;
  e.style.display = 'block';
  setTimeout(() => e.style.display = 'none', 3500);
}

function setLoading(tbId, cols, msg = 'Carregando…') {
  const tb = document.getElementById(tbId);
  if (tb) tb.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:20px;color:var(--mu);font-size:.83rem">${msg}</td></tr>`;
}

/* ════════════════════════════
   NAVEGAÇÃO
════════════════════════════ */
function nav(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('.sbi').forEach(x => x.classList.remove('on'));
  document.getElementById('pg-' + p).classList.add('on');
  document.querySelectorAll('.sbi').forEach(x => {
    if (x.getAttribute('onclick')?.includes("'" + p + "'")) x.classList.add('on');
  });
  document.getElementById('tp-pg').textContent = PG[p].l;
  document.getElementById('tp-bd').textContent = PG[p].b;
  ({ dashboard:rDash, aprendizes:rAp, empresas:rEm, contratos:rCt,
     uniformes:rUn, ferias:rFe, licencas:rLi, financeiro:finInit })[p]?.();
}

/* ════════════════════════════
   MODAIS / DRAWER
════════════════════════════ */
const ov   = id => document.getElementById(id).classList.add('open');
const cov  = id => document.getElementById(id).classList.remove('open');
const ovc  = (e, id) => { if (e.target === document.getElementById(id)) cov(id); };
const cdov = () => document.getElementById('dov').classList.remove('open');

function sp(el, g, v) {
  el.closest('.fps').querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  flt[g] = v;
  g === 'ap' ? rAp() : rCt();
}

function popSel(id, arr, key, ph = 'Selecione') {
  const s = document.getElementById(id);
  if (!s) return;
  s.innerHTML = `<option value="">${ph}</option>`;
  arr.forEach(x => {
    const o = document.createElement('option');
    o.value = x.id; o.textContent = x[key];
    s.appendChild(o);
  });
}

/* ── Atualiza contadores sidebar ── */
async function updCnt() {
  try {
    const d = await GET('/dashboard');
    document.getElementById('sb-ap').textContent = d.ativos + d.pendentes;
    document.getElementById('sb-em').textContent = d.empresas;
    document.getElementById('sb-ct').textContent = d.contratos;
  } catch (_) {}
}

/* ════════════════════════════
   DASHBOARD
════════════════════════════ */
async function rDash() {
  try {
    const [kpis, aps] = await Promise.all([GET('/dashboard'), GET('/aprendizes')]);
    document.getElementById('kv-at').textContent = kpis.ativos;
    document.getElementById('kv-em').textContent = kpis.empresas;
    document.getElementById('kv-pe').textContent = kpis.pendentes;
    document.getElementById('kv-ct').textContent = kpis.contratos;
    const tb = document.getElementById('dash-ap');
    const recent = aps.slice(0, 5);
    tb.innerHTML = recent.length
      ? recent.map(a => `<tr style="cursor:pointer" onclick="oDr(${a.id})">
          <td><strong>${a.nom}</strong></td>
          <td style="font-family:monospace;font-size:.76rem;color:var(--mu)">${a.mat || '—'}</td>
          <td>${a.emp_nom || '—'}</td>
          <td><span class="badge ${bc(a.sta)}">${a.sta || '—'}</span></td>
        </tr>`).join('')
      : `<tr><td colspan="4"><div class="empty"><div class="ei">📋</div><p>Nenhum aprendiz cadastrado.</p></div></td></tr>`;
  } catch (err) { showAlrt('Erro ao carregar dashboard.', 'er'); }
}

/* ════════════════════════════
   APRENDIZES
════════════════════════════ */
async function oAp(id) {
  eid.ap = id || null;
  _ems = await GET('/empresas').catch(() => []);
  popSel('a-emp', _ems, 'nom', 'Selecione a empresa');
  if (id) {
    document.getElementById('ap-tt').textContent = 'Editar Aprendiz';
    try {
      const a = await GET('/aprendizes/' + id);
      ['nom','mat','ins','mod','esc','tur','sta','logr','num','bai','res','par','trm','emp','obs','cpf','cpr','cep','out'].forEach(k => sv('a-' + k, a[k]));
      sv('a-tre', a.tre); sv('a-cel', a.cel); sv('a-ttr', a.ttr);
      sv('a-nas', fd(a.nas)); sv('a-cni', fd(a.cni)); sv('a-cnf', fd(a.cnf));
    } catch (err) { showAlrt('Erro ao carregar aprendiz.', 'er'); return; }
  } else {
    document.getElementById('ap-tt').textContent = 'Cadastrar Aprendiz';
    clr(['a-nom','a-mat','a-ins','a-cpf','a-nas','a-mod','a-esc','a-tur','a-logr','a-num','a-bai','a-cep','a-tre','a-cel','a-ttr','a-out','a-res','a-par','a-cpr','a-cni','a-cnf','a-trm','a-obs']);
    sv('a-sta', 'Ativo');
  }
  ov('ov-ap');
}

async function sAp() {
  const nom = gv('a-nom');
  if (!nom) { showAlrt('Informe o nome do aprendiz.', 'er'); return; }
  const body = {
    nom, mat:gv('a-mat'), ins:gv('a-ins'), cpf:gv('a-cpf'),
    nas:toISO(gv('a-nas')), mod:gv('a-mod'), esc:gv('a-esc'),
    tur:gv('a-tur'), sta:gv('a-sta'), logr:gv('a-logr'),
    num:gv('a-num'), bai:gv('a-bai'), cep:gv('a-cep'),
    tre:gv('a-tre'), cel:gv('a-cel'), ttr:gv('a-ttr'),
    out:gv('a-out'), res:gv('a-res'), par:gv('a-par'), cpr:gv('a-cpr'),
    cni:toISO(gv('a-cni')), cnf:toISO(gv('a-cnf')),
    trm:gv('a-trm'), emp:gv('a-emp')||null, obs:gv('a-obs'),
  };
  try {
    if (eid.ap) { await PUT('/aprendizes/' + eid.ap, body); showAlrt('Aprendiz atualizado.'); }
    else        { await POST('/aprendizes', body); showAlrt('Aprendiz cadastrado com sucesso!'); }
    cov('ov-ap'); rAp(); rDash(); updCnt();
  } catch (err) { showAlrt(err.message, 'er'); }
}

async function rAp() {
  setLoading('tb-ap', 10);
  try {
    const q = gv('q-ap');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (flt.ap !== 'todos') params.set('sta', flt.ap);
    const list = await GET('/aprendizes?' + params);
    const tb = document.getElementById('tb-ap');
    if (!list.length) { tb.innerHTML = `<tr><td colspan="10"><div class="empty"><div class="ei">👤</div><p>Nenhum aprendiz encontrado.</p></div></td></tr>`; return; }
    tb.innerHTML = list.map(a => `
      <tr>
        <td><strong>${a.nom}</strong></td>
        <td style="font-family:monospace;font-size:.76rem;color:var(--mu)">${a.mat || '—'}</td>
        <td style="font-family:monospace;font-size:.76rem;color:var(--mu)">${a.ins || '—'}</td>
        <td>${fd(a.nas)}</td>
        <td>${a.mod || '—'}</td>
        <td>${a.esc || '—'}</td>
        <td>${a.tur || '—'}</td>
        <td>${a.emp_nom || '—'}</td>
        <td><span class="badge ${bc(a.sta)}">${a.sta || '—'}</span></td>
        <td><div class="ag">
          <button class="btn btn-s btn-sm btn-ic" onclick="oDr(${a.id})">👁</button>
          <button class="btn btn-s btn-sm btn-ic" onclick="oAp(${a.id})">✏</button>
          <button class="btn btn-d btn-sm btn-ic" onclick="dAp(${a.id})">🗑</button>
        </div></td>
      </tr>`).join('');
  } catch (err) { showAlrt('Erro ao carregar aprendizes.', 'er'); }
}

async function dAp(id) {
  if (!confirm('Excluir este aprendiz?')) return;
  try { await DELETE('/aprendizes/' + id); showAlrt('Aprendiz excluído.'); rAp(); rDash(); updCnt(); }
  catch (err) { showAlrt(err.message, 'er'); }
}

/* ════════════════════════════
   EMPRESAS
════════════════════════════ */
async function oEm(id) {
  eid.em = id || null;
  if (id) {
    document.getElementById('em-tt').textContent = 'Editar Empresa';
    try {
      const e = await GET('/empresas/' + id);
      ['nom','cnj','res','logr','num','bai','cep','tel','eml','obs'].forEach(k => sv('e-' + k, e[k]));
    } catch (err) { showAlrt('Erro ao carregar empresa.', 'er'); return; }
  } else {
    document.getElementById('em-tt').textContent = 'Cadastrar Empresa';
    clr(['e-nom','e-cnj','e-res','e-logr','e-num','e-bai','e-cep','e-tel','e-eml','e-obs']);
  }
  ov('ov-em');
}

async function sEm() {
  const nom = gv('e-nom');
  if (!nom) { showAlrt('Informe o nome da empresa.', 'er'); return; }
  const body = { nom, cnj:gv('e-cnj'), res:gv('e-res'), logr:gv('e-logr'), num:gv('e-num'), bai:gv('e-bai'), cep:gv('e-cep'), tel:gv('e-tel'), eml:gv('e-eml'), obs:gv('e-obs') };
  try {
    if (eid.em) { await PUT('/empresas/' + eid.em, body); showAlrt('Empresa atualizada.'); }
    else        { await POST('/empresas', body); showAlrt('Empresa cadastrada!'); }
    cov('ov-em'); rEm(); rDash(); updCnt();
  } catch (err) { showAlrt(err.message, 'er'); }
}

async function rEm() {
  setLoading('tb-em', 6);
  try {
    const q = gv('q-em');
    const list = await GET('/empresas' + (q ? '?q=' + encodeURIComponent(q) : ''));
    const tb = document.getElementById('tb-em');
    if (!list.length) { tb.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="ei">🏢</div><p>Nenhuma empresa cadastrada.</p></div></td></tr>`; return; }
    const aps = await GET('/aprendizes');
    tb.innerHTML = list.map(e => {
      const c = aps.filter(a => a.emp == e.id).length;
      return `<tr>
        <td><strong>${e.nom}</strong><br><span style="font-family:monospace;font-size:.73rem;color:var(--mu)">${e.cnj || ''}</span></td>
        <td>${e.res || '—'}</td>
        <td>${e.tel || '—'}</td>
        <td>${[e.logr, e.num, e.bai].filter(Boolean).join(', ') || '—'}</td>
        <td><span class="badge ba">${c} aprendiz${c !== 1 ? 'es' : ''}</span></td>
        <td><div class="ag">
          <button class="btn btn-s btn-sm btn-ic" onclick="oEm(${e.id})">✏</button>
          <button class="btn btn-d btn-sm btn-ic" onclick="dEm(${e.id})">🗑</button>
        </div></td>
      </tr>`;
    }).join('');
  } catch (err) { showAlrt('Erro ao carregar empresas.', 'er'); }
}

async function dEm(id) {
  if (!confirm('Excluir esta empresa?')) return;
  try { await DELETE('/empresas/' + id); showAlrt('Empresa excluída.'); rEm(); rDash(); updCnt(); }
  catch (err) { showAlrt(err.message, 'er'); }
}

/* ════════════════════════════
   CONTRATOS  (IDs: ct-ap, ct-em, ct-ini…)
════════════════════════════ */
async function _popCtSelects() {
  [_aps, _ems] = await Promise.all([GET('/aprendizes'), GET('/empresas')]);
  const sAp = document.getElementById('ct-ap');
  const sEm = document.getElementById('ct-em');
  sAp.innerHTML = '<option value="">Selecione o aprendiz</option>';
  sEm.innerHTML = '<option value="">Selecione a empresa</option>';
  _aps.forEach(a => { const o = document.createElement('option'); o.value=a.id; o.textContent=a.nom; sAp.appendChild(o); });
  _ems.forEach(e => { const o = document.createElement('option'); o.value=e.id; o.textContent=e.nom; sEm.appendChild(o); });
}

async function abrirCt() {
  eid.ct = null;
  document.getElementById('ct-tt').textContent = 'Registrar Contrato';
  await _popCtSelects();
  clr(['ct-ini','ct-fim','ct-hor','ct-int','ct-ch','ct-sal','ct-obs']);
  sv('ct-sta', 'Vigente');
  sv('ct-tipo', 'direto');
  ov('ov-ct');
}

async function oCt(id) {
  eid.ct = id;
  document.getElementById('ct-tt').textContent = 'Editar Contrato';
  await _popCtSelects();
  try {
    const list = await GET('/contratos');
    const c = list.find(x => x.id === id);
    if (c) {
      sv('ct-ap',   c.ap);
      sv('ct-em',   c.em);
      sv('ct-sta',  c.sta);
      sv('ct-tipo', c.tipo_ct || 'direto');
      sv('ct-hor',  c.hor);
      sv('ct-int',  c.int);
      sv('ct-ch',   c.ch);
      sv('ct-sal',  c.sal);
      sv('ct-obs',  c.obs);
      sv('ct-ini',  fd(c.ini));
      sv('ct-fim',  fd(c.fim));
    }
  } catch (_) {}
  ov('ov-ct');
}

async function sCt() {
  const ap = gv('ct-ap'), em = gv('ct-em');
  if (!ap || !em) { showAlrt('Selecione aprendiz e empresa.', 'er'); return; }
  const body = {
    ap, em,
    ini: toISO(gv('ct-ini')), fim: toISO(gv('ct-fim')),
    sta: gv('ct-sta'), hor: gv('ct-hor'), int: gv('ct-int'),
    ch:  gv('ct-ch')||null,
    sal: gv('ct-sal') ? parseFloat(gv('ct-sal').replace(',','.')) : null,
    tipo_ct: gv('ct-tipo') || 'direto',
    obs: gv('ct-obs'),
  };
  try {
    if (eid.ct) { await PUT('/contratos/' + eid.ct, body); showAlrt('Contrato atualizado.'); }
    else        { await POST('/contratos', body); showAlrt('Contrato registrado!'); }
    cov('ov-ct'); rCt(); rDash(); updCnt();
  } catch (err) { showAlrt(err.message, 'er'); }
}

async function rCt() {
  setLoading('tb-ct', 10);
  try {
    const params = new URLSearchParams();
    const q = gv('q-ct');
    if (q) params.set('q', q);
    if (flt.ct !== 'todos') params.set('sta', flt.ct);
    const list = await GET('/contratos?' + params);
    const tb = document.getElementById('tb-ct');
    if (!list.length) { tb.innerHTML = `<tr><td colspan="10"><div class="empty"><div class="ei">📋</div><p>Nenhum contrato registrado.</p></div></td></tr>`; return; }
    tb.innerHTML = list.map(c => `
      <tr>
        <td><strong>${c.ap_nom}</strong></td>
        <td>${c.em_nom}</td>
        <td>${fd(c.ini)}</td><td>${fd(c.fim)}</td>
        <td>${c.hor || '—'}</td><td>${c.int || '—'}</td>
        <td>${fm(c.sal)}</td><td>${c.ch ? c.ch + 'h' : '—'}</td>
        <td><span class="badge ${bc(c.sta)}">${c.sta || '—'}</span></td>
        <td><div class="ag">
          <button class="btn btn-s btn-sm btn-ic" onclick="oCt(${c.id})">✏</button>
          <button class="btn btn-d btn-sm btn-ic" onclick="dCt(${c.id})">🗑</button>
        </div></td>
      </tr>`).join('');
  } catch (err) { showAlrt('Erro ao carregar contratos.', 'er'); }
}

async function dCt(id) {
  if (!confirm('Excluir este contrato?')) return;
  try { await DELETE('/contratos/' + id); showAlrt('Contrato excluído.'); rCt(); rDash(); updCnt(); }
  catch (err) { showAlrt(err.message, 'er'); }
}

/* ════════════════════════════
   UNIFORMES
════════════════════════════ */
async function oUn() {
  _aps = await GET('/aprendizes').catch(() => []);
  popSel('u-ap', _aps, 'nom', 'Selecione o aprendiz');
  clr(['u-dat','u-qtd','u-ass']); ov('ov-un');
}

async function sUn() {
  const ap = gv('u-ap');
  if (!ap) { showAlrt('Selecione o aprendiz.', 'er'); return; }
  try {
    await POST('/uniformes', { ap, dat:toISO(gv('u-dat')), qtd:gv('u-qtd')||1, ass:gv('u-ass') });
    showAlrt('Entrega registrada!'); cov('ov-un'); rUn();
  } catch (err) { showAlrt(err.message, 'er'); }
}

async function rUn() {
  setLoading('tb-un', 5);
  try {
    const q = gv('q-un');
    const list = await GET('/uniformes' + (q ? '?q=' + encodeURIComponent(q) : ''));
    const tb = document.getElementById('tb-un');
    if (!list.length) { tb.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="ei">👕</div><p>Nenhum registro.</p></div></td></tr>`; return; }
    tb.innerHTML = list.map(u => `
      <tr><td><strong>${u.ap_nom}</strong></td><td>${fd(u.dat)}</td><td>${u.qtd || '—'}</td><td>${u.ass || '—'}</td>
      <td><button class="btn btn-d btn-sm btn-ic" onclick="dUn(${u.id})">🗑</button></td></tr>`).join('');
  } catch (err) { showAlrt('Erro ao carregar uniformes.', 'er'); }
}

async function dUn(id) { await DELETE('/uniformes/' + id); rUn(); }

/* ════════════════════════════
   FÉRIAS
════════════════════════════ */
async function oFe() {
  _aps = await GET('/aprendizes').catch(() => []);
  popSel('f-ap', _aps, 'nom', 'Selecione o aprendiz');
  clr(['f-ini','f-fim','f-obs']); ov('ov-fe');
}

async function sFe() {
  const ap = gv('f-ap');
  if (!ap) { showAlrt('Selecione o aprendiz.', 'er'); return; }
  try {
    await POST('/ferias', { ap, ini:toISO(gv('f-ini')), fim:toISO(gv('f-fim')), obs:gv('f-obs') });
    showAlrt('Férias registradas!'); cov('ov-fe'); rFe();
  } catch (err) { showAlrt(err.message, 'er'); }
}

async function rFe() {
  setLoading('tb-fe', 6);
  try {
    const q = gv('q-fe');
    const list = await GET('/ferias' + (q ? '?q=' + encodeURIComponent(q) : ''));
    const tb = document.getElementById('tb-fe');
    if (!list.length) { tb.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="ei">🏖️</div><p>Nenhum registro.</p></div></td></tr>`; return; }
    tb.innerHTML = list.map(f => `
      <tr><td><strong>${f.ap_nom}</strong></td><td>${f.em_nom || '—'}</td><td>${fd(f.ini)}</td><td>${fd(f.fim)}</td><td>${f.obs || '—'}</td>
      <td><button class="btn btn-d btn-sm btn-ic" onclick="dFe(${f.id})">🗑</button></td></tr>`).join('');
  } catch (err) { showAlrt('Erro ao carregar férias.', 'er'); }
}

async function dFe(id) { await DELETE('/ferias/' + id); rFe(); }

/* ════════════════════════════
   LICENÇAS
════════════════════════════ */
async function oLi() {
  _aps = await GET('/aprendizes').catch(() => []);
  popSel('l-ap', _aps, 'nom', 'Selecione o aprendiz');
  clr(['l-ini','l-fim','l-mot']); ov('ov-li');
}

async function sLi() {
  const ap = gv('l-ap');
  if (!ap) { showAlrt('Selecione o aprendiz.', 'er'); return; }
  try {
    await POST('/licencas', { ap, ini:toISO(gv('l-ini')), fim:toISO(gv('l-fim')), mot:gv('l-mot') });
    showAlrt('Licença registrada!'); cov('ov-li'); rLi();
  } catch (err) { showAlrt(err.message, 'er'); }
}

async function rLi() {
  setLoading('tb-li', 5);
  try {
    const q = gv('q-li');
    const list = await GET('/licencas' + (q ? '?q=' + encodeURIComponent(q) : ''));
    const tb = document.getElementById('tb-li');
    if (!list.length) { tb.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="ei">🏥</div><p>Nenhum registro.</p></div></td></tr>`; return; }
    tb.innerHTML = list.map(l => `
      <tr><td><strong>${l.ap_nom}</strong></td><td>${fd(l.ini)}</td><td>${fd(l.fim)}</td><td>${l.mot || '—'}</td>
      <td><button class="btn btn-d btn-sm btn-ic" onclick="dLi(${l.id})">🗑</button></td></tr>`).join('');
  } catch (err) { showAlrt('Erro ao carregar licenças.', 'er'); }
}

async function dLi(id) { await DELETE('/licencas/' + id); rLi(); }

/* ════════════════════════════
   DRAWER — FICHA
════════════════════════════ */
async function oDr(id) {
  drId = id;
  try {
    const [a, cts, uns, fes, lis] = await Promise.all([
      GET('/aprendizes/' + id),
      GET('/contratos'),
      GET('/uniformes'),
      GET('/ferias'),
      GET('/licencas'),
    ]);
    // filtrar pelo aprendiz
    const mcts = cts.filter(c => c.ap == id);
    const muns = uns.filter(u => u.ap == id);
    const mfes = fes.filter(f => f.ap == id);
    const mlis = lis.filter(l => l.ap == id);

    document.getElementById('dr-ttl').textContent = a.nom;
    const mini = (rows, ths, fn) => `
      <table class="ct">
        <thead><tr>${ths.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.length ? rows.map(fn).join('') : `<tr><td colspan="${ths.length}" style="text-align:center;color:var(--mu);padding:10px;font-size:.78rem">Sem registros.</td></tr>`}</tbody>
      </table>`;

    document.getElementById('dr-bdy').innerHTML = `
      <div class="ds">
        <div class="dst">Identificação</div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:46px;height:46px;background:var(--g1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:700;color:var(--g6);flex-shrink:0">${a.nom.charAt(0).toUpperCase()}</div>
          <div><div style="font-size:1rem;font-weight:700;color:var(--ink)">${a.nom}</div><span class="badge ${bc(a.sta)}">${a.sta || '—'}</span></div>
        </div>
        <div class="dg2">
          <div class="di"><label>Matrícula</label><span>${a.mat || '—'}</span></div>
          <div class="di"><label>Inscrição</label><span>${a.ins || '—'}</span></div>
          <div class="di"><label>CPF</label><span>${a.cpf || '—'}</span></div>
          <div class="di"><label>Dt. Nascimento</label><span>${fd(a.nas)}</span></div>
          <div class="di"><label>Modalidade</label><span>${a.mod || '—'}</span></div>
          <div class="di"><label>Escolaridade</label><span>${a.esc || '—'}</span></div>
          <div class="di"><label>Turno</label><span>${a.tur || '—'}</span></div>
          <div class="di"><label>Empresa</label><span>${a.emp_nom || '—'}</span></div>
          <div class="di"><label>Curso Início</label><span>${fd(a.cni)}</span></div>
          <div class="di"><label>Curso Término</label><span>${fd(a.cnf)}</span></div>
          <div class="di"><label>Turma</label><span>${a.trm || '—'}</span></div>
        </div>
      </div>
      <div class="ds">
        <div class="dst">Contatos e Endereço</div>
        <div class="dg2">
          <div class="di full"><label>Endereço</label><span>${[a.logr,a.num,a.bai].filter(Boolean).join(', ') || '—'}</span></div>
          <div class="di"><label>CEP</label><span>${a.cep || '—'}</span></div>
          <div class="di"><label>Tel. Residencial</label><span>${a.tre || '—'}</span></div>
          <div class="di"><label>Celular</label><span>${a.cel || '—'}</span></div>
          <div class="di"><label>Tel. Trab./Resp.</label><span>${a.ttr || '—'}</span></div>
          <div class="di"><label>Outros</label><span>${a.out || '—'}</span></div>
        </div>
      </div>
      <div class="ds">
        <div class="dst">Responsável</div>
        <div class="dg2">
          <div class="di"><label>Nome</label><span>${a.res || '—'}</span></div>
          <div class="di"><label>Parentesco</label><span>${a.par || '—'}</span></div>
          <div class="di"><label>CPF Responsável</label><span>${a.cpr || '—'}</span></div>
        </div>
      </div>
      <div class="ds"><div class="dst">Contratos</div>
        ${mini(mcts,['Empresa','Início','Término','Horário','Salário','Status'],
          c => `<tr><td>${c.em_nom}</td><td>${fd(c.ini)}</td><td>${fd(c.fim)}</td><td>${c.hor||'—'}</td><td>${fm(c.sal)}</td><td><span class="badge ${bc(c.sta)}">${c.sta}</span></td></tr>`)}
      </div>
      <div class="ds"><div class="dst">Uniformes</div>
        ${mini(muns,['Data','Qtd','Assinatura'],u=>`<tr><td>${fd(u.dat)}</td><td>${u.qtd||'—'}</td><td>${u.ass||'—'}</td></tr>`)}
      </div>
      <div class="ds"><div class="dst">Férias</div>
        ${mini(mfes,['Início','Fim','Observação'],f=>`<tr><td>${fd(f.ini)}</td><td>${fd(f.fim)}</td><td>${f.obs||'—'}</td></tr>`)}
      </div>
      <div class="ds"><div class="dst">Licenças Médicas</div>
        ${mini(mlis,['Início','Fim','Motivo'],l=>`<tr><td>${fd(l.ini)}</td><td>${fd(l.fim)}</td><td>${l.mot||'—'}</td></tr>`)}
      </div>
      ${a.obs ? `<div class="ds"><div class="dst">Observações</div><p style="font-size:.84rem;color:var(--i2);line-height:1.65">${a.obs}</p></div>` : ''}
    `;
    document.getElementById('dov').classList.add('open');
  } catch (err) { showAlrt('Erro ao carregar ficha.', 'er'); }
}

function efd() { cdov(); setTimeout(() => oAp(drId), 150); }


/* ════════════════════════════
   MÓDULO FINANCEIRO
════════════════════════════ */
const fmR = v => v != null ? 'R$ ' + parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'R$ 0,00';
let finTabAtual = 'direto';
let finCompAtual = null;
let finCobId = null;
let _comps = [];

// ── Nav já está definido acima, apenas hook financeiro ──

async function finInit() {
  try {
    _comps = await GET('/financeiro/competencias');
    const sel = document.getElementById('fin-comp');
    sel.innerHTML = '<option value="">Selecione o mês…</option>';
    _comps.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.descricao;
      sel.appendChild(o);
    });
    // Selecionar competência mais recente automaticamente
    if (_comps.length) {
      sel.value = _comps[0].id;
      finCarregar();
    }
  } catch (err) { showAlrt('Erro ao carregar competências.','er'); }
}

async function finCarregar() {
  const comp_id = document.getElementById('fin-comp').value;
  finCompAtual = comp_id || null;
  const btnGerar = document.getElementById('btn-fin-gerar');
  const btnD = document.getElementById('btn-exp-d');
  const btnI = document.getElementById('btn-exp-i');
  btnGerar.disabled = !comp_id;
  btnD.disabled = !comp_id;
  btnI.disabled = !comp_id;
  if (!comp_id) {
    document.getElementById('fin-kpis').style.display = 'none';
    document.getElementById('fin-corpo').innerHTML = '';
    return;
  }
  await finAtualizarKpis();
  await finRenderTabela();
}

async function finAtualizarKpis() {
  if (!finCompAtual) return;
  try {
    const k = await GET('/financeiro/kpis/' + finCompAtual);
    document.getElementById('fin-kpis').style.display = 'flex';
    document.getElementById('fkv-total').textContent    = fmR(k.total_geral);
    document.getElementById('fkv-direto').textContent   = fmR(k.total_direto);
    document.getElementById('fkv-indireto').textContent = fmR(k.total_indireto);
    document.getElementById('fkv-aps').textContent      = k.total_aprendizes;
    document.getElementById('sb-fin').textContent       = k.total_aprendizes;
  } catch(_) {}
}

function finTab(el, tipo) {
  el.closest('.fps').querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  finTabAtual = tipo;
  finRenderTabela();
}

async function finRenderTabela() {
  if (!finCompAtual) return;
  const corpo = document.getElementById('fin-corpo');
  corpo.innerHTML = '<div style="text-align:center;padding:30px;color:var(--mu);font-size:.83rem">Carregando…</div>';
  try {
    const resumo = await GET('/financeiro/resumo/' + finCompAtual + '?tipo=' + finTabAtual);
    if (!resumo.length) {
      corpo.innerHTML = `<div class="card"><div class="empty"><div class="ei">💰</div>
        <p>Nenhuma cobrança gerada para ${finTabAtual === 'direto' ? 'contratos diretos' : 'contratos indiretos'}.<br>
        Clique em <strong>⚡ Gerar Cobranças</strong> para criar automaticamente.</p></div></div>`;
      return;
    }

    const cursoLabel = finTabAtual === 'indireto' ? 'Custo Mensal' : 'Curso';
    let html = '';

    resumo.forEach(emp => {
      const totalFmt = fmR(emp.total_geral);
      html += `
        <div class="card" style="margin-bottom:18px">
          <div class="chd">
            <div>
              <span class="cttl">${emp.em_nom}</span>
              ${emp.em_cnj ? `<span style="font-size:.73rem;color:var(--mu);margin-left:8px;font-family:monospace">${emp.em_cnj}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="badge ba">${emp.qtd_aprendizes} aprendiz${emp.qtd_aprendizes!=1?'es':''}</span>
              <span style="font-weight:700;color:var(--g5);font-size:.95rem">${totalFmt}</span>
            </div>
          </div>
          <table>
            <thead><tr>
              <th>Aprendiz</th><th>Início</th><th>Fim</th>
              <th>Uniforme</th><th>${cursoLabel}</th><th>Mat. Didático</th>
              <th>Total</th><th>NF</th><th></th>
            </tr></thead>
            <tbody>`;

      emp.aprendizes.forEach(ap => {
        const staBadge = ap.sta_pgto === 'pago' ? 'ba' : ap.sta_pgto === 'atrasado' ? 'be' : 'bp';
        html += `<tr>
          <td><strong>${ap.ap_nom}</strong></td>
          <td style="font-size:.78rem">${ap.ct_ini ? new Date(ap.ct_ini).toLocaleDateString('pt-BR') : '—'}</td>
          <td style="font-size:.78rem">${ap.ct_fim ? new Date(ap.ct_fim).toLocaleDateString('pt-BR') : '—'}</td>
          <td style="text-align:right">${ap.vl_uniforme > 0 ? fmR(ap.vl_uniforme) : '—'}</td>
          <td style="text-align:right">${fmR(ap.vl_curso)}</td>
          <td style="text-align:right">${ap.vl_material > 0 ? fmR(ap.vl_material) : '—'}</td>
          <td style="text-align:right;font-weight:700;color:var(--g5)">${fmR(ap.vl_total)}</td>
          <td style="font-size:.75rem;color:var(--mu)">${ap.nf_numero || '—'}</td>
          <td><div class="ag">
            <span class="badge ${staBadge}" style="font-size:.65rem">${ap.sta_pgto}</span>
            <button class="btn btn-s btn-sm btn-ic" onclick="finEditarCob(${ap.id})">✏</button>
          </div></td>
        </tr>`;
      });

      html += `
            </tbody>
            <tfoot><tr>
              <td colspan="6" style="text-align:right;font-weight:700;font-size:.82rem;color:var(--mu)">Total da empresa:</td>
              <td style="text-align:right;font-weight:700;color:var(--g5);font-size:.9rem">${totalFmt}</td>
              <td colspan="2"></td>
            </tr></tfoot>
          </table>
        </div>`;
    });

    // Totalizador geral
    const totalGeral = resumo.reduce((s, e) => s + parseFloat(e.total_geral||0), 0);
    const totalAps   = resumo.reduce((s, e) => s + parseInt(e.qtd_aprendizes||0), 0);
    html += `<div class="card" style="background:var(--g6);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;font-size:.95rem">TOTAL GERAL — ${totalAps} aprendizes</span>
      <span style="font-weight:700;font-size:1.2rem">${fmR(totalGeral)}</span>
    </div>`;

    corpo.innerHTML = html;
  } catch (err) { corpo.innerHTML = '<div class="card"><p style="color:red">Erro ao carregar: '+err.message+'</p></div>'; }
}

// ── Nova competência ──
function finNovaComp() {
  const now = new Date();
  sv('comp-mes', now.getMonth() + 1);
  sv('comp-ano', now.getFullYear());
  ov('ov-comp');
}

async function finSalvarComp() {
  const mes = parseInt(gv('comp-mes'));
  const ano = parseInt(gv('comp-ano'));
  if (!mes || !ano) { showAlrt('Informe mês e ano.','er'); return; }
  try {
    const c = await POST('/financeiro/competencias', { mes, ano });
    showAlrt('Competência criada: ' + c.descricao);
    cov('ov-comp');
    await finInit();
    document.getElementById('fin-comp').value = c.id;
    finCarregar();
  } catch (err) { showAlrt(err.message,'er'); }
}

// ── Gerar cobranças ──
async function finGerar() {
  if (!finCompAtual) return;
  const comp = _comps.find(c => c.id == finCompAtual);
  if (!confirm('Gerar cobranças para ' + (comp?.descricao||'') + '?\nApenas contratos sem cobrança gerada serão processados.')) return;
  try {
    showAlrt('Gerando cobranças…');
    const r = await POST('/financeiro/gerar', { comp_id: finCompAtual });
    showAlrt(`✅ ${r.geradas} cobranças geradas, ${r.ignoradas} já existiam.`);
    await finAtualizarKpis();
    await finRenderTabela();
  } catch (err) { showAlrt(err.message,'er'); }
}

// ── Exportar Excel ──
function finExportar(tipo) {
  if (!finCompAtual) return;
  window.open('/api/financeiro/exportar/' + finCompAtual + '?tipo=' + tipo, '_blank');
}

// ── Editar cobrança ──
async function finEditarCob(id) {
  finCobId = id;
  try {
    const list = await GET('/financeiro/cobrancas?comp_id=' + finCompAtual);
    const c = list.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cob-tt').textContent = 'Editar — ' + c.ap_nom;
    document.getElementById('cob-info').innerHTML =
      `<strong>${c.em_nom}</strong> · Contrato: ${c.ct_ini ? new Date(c.ct_ini).toLocaleDateString('pt-BR') : '—'} até ${c.ct_fim ? new Date(c.ct_fim).toLocaleDateString('pt-BR') : '—'}`;
    sv('cob-curso', parseFloat(c.vl_curso||0).toFixed(2));
    sv('cob-unif',  parseFloat(c.vl_uniforme||0).toFixed(2));
    sv('cob-mat',   parseFloat(c.vl_material||0).toFixed(2));
    sv('cob-carga', c.carga_horaria||'');
    sv('cob-nf',    c.nf_numero||'');
    sv('cob-sta',   c.sta_pgto||'pendente');
    sv('cob-dtpg',  c.dt_pgto ? new Date(c.dt_pgto).toLocaleDateString('pt-BR') : '');
    sv('cob-obs',   c.obs||'');
    ov('ov-cob');
  } catch (err) { showAlrt('Erro ao carregar cobrança.','er'); }
}

async function finSalvarCob() {
  if (!finCobId) return;
  try {
    await PUT('/financeiro/cobrancas/' + finCobId, {
      vl_curso:      parseFloat(gv('cob-curso'))||0,
      vl_uniforme:   parseFloat(gv('cob-unif'))||0,
      vl_material:   parseFloat(gv('cob-mat'))||0,
      carga_horaria: gv('cob-carga')||null,
      nf_numero:     gv('cob-nf')||null,
      sta_pgto:      gv('cob-sta')||'pendente',
      dt_pgto:       toISO(gv('cob-dtpg'))||null,
      obs:           gv('cob-obs')||null,
    });
    showAlrt('Cobrança atualizada.');
    cov('ov-cob');
    await finAtualizarKpis();
    await finRenderTabela();
  } catch (err) { showAlrt(err.message,'er'); }
}

/* ── Init ── */
rDash();
updCnt();
