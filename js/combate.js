/* =========================================================
   Simulador de combate — iniciativa em HUD + teste de dados livre
   ---------------------------------------------------------
   Sem ataque-vs-defesa: o jogador escreve algo como "+4d20+15"
   (vantagem, pega o maior) ou "-4d20+15" (desvantagem, pega o
   menor), rola, e confirma se passou ou não no teste. 20 no dado
   escolhido = crítico; 1 = desastre. Tudo sincronizado na nuvem.
========================================================= */

function defaultCombateData(){
  return { combatentes: [], turnoIdx: -1, log: [], ultimoTeste: null };
}

const personagensStore = createSyncStore({ name:'personagens', url: window.ARTON_SYNC_PERSONAGENS_URL, defaultData: defaultPersonagensData });
const combateStore = createSyncStore({ name:'combate', url: window.ARTON_SYNC_COMBATE_URL, defaultData: defaultCombateData });

const appEl = document.getElementById('app');
const sessaoBadgeEl = document.getElementById('sessao-badge');

let trackerBody, turnoInfo, logEl, diceStageEl;
let lastRenderedTesteId = null;

const testeState = { nomeTester: '', expr: '+1d20+5' };

async function boot(){
  appEl.innerHTML = '<div class="empty-state">Carregando cena de combate…</div>';
  await Promise.all([ personagensStore.load(), combateStore.load() ]);
  garantirFichasCompletas(personagensStore);
  (combateStore.data.combatentes||[]).forEach(c => { if(!c.sanidade) c.sanidade = { atual:10, max:10 }; });
  renderSessaoBadge(sessaoBadgeEl);
  renderLoginGate(appEl, personagensStore, () => {
    renderSessaoBadge(sessaoBadgeEl);
    montarInterface();
    startAutoRefresh();
  });
}

function corDoCombatente(c){
  if(c.tipo === 'pc'){
    const r = window.ARTON_ROSTER.find(r => r.id === c.origemId);
    if(r) return r.cor;
  }
  if(c.tipo === 'inimigo') return '#5c3a3a';
  return '#3a4353';
}

