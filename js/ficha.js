/* =========================================================
   Ficha de personagem — elenco fixo + visão do mestre
========================================================= */

function blankInimigo(){
  return {
    id: uid(), nome: 'Novo inimigo',
    vida: { atual: 20, max: 20 }, energia: { atual: 10, max: 10 }, sanidade: { atual: 10, max: 10 },
    iniciativaBonus: 0, ataqueBonus: 0, defesaBonus: 0,
    dano: '2d6+2/x2', anotacoes: ''
  };
}

const personagensStore = createSyncStore({
  name: 'personagens',
  url: window.ARTON_SYNC_PERSONAGENS_URL,
  defaultData: defaultPersonagensData
});

const appEl = document.getElementById('app');
const sessaoBadgeEl = document.getElementById('sessao-badge');

const state = { view: 'lista', fichaId: null };

async function boot(){
  appEl.innerHTML = '<div class="empty-state">Carregando fichas…</div>';
  await personagensStore.load();
  garantirFichasCompletas(personagensStore);
  renderSessaoBadge(sessaoBadgeEl);
  renderLoginGate(appEl, personagensStore, () => {
    renderSessaoBadge(sessaoBadgeEl);
    if(ehMestre()){ state.view = 'lista'; }
    else{ state.view = 'editor'; state.fichaId = personagemLogadoId(); }
    renderApp();
  });
}

function renderApp(){
  appEl.innerHTML = '';
  if(ehMestre()){
    renderTopoMestre();
    if(state.view === 'inimigos') renderInimigos();
    else if(state.view === 'editor') renderEditorFicha(state.fichaId, { podeVoltar:true });
    else renderRosterMestre();
  } else {
    renderEditorFicha(state.fichaId, { podeVoltar:false });
  }
}

function renderTopoMestre(){
  appEl.appendChild(el('div', { class:'btn-row', style:'margin-bottom:20px;' }, [
    el('button', { class: state.view!=='inimigos' ? 'btn-brass' : '', onclick: () => { state.view='lista'; renderApp(); } }, ['📜 Fichas dos jogadores']),
    el('button', { class: state.view==='inimigos' ? 'btn-brass' : '', onclick: () => { state.view='inimigos'; renderApp(); } }, ['👹 Inimigos']),
  ]));
}

function renderRosterMestre(){
  appEl.appendChild(el('div', { style:'padding: 0 0 20px;' }, [
    el('span', { class:'eyebrow' }, ['Visão do mestre']),
    el('h1', {}, ['Fichas dos jogadores']),
    el('p', { class:'lede small' }, ['Você vê e edita todas, sem precisar de senha.'])
  ]));
  const grid = el('div', { class:'grid grid-3' });
  window.ARTON_ROSTER.forEach(r => {
    const f = personagensStore.data.fichas.find(f => f.id === r.id);
    grid.appendChild(el('div', { class:'ficha-card', style:`border-color:${r.cor}55;` }, [
      el('div', { style:'display:flex;align-items:center;gap:12px;' }, [
        el('div', { style:`width:36px;height:36px;color:${r.cor};flex:none;`, html: iconSvg(r.icon) }),
        el('div', {}, [ el('h3', {}, [f.nome || r.nome]), el('div', { class:'meta' }, [`${f.classe||'—'} · nv.${f.level||'?'}`]) ])
      ]),
      el('div', { class:'meta' }, [`PV ${f.vida.atual}/${f.vida.max}`]),
      el('div', { class:'btn-row' }, [
        el('button', { class:'btn-sm', onclick: () => { state.view='editor'; state.fichaId=r.id; renderApp(); } }, ['Abrir ficha']),
      ])
    ]));
  });
  appEl.appendChild(grid);
}

