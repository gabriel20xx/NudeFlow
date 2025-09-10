(function(){
  const grid = document.querySelector('#playlistsGrid');
  if (!grid) return;

  const emptyEl = document.querySelector('#pl-empty');
  const errorEl = document.querySelector('#pl-error');
  const guardEl = document.querySelector('#pl-auth-guard');
  const contentEl = document.querySelector('#pl-content');
  let lastAuthIssue = false;

  async function fetchPlaylistsSummary(){
    try {
      const r = await fetch('/api/playlists/summary');
      if (r.status === 401) {
        lastAuthIssue = true;
        if (guardEl) guardEl.style.display = 'flex';
        if (contentEl) contentEl.style.display = 'none';
        return [];
      }
      if(!r.ok) throw 0; const j = await r.json(); return j?.data?.playlists || [];
    } catch { return null; }
  }
  async function createPlaylist(name){
    const r = await fetch('/api/playlists', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name }) });
    if (!r.ok) throw 0; return (await r.json())?.data?.playlist || null;
  }

  function renderGrid(list){
    grid.innerHTML = '';
  if (!list) { if (errorEl) { errorEl.style.display='block'; errorEl.textContent = 'Failed to load playlists. Please try again.'; } if (emptyEl) emptyEl.style.display='none'; return; }
    if (!list.length){
      if (emptyEl) {
    emptyEl.style.display='block';
    emptyEl.innerHTML = 'No playlists yet. Use the form above to create one.';
      }
      if (errorEl) errorEl.style.display='none';
      return;
    }
  if (emptyEl) emptyEl.style.display='none'; if (errorEl) errorEl.style.display='none';
  if (guardEl) guardEl.style.display = 'none'; if (contentEl) contentEl.style.display = '';
    for (const p of list){
      const item = document.createElement('div');
      item.className = 'video-item';
      item.setAttribute('role','group');
      item.setAttribute('aria-label', p.name);

      const preview = document.createElement('div');
      preview.className = 'video-thumbnail media-contain';
      if (p.preview){
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = p.preview;
        img.alt = p.name;
        preview.appendChild(img);
      } else {
        const ph = document.createElement('div'); ph.className='placeholder'; ph.textContent=''; preview.appendChild(ph);
      }

  const title = document.createElement('div');
  title.className = 'category-title';
  title.textContent = p.name + (typeof p.item_count === 'number' ? ` (${p.item_count})` : '');

      const actions = document.createElement('div');
      actions.className = 'item-actions';
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.justifyContent = 'center';
      actions.style.margin = '8px 0 4px';

  const openBtn = document.createElement('button');
  openBtn.className = 'btn';
      openBtn.type = 'button';
      openBtn.innerHTML = '<i class="fas fa-folder-open"></i> Open';
      openBtn.addEventListener('click', ()=>{ window.location.href = `/playlists/${encodeURIComponent(p.id)}`; });

  const playBtn = document.createElement('button');
  playBtn.className = 'btn';
      playBtn.type = 'button';
      playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
      playBtn.addEventListener('click', ()=>{
        // Navigate to homepage but instruct it to load from this playlist
        sessionStorage.setItem('nf_activePlaylistId', String(p.id));
        sessionStorage.setItem('nf_activePlaylistName', String(p.name));
        window.location.href = '/';
      });

      actions.appendChild(openBtn);
      actions.appendChild(playBtn);

      item.appendChild(preview);
      item.appendChild(title);
      item.appendChild(actions);
      grid.appendChild(item);
    }
  }

  async function refresh(){
    const list = await fetchPlaylistsSummary();
    // Disable create when auth guard visible
    try {
      const createInput = document.querySelector('#pl-name');
      const createBtn = document.querySelector('#pl-create-btn');
      const isUnauth = guardEl && getComputedStyle(guardEl).display !== 'none';
      if (createInput) createInput.disabled = !!isUnauth;
      if (createBtn) createBtn.disabled = !!isUnauth;
    } catch {}
    renderGrid(list || []);
  }

  const input = document.querySelector('#pl-name');
  const btn = document.querySelector('#pl-create-btn');
  if (btn) btn.addEventListener('click', async ()=>{
    if (guardEl && getComputedStyle(guardEl).display !== 'none') return;
    const name = String(input.value||'').trim(); if(!name) { input.focus(); return; }
    try { await createPlaylist(name); input.value=''; await refresh(); } catch { if (errorEl) errorEl.style.display='block'; }
  });

  refresh();
})();
