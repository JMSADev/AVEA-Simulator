/* =========================================================
   Configuração — elenco fixo, sincronização (Firebase), ícones
   ---------------------------------------------------------
   Pra sincronizar as fichas entre os aparelhos de todo mundo, este
   site usa o Firebase Realtime Database. As chaves abaixo já são
   as do projeto do grupo — não precisa mexer aqui de novo, a menos
   que troquem de projeto no Firebase.
========================================================= */

window.ARTON_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA79SB58pYS3VIMmdTJj_vZrlEW1c2Nh1w",
  authDomain: "avea-b6cdc.firebaseapp.com",
  databaseURL: "https://avea-b6cdc-default-rtdb.firebaseio.com",
  projectId: "avea-b6cdc",
  storageBucket: "avea-b6cdc.firebasestorage.app",
  messagingSenderId: "603116504028",
  appId: "1:603116504028:web:293561a82954b45feec519",
};

// Inicializa o Firebase uma única vez (os scripts firebase-app-compat.js
// e firebase-database-compat.js precisam ser carregados ANTES deste arquivo
// — veja o <head>/<body> de combate.html e ficha.html).
if(!window.ARTON_FIREBASE_APP){
  window.ARTON_FIREBASE_APP = firebase.initializeApp(window.ARTON_FIREBASE_CONFIG);
  window.ARTON_FIREBASE_DB  = firebase.database();
}

// "Caminhos" dentro do Realtime Database — equivalentes aos antigos IDs
// de blob do jsonblob.com. Não precisam ser secretos nem trocados.
window.ARTON_SYNC_PERSONAGENS_URL = 'personagens';
window.ARTON_SYNC_COMBATE_URL     = 'combate';

// Elenco fixo dos jogadores. Cada um tem sua própria senha (definida por
// eles mesmos no primeiro acesso) guardada dentro da ficha na nuvem.
window.ARTON_ROSTER = [
  { id: 'sivirino', nome: 'Sivirino',     simbolo: 'Atirador',    icon: 'revolver', cor: '#c0392b' },
  { id: 'raimundo', nome: 'Raimundo',     simbolo: 'Inventor',    icon: 'gear',     cor: '#a8442e' },
  { id: 'beatriz',  nome: 'Beatriz',      simbolo: 'Luta',        icon: 'fist',     cor: '#d1495b' },
  { id: 'edwinravi',nome: 'Edwin/Ravi',   simbolo: 'Magia',       icon: 'spark',    cor: '#d4b83f' },
  { id: 'leshan',   nome: "Le'Shan",      simbolo: 'Fogo',        icon: 'flame',    cor: '#e0722f' },
  { id: 'kaska',    nome: 'Kaska',        simbolo: 'Cozinheira',  icon: 'cook',     cor: '#1b3a5c' },
];