function renderInimigos(){
  appEl.appendChild(el('div', { style:'padding: 0 0 20px;' }, [
    el('span', { class:'eyebrow' }, ['Só o mestre vê isto']),
    el('h1', {}, ['Inimigos']),
    el('p', { class:'lede small' }, ['Criaturas que aparecem no simulador de combate com stats ocultos pros jogadores.'])
  ]));

  appEl.appendChild(el('div', { class:'btn-row', style:'margin-bottom:16px;' }, [
    el('button', { class:'btn-brass', onclick: () => { personagensStore.data.inimigos.push(blankInimigo()); scheduleSave(personagensStore); renderApp(); } }, ['+ Novo inimigo'])
  ]));

  if(personagensStore.data.inimigos.length === 0){
    appEl.appendChild(el('div', { class:'empty-state' }, ['Nenhum inimigo criado ainda.']));
  }

  personagensStore.data.inimigos.forEach((inim, i) => {
    if(!inim.sanidade) inim.sanidade = { atual: 10, max: 10 };
    const card = el('div', { class:'panel' });
    card.appendChild(el('div', { class:'panel-head' }, [
      el('input', { type:'text', value: inim.nome, style:'font-family:var(--font-display);font-weight:700;font-size:1.1rem;background:transparent;border:none;color:var(--ink);padding:0;max-width:260px;',
        oninput: e => { inim.nome = e.target.value; scheduleSave(personagensStore); } }),
      el('button', { class:'btn-sm btn-blood', onclick: () => {
        if(confirm(`Remover "${inim.nome}"?`)){ personagensStore.data.inimigos.splice(i,1); scheduleSave(personagensStore); renderApp(); }
      } }, ['✕ Remover'])
    ]));

    card.appendChild(el('div', { class:'grid grid-4' }, [
      blocoGaugeInimigo('Vida', inim.vida, ''),
      blocoGaugeInimigo('Energia', inim.energia, 'pm'),
      blocoGaugeInimigo('Sanidade', inim.sanidade, 'san'),
      campoNumeroObj('Bônus de iniciativa', inim, 'iniciativaBonus'),
    ]));
    card.appendChild(el('div', { class:'grid grid-2' }, [
      campoNumeroObj('Bônus de defesa', inim, 'defesaBonus'),
      campoNumeroObj('Bônus de ataque', inim, 'ataqueBonus'),
    ]));
    card.appendChild(el('div', { class:'grid grid-2' }, [
      campoTextoObj('Dano (ex: 3d8+2/x2)', inim, 'dano'),
    ]));
    card.appendChild(el('div', { class:'field' }, [
      el('label', {}, ['Anotações']),
      el('textarea', { oninput: e => { inim.anotacoes = e.target.value; scheduleSave(personagensStore); } }, [inim.anotacoes || ''])
    ]));
    appEl.appendChild(card);
  });
}

function campoTextoObj(label, obj, key){
  return el('div', { class:'field' }, [
    el('label', {}, [label]),
    el('input', { type:'text', value: obj[key] ?? '', oninput: e => { obj[key] = e.target.value; scheduleSave(personagensStore); } })
  ]);
}
function campoNumeroObj(label, obj, key){
  return el('div', { class:'field' }, [
    el('label', {}, [label]),
    el('input', { type:'number', value: obj[key] ?? 0, oninput: e => { obj[key] = parseInt(e.target.value||0,10); scheduleSave(personagensStore); } })
  ]);
}
function blocoGaugeInimigo(titulo, obj, gaugeClass){
  const wrap = el('div', { class:'field' }, [ el('label', {}, [titulo]) ]);
  const row = el('div', { class:'gauge-row' });
  const gauge = el('div', { class: 'gauge ' + (gaugeClass||'') });
  gauge.style.setProperty('--pct', (obj.max ? clamp(Math.round(obj.atual/obj.max*100),0,100) : 0) + '%');
  row.appendChild(el('input', { type:'number', class:'num-mono', value: obj.atual, style:'max-width:60px;',
    oninput: e => { obj.atual = parseInt(e.target.value||0,10); gauge.style.setProperty('--pct', clamp(Math.round(obj.atual/obj.max*100),0,100)+'%'); scheduleSave(personagensStore); } }));
  row.appendChild(el('span', {}, ['/']));
  row.appendChild(el('input', { type:'number', class:'num-mono', value: obj.max, style:'max-width:60px;',
    oninput: e => { obj.max = parseInt(e.target.value||0,10)||1; scheduleSave(personagensStore); } }));
  wrap.appendChild(row);
  wrap.appendChild(el('div', { style:'margin-top:8px;' }, [gauge]));
  return wrap;
}

