// Home page tags overlay logic
(function(){
  const btn = document.getElementById('tagsOverlayBtn');
  const listEl = document.getElementById('tagsOverlayList');
  const closeBtn = document.getElementById('tagsOverlayClose');
  const overlay = document.getElementById('tagsOverlay');
  if(!btn || !listEl || !overlay) return;

  // Ensure basic accessible roles when JS loads (server may have provided already)
  if(!overlay.getAttribute('role')) overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');

  let controller; let firstLoad = true; let inflight = false;
  let cache = null; // { tags: [...], ts }
  const CACHE_TTL_MS = 60_000; // 1 minute simple client cache

  function log(type, msg, meta){
    try { if(window.clientLogger) window.clientLogger[type||'info']('[tagsOverlay]', msg, meta||{}); else console.info('[tagsOverlay]', msg, meta||{}); } catch(_e){}
  }

  function ensureController(){
    if(!controller && window.NCOverlay){
      controller = window.NCOverlay.createOverlayController({ overlayId: 'tagsOverlay', liveId: 'tagsOverlayLive', showDelay:120, focusSelector:'#tagsOverlayClose', escToClose:true, trapFocus:true });
    }
    return controller;
  }

  function showOverlay(){
    const c = ensureController();
    if(c){ c.showSoon(); } else {
      // Fallback manual show if controller not ready
      overlay.hidden = false; overlay.setAttribute('aria-hidden','false'); overlay.classList.add('active');
    }
  }

  function renderTags(tagObjs){
    const c = ensureController();
    if(!Array.isArray(tagObjs) || !tagObjs.length){
      listEl.innerHTML = '<div class="empty">No tags yet</div>';
      if(c) c.announce('No tags yet');
      return;
    }
    listEl.innerHTML='';
    const frag = document.createDocumentFragment();
    tagObjs.forEach(obj => {
      const tag = obj.tag || obj;
      const b = document.createElement('button');
      b.type='button';
      b.className='tag-pill';
      b.setAttribute('aria-label', 'Filter by tag ' + tag);
      b.textContent = tag + (obj.uses!=null? ` (${obj.uses})`: '');
      b.addEventListener('click', ()=>{ window.location.href='/?tag='+encodeURIComponent(tag); });
      frag.appendChild(b);
    });
    listEl.appendChild(frag);
    if(c) c.announce(tagObjs.length + ' tags loaded');
  }

  function cacheValid(){
    return cache && (Date.now() - cache.ts) < CACHE_TTL_MS && Array.isArray(cache.tags);
  }

  async function fetchTagsWithRetry(maxAttempts=2){
    let attempt = 0; let lastErr;
    while(attempt < maxAttempts){
      attempt++;
      try {
        const resp = await fetch('/api/tags/suggestions?limit=60');
        if(!resp.ok) throw new Error('bad_status_'+resp.status);
        const data = await resp.json();
        return (data.tags||[]).map(t=> t.tag? t : { tag: t.tag || t, uses: t.uses });
      } catch(e){
        lastErr = e; log('error','fetch attempt failed',{ attempt, error: e && e.message });
        if(attempt < maxAttempts) await new Promise(r=> setTimeout(r, 150 * attempt));
      }
    }
    throw lastErr || new Error('unknown_fetch_error');
  }

  async function loadTags(force){
    if(inflight) { log('info','skip load: inflight'); return; }
    if(!force && !firstLoad && cacheValid()){ renderTags(cache.tags); return; }
    const c = ensureController();
    if(!c){
      listEl.innerHTML = '<div class="error" role="alert">Overlay controller missing</div>';
      return;
    }
    inflight = true;
    listEl.innerHTML = '<div class="loading">Loading tags…</div>';
    try {
      if(cacheValid() && !force){
        renderTags(cache.tags); return;
      }
      const tagObjs = await fetchTagsWithRetry();
      cache = { tags: tagObjs, ts: Date.now() };
      renderTags(tagObjs);
    } catch(e){
      listEl.innerHTML = '<div class="error" role="alert">Failed to load <button class="btn-small retry" type="button">Retry</button></div>';
      const r = listEl.querySelector('.retry');
      if(r) r.addEventListener('click', ()=>loadTags(true));
      const c2 = ensureController();
      if(c2) c2.announceError('Failed to load tags');
    } finally {
      inflight = false; firstLoad = false;
    }
  }

  btn.addEventListener('click', ()=>{ showOverlay(); loadTags(false); });
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ if(controller) controller.hide(); else { overlay.setAttribute('aria-hidden','true'); overlay.classList.remove('active'); overlay.hidden = true; } });
})();