window.ARTON_ICONS = {
  revolver: '<svg viewBox="0 0 48 32" fill="currentColor"><path d="M4 20 L4 13 L19 13 L19 7 L35 7 L35 13 L45 13 L45 18 L35 18 L35 22 L11 22 L11 26 L4 26 Z"/><circle cx="9.5" cy="23" r="1.3" fill="var(--bg-inset)"/></svg>',
  gear: '<svg viewBox="0 0 48 48" fill="currentColor"><g><rect x="21" y="2" width="6" height="10" rx="1"/><rect x="21" y="36" width="6" height="10" rx="1"/><rect x="2" y="21" width="10" height="6" rx="1"/><rect x="36" y="21" width="10" height="6" rx="1"/><rect x="21" y="2" width="6" height="10" rx="1" transform="rotate(45 24 24)"/><rect x="21" y="36" width="6" height="10" rx="1" transform="rotate(45 24 24)"/><rect x="2" y="21" width="10" height="6" rx="1" transform="rotate(45 24 24)"/><rect x="36" y="21" width="10" height="6" rx="1" transform="rotate(45 24 24)"/><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="4" fill="var(--bg-inset)"/></g></svg>',
  fist: '<svg viewBox="0 0 48 48" fill="currentColor"><rect x="10" y="18" width="28" height="18" rx="7"/><rect x="14" y="9" width="6" height="15" rx="3"/><rect x="21" y="7" width="6" height="17" rx="3"/><rect x="28" y="9" width="6" height="15" rx="3"/><rect x="5" y="22" width="9" height="12" rx="4"/></svg>',
  spark: '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M24 2 L28 20 L46 24 L28 28 L24 46 L20 28 L2 24 L20 20 Z"/></svg>',
  flame: '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M23 2 C13 13 9 20 9 27 A15 15 0 0 0 39 27 C39 21 35 17 33 13 C33 19 29 21 27 19 C30 13 27 6 23 2 Z"/></svg>',
  cook: '<svg viewBox="0 0 48 48" fill="currentColor"><rect x="8" y="21" width="32" height="17" rx="3"/><rect x="4" y="17" width="40" height="6" rx="3"/><rect x="21" y="4" width="6" height="14" rx="2"/><circle cx="24" cy="4" r="4"/></svg>',
  mestre: '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M24 3 L30 15 L44 11 L38 30 L10 30 L4 11 L18 15 Z"/><rect x="10" y="33" width="28" height="6" rx="2"/></svg>',
  enemy: '<svg viewBox="0 0 48 48" fill="currentColor"><path d="M24 4 C34 4 42 13 42 24 C42 32 36 40 24 44 C12 40 6 32 6 24 C6 13 14 4 24 4 Z" opacity=".18"/><circle cx="16" cy="22" r="3.4"/><circle cx="32" cy="22" r="3.4"/><path d="M14 32 Q24 26 34 32" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
};

function iconSvg(key){
  return window.ARTON_ICONS[key] || '';
}

/* ---------- ficha padrão (compartilhada por ficha.js e combate.js) ---------- */

window.ARTON_DEFAULT_ATRIBUTOS = [
  { nome: 'Agilidade',    mod: 0, pericias: ['Destreza','Iniciativa','Furtividade','Esquiva','Acrobacia','Atirar'] },
  { nome: 'Força',        mod: 0, pericias: ['Luta','Força','Contra-Ataque','Bloquear'] },
  { nome: 'Carisma',      mod: 0, pericias: ['Charme','Diplomacia','Intimidação','Lábia'] },
  { nome: 'Inteligência', mod: 0, pericias: ['Conhecimento','Percepção','Intuição'] },
  { nome: 'Sabedoria',    mod: 0, pericias: ['Misticismo','Cura'] },
  { nome: 'Constituição', mod: 0, pericias: ['Fortitude','Vontade'] },
];

function blankFichaFor(rosterEntry){
  return {
    id: rosterEntry.id,
    nome: rosterEntry.nome,
    senha: '',
    classe: '', raca: '', tendencia: '', level: 1, deslocamento: '',
    dinheiro: '', financas: '', ba: '',
    vida:     { atual: 10, max: 10 },
    sanidade: { atual: 10, max: 10 },
    energia:  { atual: 10, max: 10 },
    atributos: window.ARTON_DEFAULT_ATRIBUTOS.map(a => ({
      nome: a.nome, mod: a.mod,
      pericias: a.pericias.map(p => ({ nome: p, base: 0, bonus: 0 }))
    })),
    talentos: [],
    inventario: [],
    anotacoes: ''
  };
}

function defaultPersonagensData(){
  return {
    mestreSenha: '',
    fichas: window.ARTON_ROSTER.map(r => blankFichaFor(r)),
    inimigos: []
  };
}

// garante que toda entrada do elenco fixo exista nos dados carregados
// (ex: primeira vez que o blob é usado, ou se o elenco mudou em config.js)
function garantirFichasCompletas(store){
  window.ARTON_ROSTER.forEach(r => {
    if(!store.data.fichas.find(f => f.id === r.id)){
      store.data.fichas.push(blankFichaFor(r));
    }
  });
}