function renderEditorFicha(fichaId, opts){
  const podeVoltar = opts && opts.podeVoltar;
  const f = personagensStore.data.fichas.find(f => f.id === fichaId);
  const roster = window.ARTON_ROSTER.find(r => r.id === fichaId);
  if(!f){ appEl.appendChild(el('div', { class:'empty-state' }, ['Ficha não encontrada.'])); return; }

  function marcarSalvo(botao){
    botao.textContent = '💾 Salvo ✓';
    scheduleSave(personagensStore, () => { botao.textContent = '💾 Salvar'; });
  }

  const wrap = el('div', {});

  const basicos = el('div', { class:'panel' }, [
    el('div', { class:'panel-head' }, [
      el('div', { style:'display:flex;align-items:center;gap:12px;' }, [
        roster ? el('div', { style:`width:34px;height:34px;color:${roster.cor};`, html: iconSvg(roster.icon) }) : null,
        el('h2', {}, ['Identificação'])
      ]),
      el('div', { class:'btn-row' }, [
        podeVoltar ? el('button', { class:'btn-ghost', onclick: () => { state.view='lista'; renderApp(); } }, ['← Voltar']) : null,
        el('button', { class:'btn-brass', onclick: (e) => marcarSalvo(e.target) }, ['💾 Salvar']),
      ])
    ]),
    el('div', { class:'grid grid-4' }, [
      campoTexto('Nome do personagem', f, 'nome'),
      campoTexto('Classe', f, 'classe'),
      campoTexto('Raça', f, 'raca'),
      campoTexto('Tendência', f, 'tendencia'),
      campoNumero('Level', f, 'level'),
      campoTexto('Deslocamento', f, 'deslocamento'),
      campoTexto('Dinheiro', f, 'dinheiro'),
      campoTexto('Finanças do bando', f, 'financas'),
      campoTexto('BA', f, 'ba'),
    ])
  ]);
  wrap.appendChild(basicos);

  wrap.appendChild(el('div', { class:'panel' }, [
    el('h2', {}, ['Vitais']),
    el('div', { class:'grid grid-3' }, [
      blocoGauge('Vida', f.vida, ''),
      blocoGauge('Sanidade', f.sanidade, 'san'),
      blocoGauge('Energia', f.energia, 'pm'),
    ])
  ]));

  const attrGrid = el('div', { class:'grid grid-3' });
  f.atributos.forEach((attr, ai) => attrGrid.appendChild(blocoAtributo(f, attr, ai)));
  wrap.appendChild(el('div', { class:'panel' }, [
    el('div', { class:'panel-head' }, [
      el('h2', {}, ['Atributos e perícias']),
      el('button', { class:'btn-sm', onclick: () => { f.atributos.push({ nome:'Novo atributo', mod:0, pericias:[] }); scheduleSave(personagensStore); renderApp(); } }, ['+ Atributo'])
    ]),
    attrGrid
  ]));

  wrap.appendChild(blocoLista({
    titulo: 'Talentos', itens: f.talentos, addLabel: '+ Talento',
    onAdd: () => { f.talentos.push({ nome:'', desc:'' }); scheduleSave(personagensStore); renderApp(); },
    renderItem: (item, i) => el('div', { class:'list-row' }, [
      el('div', { class:'list-row-head' }, [
        el('input', { type:'text', placeholder:'Nome do talento', value: item.nome, oninput: e => { item.nome = e.target.value; scheduleSave(personagensStore); } }),
        el('button', { class:'btn-sm btn-blood', onclick: () => { f.talentos.splice(i,1); scheduleSave(personagensStore); renderApp(); } }, ['✕'])
      ]),
      el('textarea', { placeholder:'Descrição / custo / efeito', oninput: e => { item.desc = e.target.value; scheduleSave(personagensStore); } }, [item.desc || ''])
    ])
  }));

  wrap.appendChild(blocoLista({
    titulo: 'Inventário', itens: f.inventario, addLabel: '+ Item',
    onAdd: () => { f.inventario.push({ item:'', qtd:1, desc:'' }); scheduleSave(personagensStore); renderApp(); },
    renderItem: (item, i) => el('div', { class:'list-row' }, [
      el('div', { class:'list-row-head' }, [
        el('input', { type:'text', placeholder:'Item', value:item.item, oninput: e => { item.item = e.target.value; scheduleSave(personagensStore); } }),
        el('input', { type:'number', class:'qtd', placeholder:'Qtd', value:item.qtd, oninput: e => { item.qtd = e.target.value; scheduleSave(personagensStore); } }),
        el('button', { class:'btn-sm btn-blood', onclick: () => { f.inventario.splice(i,1); scheduleSave(personagensStore); renderApp(); } }, ['✕'])
      ]),
      el('textarea', { placeholder:'Descrição — ex: 3d8+1d6+12/x3/12m', oninput: e => { item.desc = e.target.value; scheduleSave(personagensStore); } }, [item.desc || ''])
    ])
  }));

  wrap.appendChild(el('div', { class:'panel' }, [
    el('h2', {}, ['Anotações']),
    el('textarea', { style:'min-height:110px;', oninput: e => { f.anotacoes = e.target.value; scheduleSave(personagensStore); } }, [f.anotacoes || ''])
  ]));

  wrap.appendChild(el('div', { class:'btn-row', style:'margin-top:8px;' }, [
    el('button', { class:'btn-brass', onclick: (e) => marcarSalvo(e.target) }, ['💾 Salvar']),
  ]));

  appEl.appendChild(wrap);
}

function campoTexto(label, obj, key){
  return el('div', { class:'field' }, [
    el('label', {}, [label]),
    el('input', { type:'text', value: obj[key] ?? '', oninput: e => obj[key] = e.target.value })
  ]);
}
function campoNumero(label, obj, key){
  return el('div', { class:'field' }, [
    el('label', {}, [label]),
    el('input', { type:'number', value: obj[key] ?? 0, oninput: e => obj[key] = e.target.value })
  ]);
}