function montarInterface(){
  appEl.innerHTML = '';

  appEl.appendChild(el('section', { style:'padding: 0 0 20px;' }, [
    el('span', { class:'eyebrow' }, ['Cena atual']),
    el('h1', {}, ['Simulador de combate']),
    el('p', { class:'lede small' }, [
      'Escreva um teste como ',
      el('code', {}, ['+1d20+5']),
      ' (normal), ',
      el('code', {}, ['+4d20+15']),
      ' (vantagem — rola 4 e pega o maior) ou ',
      el('code', {}, ['-4d20+15']),
      ' (desvantagem — pega o menor). 20 no dado escolhido é crítico, 1 é desastre.'
    ])
  ]));

  /* ---- palco de dados / teste ---- */
  const testePanel = el('div', { class:'panel' });
  testePanel.appendChild(el('h2', {}, ['🎲 Teste de dados']));
  testePanel.appendChild(el('div', { class:'grid grid-3' }, [
    el('div', { class:'field' }, [
      el('label', {}, ['Quem está testando']),
      el('input', { type:'text', id:'teste-nome', list:'nomes-combatentes', value: testeState.nomeTester,
        placeholder:'Nome do personagem', oninput: e => testeState.nomeTester = e.target.value })
    ]),
    el('div', { class:'field' }, [
      el('label', {}, ['Expressão do teste']),
      el('input', { type:'text', id:'teste-expr', value: testeState.expr,
        placeholder:'+1d20+5', oninput: e => testeState.expr = e.target.value })
    ]),
    el('div', { class:'field', style:'display:flex;align-items:flex-end;' }, [
      el('button', { class:'d20-btn', id:'roll-teste-btn', onclick: resolverTeste }, ['🎲'])
    ]),
  ]));
  testePanel.appendChild(el('datalist', { id:'nomes-combatentes' }));
  testePanel.appendChild(el('div', { id:'teste-erro', class:'small', style:'color:var(--blood-bright);min-height:1.2em;' }));

  diceStageEl = el('div', { class:'dice-stage', id:'dice-stage' });
  testePanel.appendChild(diceStageEl);
  appEl.appendChild(testePanel);

  /* ---- iniciativa / combatentes ---- */
  const trackerPanel = el('div', { class:'panel' });
  trackerPanel.appendChild(el('div', { class:'panel-head' }, [
    el('h2', {}, ['Iniciativa & combatentes']),
    el('div', { class:'btn-row' }, [
      el('select', { id:'ficha-add-select' }),
      ehMestre() ? el('select', { id:'inimigo-add-select' }) : null,
      el('button', { id:'btn-add-manual', class:'btn-sm' }, ['+ Manual']),
      el('button', { id:'btn-rolar-iniciativa', class:'btn-sm btn-brass' }, ['🎲 Rolar iniciativa (todos)']),
      el('button', { id:'btn-atualizar', class:'btn-sm btn-ghost' }, ['🔄 Atualizar']),
    ])
  ]));
  trackerBody = el('div', { id:'tracker-body' });
  trackerPanel.appendChild(trackerBody);

  turnoInfo = el('span', { class:'num-mono small', style:'align-self:center;color:var(--brass-bright);' });
  trackerPanel.appendChild(el('div', { class:'btn-row', style:'margin-top:8px;justify-content:space-between;' }, [
    el('div', { class:'btn-row' }, [
      el('button', { id:'btn-turno-prev', class:'btn-sm' }, ['← Turno anterior']),
      turnoInfo,
      el('button', { id:'btn-turno-next', class:'btn-sm' }, ['Próximo turno →']),
    ]),
    el('button', { id:'btn-limpar-cena', class:'btn-sm btn-ghost' }, ['Limpar cena'])
  ]));
  appEl.appendChild(trackerPanel);

  /* ---- registro ---- */
  const logPanel = el('div', { class:'panel' });
  logPanel.appendChild(el('div', { class:'panel-head' }, [
    el('h2', {}, ['Registro de combate']),
    el('button', { id:'btn-limpar-log', class:'btn-sm btn-ghost' }, ['Limpar registro'])
  ]));
  logEl = el('div', { class:'log' });
  logPanel.appendChild(logEl);
  appEl.appendChild(logPanel);

  wireBotoesFixos();
  popularSelectFichas();
  if(ehMestre()) popularSelectInimigos();
  renderTracker();
  renderLog();
  syncTesteStage();
}

function wireBotoesFixos(){
  document.getElementById('btn-add-manual').addEventListener('click', addCombatenteManual);
  document.getElementById('btn-rolar-iniciativa').addEventListener('click', rolarIniciativaTodos);
  document.getElementById('btn-turno-prev').addEventListener('click', () => avancarTurno(-1));
  document.getElementById('btn-turno-next').addEventListener('click', () => avancarTurno(1));
  document.getElementById('btn-limpar-log').addEventListener('click', limparLog);
  document.getElementById('btn-limpar-cena').addEventListener('click', limparCena);
  document.getElementById('btn-atualizar').addEventListener('click', async () => {
    await Promise.all([ personagensStore.load(), combateStore.load() ]);
    popularSelectFichas(); if(ehMestre()) popularSelectInimigos();
    renderTracker(); renderLog(); syncTesteStage();
  });

  const fichaAddSelect = document.getElementById('ficha-add-select');
  fichaAddSelect.addEventListener('change', () => {
    if(fichaAddSelect.value){ addCombatenteDeFicha(fichaAddSelect.value); fichaAddSelect.value=''; }
  });
  const inimigoAddSelect = document.getElementById('inimigo-add-select');
  if(inimigoAddSelect){
    inimigoAddSelect.addEventListener('change', () => {
      if(inimigoAddSelect.value){ addCombatenteDeInimigo(inimigoAddSelect.value); inimigoAddSelect.value=''; }
    });
  }
}

