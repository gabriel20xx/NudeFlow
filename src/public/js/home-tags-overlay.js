// Home page tags overlay logic
(function(){
  const btn = document.getElementById('tagsOverlayBtn');
  const listEl = document.getElementById('tagsOverlayList');
  const closeBtn = document.getElementById('tagsOverlayClose');
  const overlay = document.getElementById('tagsOverlay');
  if(!btn || !listEl || !overlay) return;
  let controller; let firstLoad = true; let inflight = false;
  function ensureController(){
    if(!controller && window.NCOverlay){
        controller = window.NCOverlay.createOverlayController({ overlayId: 'tagsOverlay', liveId: 'tagsOverlayLive', showDelay:120, focusSelector:'#tagsOverlayClose' });
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
  async function loadTags(force){
    if(inflight) return; // avoid double fetch spam
    if(!force && !firstLoad) return; // only load once unless forced
    const c = ensureController();
    if(!c){
      listEl.innerHTML = '<div class="error" role="alert">Overlay controller missing</div>';
      return;
    }
    inflight = true;
    listEl.innerHTML = '<div class="loading">Loading tags…</div>';
    try {
      const resp = await fetch('/api/tags/suggestions?limit=60');
      if(!resp.ok) throw new Error('bad_status');
      const data = await resp.json();
      const tags = (data.tags||[]).map(t=> t.tag || t);
      if(!tags.length){ listEl.innerHTML = '<div class="empty">No tags yet</div>'; c.announce('No tags yet'); firstLoad=false; return; }
      listEl.innerHTML='';
      const frag = document.createDocumentFragment();
      tags.forEach(obj => {
        const tag = obj.tag || obj;
        const b = document.createElement('button');
        b.type='button';
        b.className='tag-pill';
        b.textContent = tag + (obj.uses!=null? ` (${obj.uses})`: '');
        b.addEventListener('click', ()=>{ window.location.href='/?tag='+encodeURIComponent(tag); });
        frag.appendChild(b);
      });
      listEl.appendChild(frag);
      c.announce(tags.length + ' tags loaded');
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
