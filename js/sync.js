/* =========================================================
   Sincronização com a nuvem (jsonblob.com) — com cache local
   ---------------------------------------------------------
   Cada "store" (personagens / combate) tem sua própria URL, sua
   própria chave de cache local e seu próprio dado-padrão.
========================================================= */

function isBlobConfigured(url){
  return typeof url === 'string' && url && !url.includes('COLOQUE_SEU_ID_AQUI');
}

function createSyncStore({ name, url, defaultData }){
  const cacheKey = `arton_cache_${name}`;
  const store = {
    data: null,
    loaded: false,
    configured: isBlobConfigured(url),
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
        const res = await fetch(url, { cache: 'no-store' });
        if(!res.ok) throw new Error('status ' + res.status);
        const remote = await res.json();
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
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(store.data)
        });
        if(!res.ok) throw new Error('status ' + res.status);
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
   actually PUTs to the cloud ~700ms after the last call. */
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