function popularSelectFichas(){
  const sel = document.getElementById('ficha-add-select');
  sel.innerHTML = '';
  sel.appendChild(el('option', { value:'' }, ['+ De uma ficha…']));
  personagensStore.data.fichas.forEach(f => sel.appendChild(el('option', { value:f.id }, [f.nome || '(sem nome)'])));
}
function popularSelectInimigos(){
  const sel = document.getElementById('inimigo-add-select');
  if(!sel) return;
  sel.innerHTML = '';
  sel.appendChild(el('option', { value:'' }, ['+ De um inimigo…']));
  personagensStore.data.inimigos.forEach(inim => sel.appendChild(el('option', { value:inim.id }, [inim.nome])));
}

function atualizarDatalistNomes(){
  const dl = document.getElementById('nomes-combatentes');
  if(!dl) return;
  dl.innerHTML = '';
  combateStore.data.combatentes.forEach(c => dl.appendChild(el('option', { value:c.nome })));
}

/* ---------------- tracker (cartões com barras de HUD) ---------------- */

function addCombatenteManual(){
  combateStore.data.combatentes.push({
    id: uid(), nome:'Novo combatente', tipo:'manual', origemId:null,
    iniciativaBonus:0, iniciativa:null,
    hp:{atual:10,max:10}, pm:{atual:10,max:10}, sanidade:{atual:10,max:10}
  });
  scheduleSave(combateStore); renderTracker();
}

function addCombatenteDeFicha(fichaId){
  const f = personagensStore.data.fichas.find(f=>f.id===fichaId);
  if(!f) return;
  let iniBonus = 0;
  const iniP = (f.atributos||[]).flatMap(a=>a.pericias||[]).find(p=>/inicia/i.test(p.nome));
  if(iniP) iniBonus = parseInt(iniP.base||0,10) + parseInt(iniP.bonus||0,10);
  combateStore.data.combatentes.push({
    id: uid(), nome: f.nome || 'Personagem', tipo:'pc', origemId: f.id,
    iniciativaBonus: iniBonus, iniciativa: null,
    hp: { atual: f.vida.atual, max: f.vida.max },
    pm: { atual: f.energia.atual, max: f.energia.max },
    sanidade: { atual: f.sanidade.atual, max: f.sanidade.max }
  });
  scheduleSave(combateStore); renderTracker();
}

function addCombatenteDeInimigo(inimigoId){
  const inim = personagensStore.data.inimigos.find(i=>i.id===inimigoId);
  if(!inim) return;
  combateStore.data.combatentes.push({
    id: uid(), nome: inim.nome, tipo:'inimigo', origemId: inim.id,
    iniciativaBonus: inim.iniciativaBonus||0, iniciativa: null,
    hp: { atual: inim.vida.atual, max: inim.vida.max },
    pm: { atual: inim.energia.atual, max: inim.energia.max },
    sanidade: { atual: (inim.sanidade||{atual:10}).atual, max: (inim.sanidade||{max:10}).max }
  });
  scheduleSave(combateStore); renderTracker();
}

function removerCombatente(id){
  combateStore.data.combatentes = combateStore.data.combatentes.filter(c=>c.id!==id);
  if(combateStore.data.turnoIdx >= combateStore.data.combatentes.length) combateStore.data.turnoIdx = -1;
  scheduleSave(combateStore); renderTracker();
}

function rolarIniciativaTodos(){
  combateStore.data.combatentes.forEach(c => { c.iniciativa = rollD20() + parseInt(c.iniciativaBonus||0,10); });
  combateStore.data.combatentes.sort((a,b) => (b.iniciativa??-999)-(a.iniciativa??-999));
  combateStore.data.turnoIdx = combateStore.data.combatentes.length ? 0 : -1;
  scheduleSave(combateStore); renderTracker();
  addLog(`<span class="tag" style="background:rgba(214,171,94,.2);color:var(--brass-bright)">Iniciativa</span> Ordem rolada para ${combateStore.data.combatentes.length} combatente(s).`);
}

function avancarTurno(delta){
  const cs = combateStore.data;
  if(cs.combatentes.length === 0) return;
  if(cs.turnoIdx < 0) cs.turnoIdx = 0;
  else cs.turnoIdx = (cs.turnoIdx + delta + cs.combatentes.length) % cs.combatentes.length;
  scheduleSave(combateStore); renderTracker();
}

