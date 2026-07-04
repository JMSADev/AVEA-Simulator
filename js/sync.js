/* =========================================================
   Sincronização com a nuvem (Firebase Realtime Database) — com cache local
   ---------------------------------------------------------
   Cada "store" (personagens / combate) tem seu próprio caminho dentro
   do Realtime Database, sua própria chave de cache local e seu
   próprio dado-padrão. A interface (load/save/scheduleSave) é a mesma
   de antes — só a forma de buscar/gravar na nuvem mudou (era jsonblob
   via fetch, agora é Firebase), então ficha.js e combate.js não
   precisaram mudar nada.
========================================================= */

function isFirebaseConfigured(){
  return !!(
    window.ARTON_FIREBASE_DB &&
    window.ARTON_FIREBASE_CONFIG &&
    window.ARTON_FIREBASE_CONFIG.apiKey &&
    window.ARTON_FIREBASE_CONFIG.databaseURL
  );
}

function createSyncStore({ name, url, defaultData }){
  const cacheKey = `arton_cache_${name}`;
  const path = url; // agora "url" é o caminho dentro do Realtime Database (ex: 'personagens')
  const store = {
    data: null,
    loaded: false,
    configured: isFirebaseConfigured(),
    saving: false,
    lastError: null,

    getCache(){
      try{
        const raw = localStorage.getItem(cacheKey);
        return raw ? JSON.parse(raw) : null;
      }catch(e){ return null; }
    },
    setCache(data){
      try{ localStorage.setItem(cacheKey, JSON.stringify(data)); }catch(e){ /* ignore */ }
    },

    async load(){
      if(!store.configured){
        store.data = store.getCache() || defaultData();
        store.loaded = true;
        return store.data;
      }
      try{
        const snap = await window.ARTON_FIREBASE_DB.ref(path).once('value');
        const remote = snap.val();
        const merged = Object.assign(defaultData(), remote || {});
        store.data = merged;
        store.loaded = true;
        store.lastError = null;
        store.setCache(merged);
      }catch(e){
        store.lastError = e;
        console.error(`[${name}] falha ao buscar da nuvem, usando cache local:`, e);
        store.data = store.getCache() || defaultData();
        store.loaded = true;
      }
      return store.data;
    },

    async save(){
      store.setCache(store.data);
      if(!store.configured) return true;
      store.saving = true;
      try{
        await window.ARTON_FIREBASE_DB.ref(path).set(store.data);
        store.lastError = null;
        return true;
      }catch(e){
        store.lastError = e;
        console.error(`[${name}] falha ao salvar na nuvem (dado ficou salvo só localmente):`, e);
        return false;
      }finally{
        store.saving = false;
      }
    },
  };
  return store;
}

/* debounced save helper: call scheduleSave(store) repeatedly, it only
   actually grava na nuvem ~700ms depois da última chamada. */
const _saveTimers = new Map();
function scheduleSave(store, onDone){
  store.setCache(store.data);
  clearTimeout(_saveTimers.get(store));
  _saveTimers.set(store, setTimeout(async () => {
    const ok = await store.save();
    if(onDone) onDone(ok);
  }, 700));
}

function isTypingInField(){
  const a = document.activeElement;
  if(!a) return false;
  return ['INPUT','TEXTAREA','SELECT'].includes(a.tagName);
}
