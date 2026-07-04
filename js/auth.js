/* =========================================================
   Sessão local — "quem está usando este navegador"
   ---------------------------------------------------------
   A sessão (jogador logado ou mestre) fica só neste aparelho
   (localStorage), não é sincronizada — cada pessoa loga no seu.
   As senhas em si (dos personagens e do mestre) é que ficam no
   armazenamento compartilhado, pra funcionar em qualquer aparelho.
========================================================= */

const SESSAO_KEY = 'arton_sessao_v1';

function getSessao(){
  try{ return JSON.parse(localStorage.getItem(SESSAO_KEY)); }
  catch(e){ return null; }
}
function setSessao(s){ localStorage.setItem(SESSAO_KEY, JSON.stringify(s)); }
function limparSessao(){ localStorage.removeItem(SESSAO_KEY); }

function ehMestre(){
  const s = getSessao();
  return !!(s && s.papel === 'mestre');
}
function personagemLogadoId(){
  const s = getSessao();
  return (s && s.papel === 'jogador') ? s.personagemId : null;
}

/* ---------------- badge no topo (logado como / sair) ---------------- */

function renderSessaoBadge(container){
  container.innerHTML = '';
  const s = getSessao();
  if(!s){
    container.appendChild(el('span', { class:'muted small' }, ['não logado']));
    return;
  }
  let label;
  if(s.papel === 'mestre'){
    label = '🗺️ Mestre';
  } else {
    const r = window.ARTON_ROSTER.find(r => r.id === s.personagemId);
    label = r ? `${r.nome}` : 'jogador';
  }
  container.appendChild(el('span', { class:'small', style:'color:var(--brass-bright);font-weight:600;margin-right:10px;' }, [label]));
  container.appendChild(el('button', { class:'btn-sm btn-ghost', onclick: () => { limparSessao(); location.reload(); } }, ['Trocar']));
}

/* ---------------- portão de login (grade de personagens) ---------------- */

// Renders the roster + Mestre card grid into `container`. Needs the
// `personagens` cloud store already loaded. Calls onLoggedIn() once a
// session is established (either just now or already existing).
function renderLoginGate(container, personagensStore, onLoggedIn){
  const sessaoExistente = getSessao();
  if(sessaoExistente){ onLoggedIn(); return; }

  container.innerHTML = '';
  container.appendChild(el('div', { style:'padding: 8px 0 28px;' }, [
    el('span', { class:'eyebrow' }, ['Identifique-se']),
    el('h1', {}, ['Quem está jogando?']),
    el('p', { class:'lede small' }, ['Escolha seu personagem (ou entre como mestre). A senha fica salva neste aparelho depois que você entrar.'])
  ]));

  const grid = el('div', { class:'grid grid-4' });
  window.ARTON_ROSTER.forEach(r => {
    grid.appendChild(loginCard({
      nome: r.nome, simbolo: r.simbolo, icon: r.icon, cor: r.cor,
      temSenha: () => !!(personagensStore.data.fichas.find(f => f.id === r.id) || {}).senha,
      onSubmit: (senha, showErro) => {
        const ficha = personagensStore.data.fichas.find(f => f.id === r.id);
        if(!ficha.senha){
          if(!senha){ showErro('Digite uma senha pra criar o acesso do seu personagem.'); return; }
          ficha.senha = senha;
          scheduleSave(personagensStore);
          setSessao({ papel:'jogador', personagemId: r.id });
          onLoggedIn();
        } else if(senha === ficha.senha){
          setSessao({ papel:'jogador', personagemId: r.id });
          onLoggedIn();
        } else {
          showErro('Senha incorreta.');
        }
      }
    }));
  });
  grid.appendChild(loginCard({
    nome: 'Mestre', simbolo: 'Vê tudo', icon: 'mestre', cor: '#d6ab5e',
    temSenha: () => !!personagensStore.data.mestreSenha,
    onSubmit: (senha, showErro) => {
      if(!personagensStore.data.mestreSenha){
        if(!senha){ showErro('Digite uma senha pra criar o acesso do mestre.'); return; }
        personagensStore.data.mestreSenha = senha;
        scheduleSave(personagensStore);
        setSessao({ papel:'mestre' });
        onLoggedIn();
      } else if(senha === personagensStore.data.mestreSenha){
        setSessao({ papel:'mestre' });
        onLoggedIn();
      } else {
        showErro('Senha incorreta.');
      }
    }
  }));

  container.appendChild(grid);

  if(!personagensStore.configured){
    container.appendChild(el('div', { class:'panel', style:'margin-top:20px;border-color:var(--blood);' }, [
      el('h3', { style:'color:var(--blood-bright);' }, ['Sincronização não configurada']),
      el('p', { class:'lede small' }, [
        'Este site ainda não está ligado ao armazenamento compartilhado, então os dados (incluindo senhas) ficam só neste navegador. Veja ',
        el('a', { href:'setup.html' }, ['setup.html']),
        ' pra ativar a sincronização entre os aparelhos do grupo.'
      ])
    ]));
  }
}

function loginCard({ nome, simbolo, icon, cor, temSenha, onSubmit }){
  const card = el('div', { class:'ficha-card', style:`border-color:${cor}55;` });
  const head = el('div', { style:'display:flex;align-items:center;gap:12px;' }, [
    el('div', { style:`width:40px;height:40px;color:${cor};flex:none;`, html: iconSvg(icon) }),
    el('div', {}, [
      el('h3', { style:'margin:0;' }, [nome]),
      el('div', { class:'meta' }, [simbolo])
    ])
  ]);
  card.appendChild(head);

  const formWrap = el('div', { style:'margin-top:10px;' });
  const erro = el('div', { class:'small', style:'color:var(--blood-bright);min-height:1.2em;margin-top:4px;' });
  const senhaInput = el('input', { type:'password', placeholder: 'senha' });
  senhaInput.addEventListener('keydown', e => { if(e.key === 'Enter') submeter(); });
  const btn = el('button', { class:'btn-sm btn-brass', onclick: submeter }, ['Entrar']);

  function submeter(){
    erro.textContent = '';
    onSubmit(senhaInput.value, (msg) => { erro.textContent = msg; });
  }

  formWrap.appendChild(el('div', { class:'field-inline' }, [ senhaInput, btn ]));
  formWrap.appendChild(erro);
  card.appendChild(formWrap);

  // hint if this is the character's very first login
  card.appendChild(el('div', { class:'muted small', style:'margin-top:2px;' }, [
    temSenha() ? 'Protegido por senha.' : 'Sem senha ainda — a primeira que você digitar vira a senha.'
  ]));

  return card;
}