function ajustarBarra(id, campo, delta){
  const c = combateStore.data.combatentes.find(c=>c.id===id);
  if(!c) return;
  c[campo].atual = clamp(c[campo].atual + delta, 0, c[campo].max);
  scheduleSave(combateStore); renderTracker();
}

function hudRow(label, obj, gaugeClass, c, campo){
  const gauge = el('div', { class: 'gauge ' + gaugeClass });
  const pct = obj.max ? clamp(Math.round(obj.atual/obj.max*100),0,100) : 0;
  gauge.style.setProperty('--pct', pct + '%');
  const valueLabel = el('div', { class:'hud-value' }, [`${obj.atual} / ${obj.max}`]);
  const barWrap = el('div', { class:'hud-bar-wrap' }, [ gauge, valueLabel ]);

  const atualInput = el('input', { type:'number', value: obj.atual, oninput: e => {
    obj.atual = clamp(parseInt(e.target.value||0,10), 0, obj.max);
    gauge.style.setProperty('--pct', (obj.max?clamp(Math.round(obj.atual/obj.max*100),0,100):0)+'%');
    valueLabel.textContent = `${obj.atual} / ${obj.max}`;
    scheduleSave(combateStore);
  } });
  const maxInput = el('input', { type:'number', value: obj.max, oninput: e => {
    obj.max = parseInt(e.target.value||0,10) || 1;
    gauge.style.setProperty('--pct', clamp(Math.round(obj.atual/obj.max*100),0,100)+'%');
    valueLabel.textContent = `${obj.atual} / ${obj.max}`;
    scheduleSave(combateStore);
  } });

  return el('div', { class:'hud-row' }, [
    el('div', { class:'hud-label' }, [label]),
    barWrap,
    el('div', { class:'hud-edit' }, [
      atualInput, el('span', { class:'muted' }, ['/']), maxInput,
      el('button', { class:'btn-sm btn-blood', onclick: () => ajustarBarra(c.id, campo, -1) }, ['-1']),
      el('button', { class:'btn-sm btn-brass', onclick: () => ajustarBarra(c.id, campo, 1) }, ['+1']),
    ])
  ]);
}

function hudRowOculto(label, obj, gaugeClass){
  const gauge = el('div', { class:'gauge ' + gaugeClass });
  gauge.style.setProperty('--pct', (obj.max?clamp(Math.round(obj.atual/obj.max*100),0,100):0)+'%');
  return el('div', { class:'hud-row' }, [
    el('div', { class:'hud-label' }, [label]),
    el('div', { class:'hud-bar-wrap' }, [ gauge, el('div', { class:'hud-value' }, ['???']) ]),
  ]);
}

function renderTracker(){
  const cs = combateStore.data;
  trackerBody.innerHTML = '';
  if(cs.combatentes.length === 0){
    trackerBody.appendChild(el('div', { class:'empty-state' }, ['Ninguém em cena ainda. Adicione um combatente acima.']));
  } else {
    cs.combatentes.forEach((c, idx) => {
      const isActive = idx === cs.turnoIdx;
      const oculto = c.tipo === 'inimigo' && !ehMestre();
      const cor = corDoCombatente(c);

      const card = el('div', {
        class: 'combatant-card',
        style: `--card-accent:${cor};${isActive ? 'box-shadow:0 0 0 2px var(--brass-bright) inset;' : ''}`
      });

      card.appendChild(el('div', { class:'combatant-head' }, [
        el('div', { class:'combatant-head-left' }, [
          el('input', { type:'text', value:c.nome, oninput: e=>{ c.nome=e.target.value; scheduleSave(combateStore); atualizarDatalistNomes(); } }),
          el('span', { class:'tipo-tag' }, [ c.tipo==='inimigo' ? '👹 inimigo' : c.tipo==='pc' ? '📜 personagem' : '— manual —' ]),
        ]),
        el('div', { class:'btn-row' }, [
          el('span', { class:'iniciativa-badge' }, [
            'Inic. ',
            el('input', { type:'number', value:c.iniciativaBonus, oninput: e=>{ c.iniciativaBonus=parseInt(e.target.value||0,10); scheduleSave(combateStore); } }),
            ' → ', String(c.iniciativa ?? '—')
          ]),
          el('button', { class:'btn-sm btn-ghost', onclick: () => removerCombatente(c.id) }, ['✕'])
        ])
      ]));

      if(oculto){
        card.appendChild(hudRowOculto('PV', c.hp, 'hp'));
        card.appendChild(hudRowOculto('PM', c.pm, 'pm'));
        card.appendChild(hudRowOculto('SAN', c.sanidade, 'san'));
      } else {
        card.appendChild(hudRow('PV', c.hp, 'hp', c, 'hp'));
        card.appendChild(hudRow('PM', c.pm, 'pm', c, 'pm'));
        card.appendChild(hudRow('SAN', c.sanidade, 'san', c, 'sanidade'));
      }

      trackerBody.appendChild(card);
    });
  }
  turnoInfo.textContent = cs.turnoIdx >= 0 && cs.combatentes[cs.turnoIdx] ? `Turno de: ${cs.combatentes[cs.turnoIdx].nome}` : 'Nenhum turno ativo';
  atualizarDatalistNomes();
}

