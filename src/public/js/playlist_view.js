(function(){
  const grid = document.querySelector('#plv-grid');
  if (!grid) return;
  const titleEl = document.querySelector('#plv-title');
  const emptyEl = document.querySelector('#plv-empty');
  const errorEl = document.querySelector('#plv-error');

  const idMatch = window.location.pathname.match(/\/playlists\/(\d+)/);
  const playlistId = idMatch ? Number(idMatch[1]) : null;
  if (!playlistId) { if (errorEl) errorEl.style.display='block'; return; }

  async function fetchMeta(){ try { const r = await fetch(`/api/playlists/${playlistId}`); if (r.status===401) return { __unauth: true }; if(!r.ok) throw 0; const j = await r.json(); return j?.data?.playlist || null; } catch { return null; } }
  async function fetchItems(){ try { const r = await fetch(`/api/playlists/${playlistId}/items`); if (r.status===401) return { __unauth: true }; if(!r.ok) throw 0; const j = await r.json(); return j?.data?.items || []; } catch { return null; } }
  async function removeItem(mediaKey){ const r = await fetch(`/api/playlists/${playlistId}/items?mediaKey=${encodeURIComponent(mediaKey)}`, { method:'DELETE' }); return r.ok; }
  async function reorder(items){ const r = await fetch(`/api/playlists/${playlistId}/items/reorder`, { method:'PATCH', headers:{ 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }); return r.ok; }

  function render(items){
    grid.innerHTML = '';
    if (!items) { if (errorEl) { errorEl.style.display='block'; errorEl.textContent='Failed to load playlist.'; } return; }
    if (items.__unauth) { if (emptyEl) { emptyEl.style.display='block'; emptyEl.innerHTML = 'Please sign in to view this playlist. <a class="btn" href="/auth/login" style="margin-left:8px;">Sign in</a>'; } return; }
    if (!items.length){ if (emptyEl) { emptyEl.style.display='block'; emptyEl.textContent = 'This playlist is empty.'; } return; }
    if (emptyEl) emptyEl.style.display='none';
    for (const it of items){
      const card = document.createElement('div');
      card.className = 'video-item';
      card.draggable = true;
      card.dataset.itemId = String(it.id);

      const preview = document.createElement('div');
      preview.className = 'video-thumbnail media-contain';
      if (it.thumbnail){
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = it.thumbnail;
        img.alt = it.name || 'Media';
        preview.appendChild(img);
      }

      const title = document.createElement('div');
      title.className = 'category-title';
      title.textContent = it.name || 'Media';

      const actions = document.createElement('div');
      actions.className = 'item-actions';
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.justifyContent = 'center';
      actions.style.margin = '8px 0 4px';

      const dl = document.createElement('a');
      dl.className = 'btn';
      dl.href = it.url;
      dl.download = '';
      dl.setAttribute('aria-label', 'Download');
      dl.innerHTML = '<i class="fas fa-download"></i> Download';

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'btn';
      rm.innerHTML = '<i class="fas fa-trash"></i> Remove';
      rm.addEventListener('click', async ()=>{
        if (!(await removeItem(it.media_key))) return;
        // Remove from DOM and refresh order indices
        try { card.remove(); } catch {}
      });

      actions.appendChild(dl);
      actions.appendChild(rm);
      card.appendChild(preview);
      card.appendChild(title);
      card.appendChild(actions);
      grid.appendChild(card);
    }
    // Drag & drop reorder: simple vertical list ordering
    let dragEl = null;
    grid.addEventListener('dragstart', (e)=>{
      const t = e.target.closest('.video-item');
      if (!t) return; dragEl = t; t.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragend', async ()=>{
      if (dragEl) dragEl.classList.remove('dragging');
      dragEl = null;
      // Persist order
      const ids = Array.from(grid.querySelectorAll('.video-item')).map(el=>Number(el.dataset.itemId)).filter(Number.isFinite);
      try { await reorder(ids); } catch {}
    });
    grid.addEventListener('dragover', (e)=>{
      e.preventDefault();
      const t = e.target.closest('.video-item');
      if (!t || !dragEl || t === dragEl) return;
      const rect = t.getBoundingClientRect();
      const after = (e.clientY - rect.top) > (rect.height/2);
      if (after) t.after(dragEl); else t.before(dragEl);
    });
  }

  (async ()=>{
  const meta = await fetchMeta();
  if (meta?.__unauth) { render({ __unauth: true }); return; }
  if (meta && titleEl) titleEl.textContent = meta.name || 'Playlist';
  const items = await fetchItems();
  render(items || []);
  })();
})();
