// Home page tag interactions (add + vote)
// Assumptions: Media feed dynamically injects elements with [data-media-key]
// We infer the currently "visible" media as the first such element for now.
// TODO: If a dedicated player/selection concept is later added, wire an event to update currentMediaKey.
(function(){
  const state = {
    currentMediaKey: null,
    lastRenderedKey: null,
    loading: false,
  };
  const tagListEl = document.getElementById('media-tags');
  const inputEl = document.getElementById('new-tag-input');
  const addBtn = document.getElementById('add-tag-btn');
  const statusEl = document.getElementById('tag-status');

  function announce(msg){ if(statusEl){ statusEl.textContent = msg; } }

  function inferMediaKey(){
    // Strategy: first element with data-media-key in feed
    const first = document.querySelector('#home-container [data-media-key]');
    if(first){
      const k = first.getAttribute('data-media-key');
      if(k && k !== state.currentMediaKey){
        state.currentMediaKey = k; refresh();
      }
    }
  }

  // Observe feed mutations to re-infer key
  const feed = document.getElementById('home-container');
  if(feed){
    const mo = new MutationObserver(()=>{ inferMediaKey(); });
    mo.observe(feed, { childList:true, subtree:true });
  }

  async function api(path, opts){
    opts = opts || {}; opts.headers = Object.assign({ 'Content-Type':'application/json' }, opts.headers||{});
    let res, json={};
    try {
      res = await fetch(path, opts);
      json = await res.json().catch(()=>({}));
    } catch (e) {
      return { status:0, json:{ ok:false, error:'network', detail:String(e) } };
    }
    return { status: res.status, json };
  }

  function clearList(){ if(tagListEl) tagListEl.innerHTML=''; }
  function renderEmpty(){ clearList(); const li=document.createElement('li'); li.className='tag-empty'; li.textContent='No tags yet'; tagListEl.appendChild(li); }

  function renderTags(tags){
    clearList();
    if(!tags || !tags.length){ renderEmpty(); return; }
    tags.sort((a,b)=>b.score - a.score || a.tag.localeCompare(b.tag));
    tags.forEach(t=>{
      const li = document.createElement('li');
      li.className='tag-item';
      const btnUp = document.createElement('button'); btnUp.type='button'; btnUp.className='vote-up'; btnUp.setAttribute('aria-label', 'Upvote tag ' + t.tag); btnUp.textContent='▲';
      const btnDown = document.createElement('button'); btnDown.type='button'; btnDown.className='vote-down'; btnDown.setAttribute('aria-label', 'Downvote tag ' + t.tag); btnDown.textContent='▼';
      if(t.myVote===1) btnUp.classList.add('active');
      if(t.myVote===-1) btnDown.classList.add('active');
      const score = document.createElement('span'); score.className='tag-score'; score.textContent = t.score;
      const label = document.createElement('span'); label.className='tag-label'; label.textContent = t.tag;
      btnUp.addEventListener('click', ()=> vote(t.tag, t.myVote===1?0:1));
      btnDown.addEventListener('click', ()=> vote(t.tag, t.myVote===-1?0:-1));
      li.append(btnUp, score, btnDown, label);
      tagListEl.appendChild(li);
    });
  }

  async function refresh(){
    if(!state.currentMediaKey || state.loading) return;
    state.loading = true;
    const { json } = await api(`/api/media/${encodeURIComponent(state.currentMediaKey)}/tags`);
    state.loading = false;
    if(json && Array.isArray(json.tags)){
      state.lastRenderedKey = state.currentMediaKey;
      renderTags(json.tags);
    } else if(state.currentMediaKey !== state.lastRenderedKey){
      renderEmpty();
    }
  }

  async function addTag(){
    inferMediaKey();
    if(!state.currentMediaKey) { announce('No media selected'); return; }
    const raw = (inputEl.value||'').trim(); if(!raw) return;
    if(raw.length>40){ announce('Tag too long'); return; }
    announce('Adding tag...');
    const { status, json } = await api(`/api/media/${encodeURIComponent(state.currentMediaKey)}/tags`, { method:'POST', body: JSON.stringify({ tag: raw }) });
    if(status===200 && json && Array.isArray(json.tags)){
      inputEl.value=''; renderTags(json.tags); announce('Tag added');
    } else {
      announce(json.error || 'Failed to add tag');
    }
  }

  async function vote(tag, direction){
    if(!state.currentMediaKey) return;
    announce('Submitting vote...');
    const { json } = await api(`/api/media/${encodeURIComponent(state.currentMediaKey)}/tags/${encodeURIComponent(tag)}/vote`, { method:'POST', body: JSON.stringify({ direction }) });
    if(json && Array.isArray(json.tags)){
      renderTags(json.tags); announce('Vote applied');
    } else {
      announce('Vote failed');
    }
  }

  // Wire events
  if(addBtn) addBtn.addEventListener('click', addTag);
  if(inputEl) inputEl.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addTag(); }});

  // Initial inference + refresh (in case feed already populated)
  inferMediaKey();
  refresh();

  // Expose minimal API for future enhancements
  window.NCHomeTags = { refresh, addTag, vote, inferMediaKey };
})();