/* ---------------- teste de dados ---------------- */

function parseTesteExpr(expr){
  const m = (expr||'').replace(/\s+/g,'').match(/^([+-]?)(\d*)d20([+-]\d+)?$/i);
  if(!m) return null;
  const sinal = m[1] === '-' ? '-' : '+';
  const count = m[2] ? parseInt(m[2],10) : 1;
  const mod = m[3] ? parseInt(m[3],10) : 0;
  if(count < 1 || count > 20) return null;
  return { sinal, count, mod };
}

function resolverTeste(){
  const erroEl = document.getElementById('teste-erro');
  erroEl.textContent = '';
  const parsed = parseTesteExpr(testeState.expr);
  if(!parsed){
    erroEl.textContent = 'Formato inválido. Use algo como +1d20+5, +4d20+15 (vantagem) ou -4d20+15 (desvantagem).';
    return;
  }
  const rolls = [];
  for(let i=0;i<parsed.count;i++) rolls.push(rollD20());
  const alvo = parsed.sinal === '-' ? Math.min(...rolls) : Math.max(...rolls);
  const escolhidoIdx = rolls.indexOf(alvo);
  const total = alvo + parsed.mod;
  const crit = alvo === 20;
  const fumble = alvo === 1;
  const nome = (testeState.nomeTester || '').trim() || 'Alguém';

  const teste = {
    id: uid(), ts: Date.now(), nome, expr: testeState.expr,
    rolls, escolhidoIdx, sinal: parsed.sinal, mod: parsed.mod, total, crit, fumble, resultado: null
  };
  combateStore.data.ultimoTeste = teste;
  scheduleSave(combateStore);
  addLog(logHtmlTeste(teste));
  renderTesteStage(teste, true);
  lastRenderedTesteId = teste.id;
}

function logHtmlTeste(teste){
  const tag = teste.fumble ? '<span class="tag tag-miss">Desastre</span>'
    : teste.crit ? '<span class="tag tag-crit">Crítico</span>'
    : '<span class="tag tag-neutro">Teste</span>';
  const escolhidoVal = teste.rolls[teste.escolhidoIdx];
  return `${tag} ${escapeHtml(teste.nome)} — ${escapeHtml(teste.expr)} → [${teste.rolls.join(', ')}] escolhido ${escolhidoVal} ${teste.mod>=0?'+':''}${teste.mod} = <strong>${teste.total}</strong>`;
}

function syncTesteStage(){
  const t = combateStore.data.ultimoTeste;
  if(!t){
    diceStageEl.innerHTML = '';
    diceStageEl.appendChild(el('div', { class:'dice-stage-heading' }, ['Nenhum teste ainda. Role um d20 ali em cima.']));
    return;
  }
  const isNew = t.id !== lastRenderedTesteId;
  renderTesteStage(t, isNew);
  lastRenderedTesteId = t.id;
}