function gaugePct(obj){ return obj.max ? clamp(Math.round((obj.atual/obj.max)*100),0,100) : 0; }

function blocoGauge(titulo, obj, gaugeClass){
  const wrap = el('div', { class:'field' }, [ el('label', {}, [titulo]) ]);
  const row = el('div', { class:'gauge-row' });
  const gauge = el('div', { class: 'gauge ' + (gaugeClass||'') });
  gauge.style.setProperty('--pct', gaugePct(obj) + '%');
  const atualInput = el('input', { type:'number', class:'num-mono', value: obj.atual, style:'max-width:70px;',
    oninput: e => { obj.atual = parseInt(e.target.value||0,10); gauge.style.setProperty('--pct', gaugePct(obj)+'%'); } });
  const maxInput = el('input', { type:'number', class:'num-mono', value: obj.max, style:'max-width:70px;',
    oninput: e => { obj.max = parseInt(e.target.value||0,10) || 1; gauge.style.setProperty('--pct', gaugePct(obj)+'%'); } });
  row.appendChild(atualInput);
  row.appendChild(el('span', { class:'gauge-label' }, ['/']));
  row.appendChild(maxInput);
  wrap.appendChild(row);
  wrap.appendChild(el('div', { style:'margin-top:8px;' }, [gauge]));
  return wrap;
}

function blocoAtributo(f, attr, ai){
  attr.pericias = attr.pericias || []; // idem: array vazio some no Firebase
  const card = el('div', { class:'attr-card' });
  card.appendChild(el('div', { class:'attr-card-head' }, [
    el('input', { type:'text', value: attr.nome, style:'font-family:var(--font-mono);text-transform:uppercase;font-size:.78rem;letter-spacing:.1em;background:transparent;border:none;color:var(--brass-bright);padding:0;',
      oninput: e => attr.nome = e.target.value }),
    el('input', { type:'number', class:'attr-mod num-mono', value: attr.mod, oninput: e => attr.mod = parseInt(e.target.value||0,10) }),
  ]));
  card.appendChild(el('div', { class:'skill-row', style:'color:var(--ink-mute);font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;' }, [
    el('span', {}, ['Perícia']), el('span', {}, ['Base']), el('span', {}, ['Bônus']), el('span', {}, ['Total']), el('span', {}, [''])
  ]));
  attr.pericias.forEach((p, pi) => {
    const total = (parseInt(p.base||0,10) + parseInt(p.bonus||0,10));
    const totalSpan = el('span', { class:'skill-total' }, [String(total)]);
    card.appendChild(el('div', { class:'skill-row' }, [
      el('input', { type:'text', value:p.nome, oninput: e => p.nome = e.target.value }),
      el('input', { type:'number', value:p.base, oninput: e => { p.base = parseInt(e.target.value||0,10); totalSpan.textContent = p.base + parseInt(p.bonus||0,10); } }),
      el('input', { type:'number', value:p.bonus, oninput: e => { p.bonus = parseInt(e.target.value||0,10); totalSpan.textContent = parseInt(p.base||0,10) + p.bonus; } }),
      totalSpan,
      el('button', { class:'btn-sm btn-ghost', onclick: () => { attr.pericias.splice(pi,1); scheduleSave(personagensStore); renderApp(); } }, ['✕'])
    ]));
  });
  card.appendChild(el('button', { class:'btn-sm', style:'margin-top:6px;', onclick: () => { attr.pericias.push({ nome:'Nova perícia', base:0, bonus:0 }); scheduleSave(personagensStore); renderApp(); } }, ['+ Perícia']));
  card.appendChild(el('button', { class:'btn-sm btn-ghost', style:'margin-top:6px;margin-left:6px;', onclick: () => { f.atributos.splice(ai,1); scheduleSave(personagensStore); renderApp(); } }, ['Remover atributo']));
  return card;
}

function blocoLista({ titulo, itens, addLabel, onAdd, renderItem }){
  itens = itens || []; // o Firebase remove campos que são array vazio, então isso pode vir undefined
  const wrap = el('div', { class:'panel' });
  wrap.appendChild(el('div', { class:'panel-head' }, [
    el('h2', {}, [titulo]),
    el('button', { class:'btn-sm', onclick: onAdd }, [addLabel])
  ]));
  if(itens.length === 0) wrap.appendChild(el('div', { class:'empty-state' }, [`Nada em "${titulo}" ainda.`]));
  else itens.forEach((item,i) => wrap.appendChild(renderItem(item,i)));
  return wrap;
}

boot();
