// Home page tags overlay logic
(function(){
  const btn = document.getElementById('tagsOverlayBtn');
  const listEl = document.getElementById('tagsOverlayList');
  const closeBtn = document.getElementById('tagsOverlayClose');
  if(!btn || !listEl) return;
  let controller;
  function ensureController(){
    if(!controller && window.NCOverlay){
      controller = window.NCOverlay.createOverlayController({ overlayId: 'tagsOverlay', liveId: 'tagsOverlayLive', showDelay:150 });
    }
    return controller;
  }
  async function loadTags(){
    const c = ensureController();
    if(!c) return;
    await c.runWithOverlay(async ()=>{
      listEl.innerHTML = '<div class="loading">Loading tags…</div>';
      try {
        const resp = await fetch('/api/tags/suggestions?limit=60');
        if(!resp.ok) throw new Error('bad_status');
        const data = await resp.json();
        const tags = (data.tags||[]).map(t=> t.tag || t.tag || t);
        if(!tags.length){ listEl.innerHTML = '<div class="empty">No tags yet</div>'; return; }
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
        if(r) r.addEventListener('click', loadTags);
        c.announceError('Failed to load tags');
      }
    });
  }
  btn.addEventListener('click', ()=>{ ensureController(); loadTags(); });
  if(closeBtn){ closeBtn.addEventListener('click', ()=> controller && controller.hide()); }
})();