function renderTesteStage(teste, animate){
  diceStageEl.innerHTML = '';
  diceStageEl.appendChild(el('div', { class:'dice-stage-heading' }, [
    `${teste.nome} está testando — ${teste.expr}`
  ]));

  const row = el('div', { class:'dice-row' });
  const faces = teste.rolls.map((val, i) => {
    return el('div', { class: 'die-face' + (animate ? ' rolling' : '') }, [animate ? '' : String(val)]);
  });
  faces.forEach(f => row.appendChild(f));
  diceStageEl.appendChild(row);

  function revelar(){
    faces.forEach((face, i) => {
      face.classList.remove('rolling');
      face.textContent = String(teste.rolls[i]);
      const isChosen = i === teste.escolhidoIdx;
      face.classList.toggle('chosen', isChosen);
      face.classList.toggle('unchosen', !isChosen && teste.rolls.length > 1);
      if(isChosen && teste.crit) face.classList.add('crit');
      if(isChosen && teste.fumble) face.classList.add('fumble');
    });
    diceStageEl.appendChild(el('div', { class:'teste-total' }, [
      `${teste.rolls[teste.escolhidoIdx]} ${teste.mod>=0?'+':''}${teste.mod} = ${teste.total}`
    ]));
    if(teste.crit){
      diceStageEl.appendChild(el('div', { class:'teste-banner crit' }, [`🎉 ${teste.nome} critou! Ele é o fodão!`]));
    } else if(teste.fumble){
      diceStageEl.appendChild(el('div', { class:'teste-banner fumble' }, [`💀 ${teste.nome} tirou desastre! Ele é bucha!`]));
    }
    diceStageEl.appendChild(renderBotoesResultado(teste));
  }

  if(animate) setTimeout(revelar, 620);
  else revelar();
}

function renderBotoesResultado(teste){
  const passouBtn = el('button', {
    class: 'btn-sm' + (teste.resultado === 'passou' ? ' btn-brass' : ''),
    onclick: () => marcarResultado(teste.id, 'passou')
  }, ['✅ Passou']);
  const falhouBtn = el('button', {
    class: 'btn-sm' + (teste.resultado === 'falhou' ? ' btn-blood' : ''),
    onclick: () => marcarResultado(teste.id, 'falhou')
  }, ['❌ Não passou']);
  return el('div', { class:'btn-row', style:'justify-content:center;margin-top:12px;' }, [passouBtn, falhouBtn]);
}

function marcarResultado(testeId, resultado){
  const t = combateStore.data.ultimoTeste;
  if(!t || t.id !== testeId) return;
  t.resultado = resultado;
  scheduleSave(combateStore);
  addLog(`<span class="tag ${resultado==='passou'?'tag-hit':'tag-miss'}">${resultado==='passou'?'Passou':'Não passou'}</span> ${escapeHtml(t.nome)} confirmou o resultado do teste.`);
  renderTesteStage(t, false);
}

/* ---------------- registro ---------------- */

function addLog(html){
  combateStore.data.log.unshift({ html, ts: Date.now() });
  combateStore.data.log = combateStore.data.log.slice(0,60);
  scheduleSave(combateStore);
  renderLog();
}
function renderLog(){
  logEl.innerHTML = '';
  if(combateStore.data.log.length === 0){ logEl.appendChild(el('div', { class:'log-empty' }, ['Nenhuma rolagem ainda.'])); return; }
  combateStore.data.log.forEach(entry => logEl.appendChild(el('div', { class:'log-entry', html: entry.html })));
}
function limparLog(){ combateStore.data.log = []; scheduleSave(combateStore); renderLog(); }
function limparCena(){
  if(!confirm('Remover todos os combatentes da cena atual?')) return;
  combateStore.data.combatentes = []; combateStore.data.turnoIdx = -1;
  scheduleSave(combateStore); renderTracker();
}

/* ---------------- auto refresh (evita atrapalhar quem tá digitando) ---------------- */

function startAutoRefresh(){
  if(!combateStore.configured) return;
  setInterval(async () => {
    if(isTypingInField()) return;
    await combateStore.load();
    (combateStore.data.combatentes||[]).forEach(c => { if(!c.sanidade) c.sanidade = { atual:10, max:10 }; });
    renderTracker(); renderLog(); syncTesteStage();
  }, 8000);
}

boot();
