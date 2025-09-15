// Media loading and display functionality
(function() {
const MODULE_NAME = 'LoadingModule';

// --- State ---
let toLoadImageIndex = 0;
let currentImageIndex = 0;
let isTransitioning = false;
let startY = 0;
let lastTouchY = 0;
let inactivityTimer = null;
let controlsRoot = null;
let autoAdvanceTimer = null;
let isAutoscrollOn = false;
let isFullscreen = false;
let lastKnownKey = null;
let currentAutoDurationMs = null;
const reportedViewKeys = new Set();
const SAVED_STORE_KEY = 'nf_savedMedia_v1';
const LIKES_STORE_KEY = 'nf_likeCounts_v1';
const LIKED_STATE_STORE_KEY = 'nf_likedByUser_v1';

const domainPattern = /^https?:\/\/[^/]+\/?$/;
const categoryPattern = /^https?:\/\/[^/]+\/(.+[^/])$/;
const mediaContainer = document.getElementById('home-container');
// Identify if we are on a feed-enabled page (homepage only for now).
// Rationale: This shared script was previously creating floating media overlay controls
// (likes, playlists, tags, mute, timer, etc.) on every page it was included on, leading to
// UI pollution (buttons appearing on /playlists, /profile, etc.) and incorrect media fetch
// attempts that triggered spurious "failed to load media" toasts. By scoping all control
// construction and media loading behind IS_FEED_PAGE we ensure:
//  1. Overlay buttons + mute only exist on the homepage feed.
//  2. Non-feed pages no longer invoke random media endpoints or emit load failure toasts.
//  3. Tests can assert absence of .floating-controls on secondary pages deterministically.
// Any future page that legitimately needs the feed behavior should include an element with
// id="home-container" (or this detection can be refactored to an explicit data attribute).
const IS_FEED_PAGE = !!mediaContainer;
const currentUrl = window.location.href;
// Fallback-configured preload count (avoid ReferenceError seen in logs)
const preLoadImageCount = (window.ApplicationConfiguration && window.ApplicationConfiguration.userInterfaceSettings && Number(window.ApplicationConfiguration.userInterfaceSettings.preLoadImageCount)) || 3;

function getUrl(){
  const FUNCTION_NAME = 'getUrl';
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Determining URL for content loading', { currentUrl });
  const baseUrl = ApplicationConfiguration?.baseServerUrl || window.location.origin;
  // Playlist feed
  try {
    const plId = sessionStorage.getItem('nf_activePlaylistId');
    const plName = sessionStorage.getItem('nf_activePlaylistName');
    if (plId) {
      const titleEl = document.querySelector('.app-category-title');
      if (titleEl) titleEl.textContent = plName || 'Playlist';
      const url = `${baseUrl}/api/playlists/${encodeURIComponent(plId)}/random`;
      ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Playlist feed detected', { playlistId: plId, url });
      return url;
    }
  } catch {}
  if (categoryPattern.test(currentUrl)) {
    const match = currentUrl.match(categoryPattern);
    if (match && match[1]) {
      let category = match[1];
      try {
        const raw = category.replace(/^\//,'');
        const decoded = decodeURIComponent(raw).replace(/\+/g,' ');
        const isAll = decoded.trim().toLowerCase()==='all';
        const titleEl = document.querySelector('.app-category-title');
        if (titleEl) titleEl.textContent = isAll ? 'All' : ApplicationUtilities.formatDisplayText(decoded);
      } catch {}
      const url = `${baseUrl}/api/media/random/${category.replace(/^\//,'')}`;
      ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Category page detected', { category, url });
      return url;
    }
  } else if (domainPattern.test(currentUrl)) {
    const url = `${baseUrl}/api/media/random/all`;
    ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Homepage detected', { url });
    return url;
  }
  const url = `${baseUrl}/api/media/random/all`;
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Fallback homepage URL', { url });
  return url;
}

function buildFloatingControls(){
  const FUNCTION_NAME = 'buildFloatingControls';
  try {
    if (!IS_FEED_PAGE) { // Do NOT create controls on non-feed pages
      ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Skipping build (not feed page)');
      return;
    }
    controlsRoot = document.querySelector('.floating-controls');
    if(!controlsRoot){
      controlsRoot = document.createElement('div');
      controlsRoot.className='floating-controls visible';
      document.body.appendChild(controlsRoot);
    }
    function ensureButton(selector, createFn, insertAfterSel){
      let el = controlsRoot.querySelector(selector);
      if(!el){
        el = createFn();
        if(insertAfterSel){
          const after = controlsRoot.querySelector(insertAfterSel);
          if(after && after.nextSibling) controlsRoot.insertBefore(el, after.nextSibling); else if(after) controlsRoot.appendChild(el); else controlsRoot.appendChild(el);
        } else controlsRoot.appendChild(el);
      }
      return el;
    }
    const likeWrap = controlsRoot.querySelector('.float-like') || (function(){
      const wrap=document.createElement('div'); wrap.className='float-like';
      const btn=document.createElement('button'); btn.type='button'; btn.className='float-btn float-btn--like'; btn.setAttribute('aria-label','Like this media'); btn.setAttribute('aria-pressed','false'); btn.innerHTML='<i class="fas fa-heart" aria-hidden="true"></i>';
      const badge=document.createElement('span'); badge.className='like-count-badge'; badge.textContent='0';
      wrap.append(btn,badge); controlsRoot.insertBefore(wrap, controlsRoot.firstChild); return wrap; })();
    const fsBtn = ensureButton('.float-btn--fs', ()=>{ const b=document.createElement('button'); b.type='button'; b.className='float-btn float-btn--fs'; b.setAttribute('aria-label','Toggle fullscreen'); b.innerHTML='<i class="fas fa-expand" aria-hidden="true"></i>'; return b; });
    const saveBtn = ensureButton('.float-btn--save', ()=>{ const b=document.createElement('button'); b.type='button'; b.className='float-btn float-btn--save'; b.setAttribute('aria-label','Add to playlist'); b.setAttribute('aria-pressed','false'); b.innerHTML='<i class="fas fa-list-ul" aria-hidden="true"></i>'; return b; }, '.float-btn--fs');
    const tagsBtn = ensureButton('#tagsOverlayBtn', ()=>{ const b=document.createElement('button'); b.id='tagsOverlayBtn'; b.type='button'; b.className='float-btn float-btn--tags'; b.setAttribute('aria-label','Browse tags'); b.setAttribute('aria-controls','tagsOverlay'); b.innerHTML='<i class="fas fa-tags" aria-hidden="true"></i>'; return b; }, '.float-btn--save');
    const autoBtn = ensureButton('.float-btn--auto', ()=>{ const b=document.createElement('button'); b.type='button'; b.className='float-btn float-btn--auto'; b.setAttribute('aria-label','Toggle autoscroll'); b.setAttribute('aria-pressed','false'); b.innerHTML='<i class="fas fa-play" aria-hidden="true"></i>'; return b; }, '#tagsOverlayBtn');
    const volBtn = ensureButton('.float-btn--vol', ()=>{ const b=document.createElement('button'); b.type='button'; b.className='float-btn float-btn--vol'; b.setAttribute('aria-label','Mute / unmute'); b.setAttribute('aria-pressed','false'); b.innerHTML='<i class="fas fa-volume-xmark" aria-hidden="true"></i>'; return b; });
    const timerBtn = ensureButton('.float-btn--timer', ()=>{ const b=document.createElement('button'); b.type='button'; b.className='float-btn float-btn--timer'; b.setAttribute('aria-label','Set autoplay duration for this media'); b.innerHTML='<i class="fas fa-clock" aria-hidden="true"></i>'; return b; });
    let panel = controlsRoot.querySelector('.float-panel');
    if(!panel){
      panel = document.createElement('div'); panel.className='float-panel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Autoplay duration'); panel.hidden=true;
      panel.innerHTML='<div class="float-panel-row">\n        <label>Autoplay: <span class="apv">6</span>s</label>\n        <input type="range" min="3" max="30" value="6" class="apRange" aria-label="Autoplay duration seconds" />\n      </div>\n      <div class="float-panel-actions">\n        <button type="button" class="btn-small apApply">Apply</button>\n        <button type="button" class="btn-small apCancel">Cancel</button>\n      </div>';
      controlsRoot.appendChild(panel);
    }
  } catch(e){
    try { ApplicationUtilities.errorLog(MODULE_NAME, 'buildFloatingControls', 'Failed to build controls', { error: e.message }); } catch {}
  }
}
    
function loadContent() {
  const FUNCTION_NAME = 'loadContent';
  const url = getUrl();
  
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Loading content from API', { url });
  
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load content: ${response.status}`);
      return response.json();
    })
    .then(apiResponse => {
      ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'API response received', { apiResponse });
      
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error('Invalid API response');
      }
      
      const mediaInfo = apiResponse.data;
      const mediaType = mediaInfo.mediaType || 'video'; // default to video
      const mediaUrl = mediaInfo.url;
      
  ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Creating media element', { 
        mediaType, 
        fileName: mediaInfo.filename 
      });
      
      let mediaElement;
      
      // Create appropriate element based on media type
      if (mediaType === 'static') {
        mediaElement = document.createElement('img');
        mediaElement.src = mediaUrl;
        mediaElement.alt = mediaInfo.name || 'Media content';
      } else {
        mediaElement = document.createElement('video');
        mediaElement.src = mediaUrl;
        const mediaConfig = ApplicationConfiguration?.mediaPlaybackSettings || {};
        mediaElement.autoplay = mediaConfig.autoplay !== false;
        mediaElement.loop = mediaConfig.loop !== false;
        mediaElement.controls = mediaConfig.controls === true;
        mediaElement.muted = mediaConfig.muted !== false;
        mediaElement.playsInline = mediaConfig.playsInline !== false;
        // Keep volume UI in sync when metadata/volume becomes available
        try {
          mediaElement.addEventListener('loadedmetadata', () => { try { syncVolumeUi(); } catch {} });
          mediaElement.addEventListener('volumechange', () => { try { syncVolumeUi(); } catch {} });
        } catch {}
      }

      // Unified sizing / fit
      mediaElement.classList.add('media');
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';
      mediaElement.style.objectFit = 'contain';
      mediaElement.style.background = 'var(--color-bg)';

      if (toLoadImageIndex == 0) {
        mediaElement.classList.add("active");
      }

  // Tag element with a stable media key for per-media settings (prefer URL for uniqueness)
  const mediaKey = mediaInfo.url || mediaInfo.relativePath || mediaInfo.id || (mediaInfo.category && mediaInfo.filename ? `${mediaInfo.category}/${mediaInfo.filename}` : mediaInfo.filename) || `idx-${toLoadImageIndex}`;
  mediaElement.dataset.mediaKey = String(mediaKey);
  // Attach metadata for saving
  mediaElement.dataset.url = mediaUrl;
  mediaElement.dataset.name = mediaInfo.name || mediaInfo.filename || 'Media';
  mediaElement.dataset.category = mediaInfo.category || 'homepage';
  mediaElement.dataset.mediaType = mediaInfo.mediaType || 'video';
  mediaElement.dataset.thumbnail = mediaInfo.thumbnail || mediaUrl;

      // Handle audio unmuting for videos on user interaction
      if (mediaType !== 'static' && toLoadImageIndex == 0) {
        document.body.addEventListener("click", () => {
          if (mediaElement.tagName === 'VIDEO') {
            mediaElement.muted = false;
            mediaElement.play().catch(error => {
              ApplicationUtilities.errorLog(MODULE_NAME, 'mediaPlayback', 'Autoplay failed', { error: error.message });
            });
          }
        }, { once: true });
      }    

      mediaContainer.appendChild(mediaElement);
      ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Added media element to container', { 
        toLoadImageIndex, 
        mediaType,
        elementType: mediaElement.tagName 
      });
  // If this is the very first media, sync save button state now
  try { if (toLoadImageIndex === 0) { syncSaveUi(); syncLikeUi(); syncVolumeUi(); syncServerMediaState(); } } catch {}
      // For the very first media, also mark a view if not already reported
      try {
        if (toLoadImageIndex === 0) {
          const mk = mediaElement?.dataset?.mediaKey;
          if (mk) recordView(mk);
        }
      } catch {}
      
  toLoadImageIndex++;

  // Keep playlist selection active so subsequent loads remain within the playlist

      if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
        loadContent();
      }
   })
   .catch(error => {
     ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error loading content', { error: error.message });
     // Show user-friendly error message
     if (typeof ApplicationUtilities !== 'undefined') {
       ApplicationUtilities.displayUserError("Failed to load media content");
     }
   });
}

// Note: Do not attach feed interaction listeners on pages without the feed

function changeImage(side) {
  const FUNCTION_NAME = 'changeImage';
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Change content triggered', { 
    direction: side ? "next" : "previous" 
  });
  if (isTransitioning) return;

  const media = document.querySelectorAll(".media");
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Media elements found', { 
    totalMedia: media.length, 
    currentIndex: currentImageIndex 
  });

  // const maxIndex = images.length - 1; 
  // const canChange = side ? currentImageIndex < maxIndex : currentImageIndex > 0;
  const canChange = !( !side && currentImageIndex <= 0 );

  if (canChange) {
    isTransitioning = true;
    const previousImage = media[currentImageIndex];
    let newImageIndex = side ? currentImageIndex + 1 : currentImageIndex - 1;
    const newImage = media[newImageIndex];

    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Changing to new content', { newImageIndex });
    newImage.classList.add("active");
    
    // Only call play() and set muted for video elements
    if (newImage.tagName === 'VIDEO') {
      newImage.play();
      newImage.muted = false;
    }

    // For forward (side === true): new media comes from bottom (in-up), old goes to top (out-up)
    // For backward (side === false): new media comes from top (in-down), old goes to bottom (out-down)
    if (side) { // next
      previousImage.classList.remove('fly-in-up','fly-in-down','fly-out-down','fly-out-up');
      newImage.classList.remove('fly-in-up','fly-in-down','fly-out-down','fly-out-up');
      newImage.classList.add('fly-in-up');
      previousImage.classList.add('fly-out-up');
    } else { // previous
      previousImage.classList.remove('fly-in-up','fly-in-down','fly-out-down','fly-out-up');
      newImage.classList.remove('fly-in-up','fly-in-down','fly-out-down','fly-out-up');
      newImage.classList.add('fly-in-down');
      previousImage.classList.add('fly-out-down');
    }

    currentImageIndex = newImageIndex;
  // Sync save/like/volume button state for newly active media
  try { syncSaveUi(); syncLikeUi(); syncVolumeUi(); syncServerMediaState(); } catch {}
  // Record a view for the newly active media (once per key)
  try { const mk = newImage?.dataset?.mediaKey; if (mk) recordView(mk); } catch {}

    if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
      loadContent();
    }

    // Only call pause() and set muted for video elements
    if (previousImage.tagName === 'VIDEO') {
      previousImage.pause();
      previousImage.muted = true;
    }

  // Match cleanup timing to CSS animation (~450-500ms). Using 520ms for safety.
  setTimeout(() => {
      previousImage.classList.remove("active");
      previousImage.classList.remove(`fly-out-up`, `fly-out-down`);
      isTransitioning = false;
  // Reschedule autoscroll for the new active media
  if (isAutoscrollOn) scheduleNextAutoAdvance(true);
  }, 520);
  } else {
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'No content change possible', { 
      canChange: false, 
      currentIndex: currentImageIndex 
    });
  }
}

// Legacy helper no longer needed with explicit mapping above (kept for compatibility if referenced elsewhere)
// Removed deprecated toggleFlyAnimation helper (was unused)

// --- Floating Controls & UX Enhancements ---

// (Removed legacy duplicate buildFloatingControls implementation stray fragment cleaned)

function toggleAutoscroll(autoBtn) {
  const FUNCTION_NAME = 'toggleAutoscroll';
  // clear any pending timer
  if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }

  isAutoscrollOn = !isAutoscrollOn;

  if (isAutoscrollOn) {
    scheduleNextAutoAdvance(true);
  }

  if (autoBtn) {
    autoBtn.setAttribute('aria-pressed', String(isAutoscrollOn));
    autoBtn.innerHTML = isAutoscrollOn
      ? '<i class="fas fa-pause" aria-hidden="true"></i>'
      : '<i class="fas fa-play" aria-hidden="true"></i>';
  }

  ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Autoscroll toggled', { on: isAutoscrollOn });
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
}

function requestFsFor(el) {
  if (!el) return Promise.reject('No element');
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
  return Promise.reject('Fullscreen API not supported');
}

function exitFs() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
}

function toggleFullscreen() {
  const FUNCTION_NAME = 'toggleFullscreen';
  const active = document.querySelector('#home-container .media.active');
  const target = mediaContainer || document.documentElement;

  // Try Fullscreen API first on the container
  const currentlyFs = !!getFullscreenElement();
  const next = currentlyFs ? exitFs() : requestFsFor(target);

  next.catch(() => {
    // Fallback: if a video is active on iOS, try native video fullscreen
    if (!currentlyFs && active && active.tagName === 'VIDEO' && typeof active.webkitEnterFullscreen === 'function') {
      try { active.webkitEnterFullscreen(); } catch {}
    }
  }).finally(() => {
    setTimeout(syncFullscreenUi, 50);
  });
}

function syncFullscreenUi() {
  isFullscreen = !!getFullscreenElement();
  const fsBtn = controlsRoot?.querySelector('.float-btn--fs');
  if (fsBtn) {
    fsBtn.innerHTML = isFullscreen
      ? '<i class="fas fa-compress" aria-hidden="true"></i>'
      : '<i class="fas fa-expand" aria-hidden="true"></i>';
  }
}

function syncSaveUi() {
  const btn = controlsRoot?.querySelector('.float-btn--save');
  if (!btn) return;
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'Add to playlist');
  btn.innerHTML = '<i class="fas fa-list-ul" aria-hidden="true"></i>';
}

function syncLikeUi() {
  const likeBtn = controlsRoot?.querySelector('.float-btn--like');
  const likeBadge = controlsRoot?.querySelector('.like-count-badge');
  if (!likeBtn || !likeBadge) return;
  const key = getCurrentMediaKey();
  const liked = isLikedByUser(key);
  const count = getLikeCount(key);
  likeBtn.setAttribute('aria-pressed', String(!!liked));
  likeBtn.innerHTML = liked
    ? '<i class="fas fa-heart" aria-hidden="true" style="color: var(--color-danger, #ff3b30);"></i>'
    : '<i class="fas fa-heart" aria-hidden="true"></i>';
  likeBadge.textContent = String(Math.max(0, count || 0));
}

function setupInactivityAutoHide() {
  const FUNCTION_NAME = 'setupInactivityAutoHide';
  const hideMs = ApplicationConfiguration?.userInterfaceSettings?.controlsHideMs || 2600;
  const events = ['mousemove','mousedown','keydown','touchstart','pointermove','click'];
  const onAny = () => revealControlsTemporarily();
  events.forEach(evt => document.addEventListener(evt, onAny, { passive: true }));
  scheduleControlsHide(hideMs);
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Inactivity auto-hide initialized', { hideMs });
}

function revealControlsTemporarily() {
  if (!controlsRoot) return;
  controlsRoot.classList.add('visible');
  controlsRoot.classList.remove('hidden');
  scheduleControlsHide();
}

function scheduleControlsHide(ms) {
  const hideMs = ms ?? (ApplicationConfiguration?.userInterfaceSettings?.controlsHideMs || 2600);
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (!controlsRoot) return;
    // When controls auto-hide, also close the duration panel if open
    try {
      const panelEl = controlsRoot.querySelector('.float-panel');
      if (panelEl) panelEl.hidden = true;
    } catch {}
    controlsRoot.classList.add('hidden');
    controlsRoot.classList.remove('visible');
  }, hideMs);
}

function preventMobilePullToRefresh() {
  // CSS does most via overscroll-behavior; as extra guard, prevent rubber-band on this view
  const handler = (e) => {
    // One-finger vertical pan only
    if (e.touches && e.touches.length === 1) {
      const currentY = e.touches[0].clientY;
      const dy = currentY - lastTouchY;
      lastTouchY = currentY;
      // If attempting to scroll down at top of page, prevent default to avoid refresh
      const scroller = document.scrollingElement || document.documentElement;
      const atTop = (scroller?.scrollTop || 0) <= 0;
      if (dy > 0 && atTop) {
        e.preventDefault();
      }
    }
  };
  window.addEventListener('touchmove', handler, { passive: false });
}

// Pause autoscroll when tab is hidden; resume when visible if still enabled
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
    ApplicationUtilities.debugLog(MODULE_NAME, 'visibilitychange', 'Autoscroll paused (tab hidden)');
  } else {
    if (isAutoscrollOn && !autoAdvanceTimer) {
      scheduleNextAutoAdvance(true);
      ApplicationUtilities.debugLog(MODULE_NAME, 'visibilitychange', 'Autoscroll resumed (tab visible)');
    }
  }
});

// --- Per-media duration helpers ---
const DURATION_STORE_KEY = 'nf_mediaAutoDurations_v1';

function getDurationsMap() {
  try {
    const raw = localStorage.getItem(DURATION_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveDurationsMap(map) {
  try { localStorage.setItem(DURATION_STORE_KEY, JSON.stringify(map)); } catch {}
}

function getDurationForMedia(mediaKey) {
  const map = getDurationsMap();
  const ms = map[mediaKey];
  if (typeof ms === 'number' && ms > 0) return ms;
  return ApplicationConfiguration?.userInterfaceSettings?.autoAdvanceMs || 6000;
}

function setDurationForMedia(mediaKey, ms) {
  const map = getDurationsMap();
  map[mediaKey] = Math.max(1000, Math.floor(ms));
  saveDurationsMap(map);
}

function getCurrentMediaKey() {
  const list = document.querySelectorAll('#home-container .media');
  const el = list && list[currentImageIndex] ? list[currentImageIndex] : document.querySelector('#home-container .media.active');
  return el?.dataset?.mediaKey || null;
}

function scheduleNextAutoAdvance(restart) {
  if (!isAutoscrollOn) return;
  if (restart && autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
  const key = getCurrentMediaKey();
  lastKnownKey = key || lastKnownKey;
  const ms = getEffectiveDurationMs(key);
  currentAutoDurationMs = ms;
  autoAdvanceTimer = setTimeout(() => {
    try { changeImage(true); } catch {}
  }, ms);
}

function toggleDurationPanel(panel) {
  if (!panel) return;
  const willShow = panel.hidden;
  if (willShow) {
    const key = getCurrentMediaKey();
    const ms = getEffectiveDurationMs(key);
    // Template uses class 'apRange'; original code queried '.ap-range' (mismatch)
    const range = panel.querySelector('.apRange');
    const valueEl = panel.querySelector('.apv');
    const seconds = clamp(Math.round(ms / 1000), 1, 30);
    if (range) {
      range.min = '1';
      range.max = '30';
      range.step = '1';
      range.value = String(seconds);
    }
    if (valueEl) valueEl.textContent = String(seconds);
  }
  panel.hidden = !willShow;
}

// --- Saved list helpers (deprecated; replaced by Playlists) ---
function getActiveMediaMeta() {
  const list = document.querySelectorAll('#home-container .media');
  const el = list && list[currentImageIndex] ? list[currentImageIndex] : document.querySelector('#home-container .media.active');
  if (!el) return null;
  return {
    id: el.dataset.mediaKey,
    name: el.dataset.name || 'Media',
    url: el.dataset.url,
    thumbnail: el.dataset.thumbnail || el.dataset.url,
    category: el.dataset.category || 'homepage',
    mediaType: el.dataset.mediaType || 'video'
  };
}

function getSavedList() { return []; }

function canonicalizeUrl(u) {
  try {
    const url = new URL(u, window.location?.origin || location?.origin || undefined);
    return (url.origin + url.pathname).toLowerCase();
  } catch {
    return (u || '').toLowerCase();
  }
}

function savedKey(id, url) {
  if (id != null && String(id).trim() !== '') return 'id:' + String(id);
  if (url) return 'url:' + canonicalizeUrl(url);
  return null;
}

function dedupeSaved(list) {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const key = savedKey(x?.id, x?.url) || JSON.stringify(x);
    if (!seen.has(key)) { seen.add(key); out.push(x); }
  }
  return out;
}

function saveSavedList(list) { /* no-op */ }

function isSaved(id, url) { return false; }

function addSaved(_item) { return false; }

function removeSavedById(_id, _url) { /* no-op */ }

function toggleSaveForActive(_btn) { /* deprecated */ }

// --- Like helpers (localStorage, client-side only for now) ---
function getLikeCountsMap() {
  try { const raw = localStorage.getItem(LIKES_STORE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
}

function saveLikeCountsMap(map) {
  try { localStorage.setItem(LIKES_STORE_KEY, JSON.stringify(map)); } catch {}
}

function getLikeCount(mediaKey) {
  if (!mediaKey) return 0;
  const map = getLikeCountsMap();
  const n = map[mediaKey];
  return typeof n === 'number' && n > 0 ? n : 0;
}

function setLikeCount(mediaKey, n) {
  if (!mediaKey) return;
  const map = getLikeCountsMap();
  map[mediaKey] = Math.max(0, Math.floor(Number(n) || 0));
  saveLikeCountsMap(map);
}

function getLikedStateMap() {
  try { const raw = localStorage.getItem(LIKED_STATE_STORE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return {};
}

function saveLikedStateMap(map) {
  try { localStorage.setItem(LIKED_STATE_STORE_KEY, JSON.stringify(map)); } catch {}
}

function isLikedByUser(mediaKey) {
  if (!mediaKey) return false;
  const map = getLikedStateMap();
  return !!map[mediaKey];
}

function setLikedForMedia(mediaKey, liked) {
  if (!mediaKey) return;
  const map = getLikedStateMap();
  if (liked) map[mediaKey] = true; else delete map[mediaKey];
  saveLikedStateMap(map);
}

function toggleLikeForActive(btn, badge) {
  const key = getCurrentMediaKey();
  if (!key) return;
  if (btn?.dataset?.busy === '1') return;
  if (btn) btn.dataset.busy = '1';
  const liked = isLikedByUser(key);
  const prev = getLikeCount(key);
  const nextLiked = !liked;
  const nextCount = Math.max(0, prev + (nextLiked ? 1 : -1));
  // Try server; on 401 or error, fallback to local-only
  (async () => {
    try {
      const r = await fetch('/api/media/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaKey: key, like: nextLiked }) });
      if (r.status === 401) throw new Error('unauth');
      if (!r.ok) throw new Error('failed');
      const j = await r.json().catch(() => ({}));
      const cnt = Number(j?.data?.likeCount ?? nextCount);
      setLikedForMedia(key, nextLiked);
      setLikeCount(key, cnt);
    } catch {
      setLikedForMedia(key, nextLiked);
      setLikeCount(key, nextCount);
    } finally {
      syncLikeUi(); if (btn) delete btn.dataset.busy;
    }
  })();
}

// Fetch server-side state (if logged in) and sync UI and local cache
async function syncServerMediaState() {
  try {
  const key = getCurrentMediaKey(); if (!key) return;
  // Ensure a view is recorded for this media key (no-op if already recorded)
  recordView(key);
    const r = await fetch(`/api/media/state?mediaKey=${encodeURIComponent(key)}`);
    if (!r.ok) return; // anonymous still gets counts
    const j = await r.json().catch(() => ({}));
    const d = j?.data; if (!d) return;
    // Like count and user like state
    setLikeCount(key, Number(d.likeCount || 0));
    if (typeof d.likedByUser === 'boolean') setLikedForMedia(key, d.likedByUser);
  // Finally refresh buttons (save is now a playlist action, not a toggle)
    syncLikeUi();
    syncSaveUi();
  } catch {}
}

function notify(type, message) {
  try {
  if (window.toast && typeof window.toast[type] === 'function') {
      window.toast[type](message, { duration: 2200 });
      return;
    }
  } catch {}
  try { alert(message); } catch {}
}

// --- View tracking (server-side metric) ---
function recordView(mediaKey) {
  try {
    const key = String(mediaKey || '').trim();
    if (!key || reportedViewKeys.has(key)) return;
    reportedViewKeys.add(key);
    // Fire and forget; endpoint does not require auth
    fetch('/api/media/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App': 'NudeFlow' },
      body: JSON.stringify({ mediaKey: key })
    }).catch(() => {});
  } catch {}
}

function getEffectiveDurationMs(key) {
  const def = ApplicationConfiguration?.userInterfaceSettings?.autoAdvanceMs || 6000;
  if (!key) return typeof currentAutoDurationMs === 'number' ? currentAutoDurationMs : def;
  const map = getDurationsMap();
  if (typeof map[key] === 'number' && map[key] > 0) return map[key];
  if (key === lastKnownKey && typeof currentAutoDurationMs === 'number') return currentAutoDurationMs;
  return def;
}

function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

// --- Playlists helpers ---
async function fetchPlaylists(){
  try {
    const r = await fetch('/api/playlists');
    if (r.status === 401) throw new Error('unauth');
    if (!r.ok) throw new Error('failed');
    const j = await r.json();
    return Array.isArray(j?.data?.playlists) ? j.data.playlists : [];
  } catch (e) {
    // Avoid spamming multiple identical toasts within a short window
    const now = Date.now();
    if (!window.__nf_lastPlaylistToast || (now - window.__nf_lastPlaylistToast) > 2500) {
      window.__nf_lastPlaylistToast = now;
      notify('warn', 'Sign in to use playlists');
    }
    return [];
  }
}

async function createPlaylist(name){
  const r = await fetch('/api/playlists', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name }) });
  if (!r.ok) throw new Error('failed');
  const j = await r.json();
  return j?.data?.playlist || null;
}

async function addToPlaylist(playlistId, mediaKey){
  const r = await fetch(`/api/playlists/${playlistId}/items`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ mediaKey }) });
  if (!r.ok) throw new Error('failed');
}

async function openPlaylistModal(){
  const key = getCurrentMediaKey(); if (!key) return;
  // Pre-check auth: if not logged in, do not open modal
  try {
    const r = await fetch('/api/playlists');
    if (r.status === 401) {
      const now = Date.now();
      if (!window.__nf_lastPlaylistToast || (now - window.__nf_lastPlaylistToast) > 2500) {
        window.__nf_lastPlaylistToast = now;
        notify('warn', 'Sign in to use playlists');
      }
      return; }
  } catch { notify('warn','Sign in to use playlists'); return; }

  const modal = document.querySelector('.playlist-modal'); if (!modal) return;
  const listEl = modal.querySelector('.plm-list');
  const inputEl = modal.querySelector('.plm-input');
  const createBtn = modal.querySelector('.plm-create-btn');
  const cancelBtn = modal.querySelector('.plm-cancel');
  const backdrop = modal.querySelector('.plm-backdrop');

  function close(){ modal.hidden = true; listEl.innerHTML=''; inputEl.value=''; document.removeEventListener('keydown', onKey); }
  function onKey(e){ if(e.key==='Escape'){ e.preventDefault(); close(); } }
  document.addEventListener('keydown', onKey);

  const render = (items)=>{
    listEl.innerHTML = '';
    if (!items || !items.length) {
      const li = document.createElement('li');
      li.textContent = 'No playlists yet';
      li.setAttribute('aria-disabled','true');
      listEl.appendChild(li);
    } else {
      for (const p of items) {
        const li = document.createElement('li');
        li.className = 'plm-item';
        li.setAttribute('role','option');
        li.tabIndex = 0;
        li.textContent = p.name;
        li.addEventListener('click', async () => {
          try { await addToPlaylist(p.id, key); notify('success', `Added to ${p.name}`); close(); }
          catch { notify('error', 'Failed to add to playlist'); }
        });
        li.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); li.click(); } });
        listEl.appendChild(li);
      }
    }
  };

  createBtn.onclick = async ()=>{
    const name = String(inputEl.value||'').trim(); if(!name) return inputEl.focus();
    try {
      const created = await createPlaylist(name); if(!created) throw new Error('create failed');
      await addToPlaylist(created.id, key);
      notify('success', `Added to ${created.name}`);
      close();
    } catch { notify('error','Failed to create or add'); }
  };
  cancelBtn.onclick = close; backdrop.onclick = close;

  modal.hidden = false; inputEl.value=''; inputEl.placeholder='Create new playlist';
  fetchPlaylists().then(render).catch(()=> render([]));
}

// --- Volume/mute helpers ---
function getActiveMediaEl() {
  const list = document.querySelectorAll('#home-container .media');
  return list && list[currentImageIndex] ? list[currentImageIndex] : document.querySelector('#home-container .media.active');
}

function videoLikelyHasAudio(video) {
  try {
    if (!video || video.tagName !== 'VIDEO') return false;
    if (typeof video.mozHasAudio === 'boolean') return video.mozHasAudio;
    if (typeof video.webkitAudioDecodedByteCount === 'number') return video.webkitAudioDecodedByteCount > 0;
    if (video.audioTracks && typeof video.audioTracks.length === 'number') return video.audioTracks.length > 0;
  } catch {}
  // Fallback: assume true for videos when unknown
  return !!video && video.tagName === 'VIDEO';
}

function syncVolumeUi() {
  const btn = controlsRoot?.querySelector('.float-btn--vol');
  if (!btn) return;
  const el = getActiveMediaEl();
  if (!el || el.tagName !== 'VIDEO') { btn.style.display = 'none'; return; }
  // Show only when likely to have audio
  const hasAudio = videoLikelyHasAudio(el);
  btn.style.display = hasAudio ? 'inline-flex' : 'none';
  if (!hasAudio) return;
  const muted = !!el.muted || (el.volume === 0);
  btn.setAttribute('aria-pressed', String(muted));
  btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  btn.innerHTML = muted
    ? '<i class="fas fa-volume-xmark" aria-hidden="true"></i>'
    : '<i class="fas fa-volume-high" aria-hidden="true"></i>';
}

function toggleMuteForActive(btn) {
  const el = getActiveMediaEl();
  if (!el || el.tagName !== 'VIDEO') return;
  const nextMuted = !el.muted;
  el.muted = nextMuted;
  if (!nextMuted) {
    try { el.play().catch(()=>{}); } catch {}
    if (el.volume === 0) el.volume = 1.0;
  }
  syncVolumeUi();
}

// --- Initialization (was missing; without this nothing loaded and buttons were inert) ---
document.addEventListener('DOMContentLoaded', () => {
  try { buildFloatingControls(); } catch {}
  try {
    if (!IS_FEED_PAGE) {
      // Nothing else to wire on non-feed pages; bail out early.
      return;
    }
    // Wire floating control buttons once present
    const likeBtn = document.querySelector('.float-btn--like');
    const saveBtn = document.querySelector('.float-btn--save');
    const autoBtn = document.querySelector('.float-btn--auto');
    const fsBtn = document.querySelector('.float-btn--fs');
    const volBtn = document.querySelector('.float-btn--vol');
    const timerBtn = document.querySelector('.float-btn--timer');
    const panel = document.querySelector('.float-panel');
    // Wire duration panel Apply / Cancel if present
    if (panel) {
      const range = panel.querySelector('.apRange');
      const valueEl = panel.querySelector('.apv');
      const applyBtn = panel.querySelector('.apApply');
      const cancelBtn = panel.querySelector('.apCancel');
      if (range && valueEl) {
        range.addEventListener('input', () => { valueEl.textContent = String(range.value || ''); });
      }
      if (applyBtn) applyBtn.addEventListener('click', () => {
        try {
          const key = getCurrentMediaKey();
          const secs = clamp(Number(range?.value)||6,1,30);
          if (key) setDurationForMedia(key, secs*1000);
          panel.hidden = true;
          scheduleNextAutoAdvance(true);
        } catch {}
      });
      if (cancelBtn) cancelBtn.addEventListener('click', () => { panel.hidden = true; });
    }
    if (likeBtn) likeBtn.addEventListener('click', () => toggleLikeForActive(likeBtn, document.querySelector('.like-count-badge')));
    if (saveBtn) saveBtn.addEventListener('click', () => openPlaylistModal());
    if (autoBtn) autoBtn.addEventListener('click', () => toggleAutoscroll(autoBtn));
    if (fsBtn) fsBtn.addEventListener('click', () => { toggleFullscreen(); syncFullscreenUi(); });
    if (volBtn) volBtn.addEventListener('click', () => toggleMuteForActive(volBtn));
    if (timerBtn && panel) timerBtn.addEventListener('click', () => toggleDurationPanel(panel));

    // --- Tags Overlay Controller ---
    const tagsBtn = document.getElementById('tagsOverlayBtn');
    const tagsOverlay = document.getElementById('tagsOverlay');
    const tagsOverlayClose = document.getElementById('tagsOverlayClose');
    const tagsOverlayList = document.getElementById('tagsOverlayList');
    const tagsOverlayLive = document.getElementById('tagsOverlayLive');

    async function fetchTagSuggestions(limit=50){
      try {
        const r = await fetch(`/api/tags/suggestions?limit=${limit}`);
        if (!r.ok) throw new Error('failed');
        const j = await r.json().catch(()=>({}));
        return Array.isArray(j?.tags) ? j.tags : [];
      } catch { return []; }
    }

    function renderTagSuggestions(list){
      if (!tagsOverlayList) return;
      tagsOverlayList.innerHTML='';
      if (!list.length){
        const div=document.createElement('div'); div.className='empty-tags'; div.textContent='No tags yet'; tagsOverlayList.appendChild(div); return;
      }
      for (const t of list){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='tag-pill';
        btn.textContent = t.tag || t.name || '(tag)';
        btn.dataset.tag = t.tag || t.name || '';
        btn.addEventListener('click', ()=>{ try { loadMediaTagsForActive(); } catch {} });
        tagsOverlayList.appendChild(btn);
      }
    }

    function openTagsOverlay(){
      if (!tagsOverlay) return;
      tagsOverlay.hidden = false;
      tagsOverlay.setAttribute('aria-hidden','false');
      document.body.classList.add('no-scroll');
      // Populate suggestions + current media tags
      fetchTagSuggestions().then(list=>{ renderTagSuggestions(list); announce(`Loaded ${list.length} tag suggestions`); });
      loadMediaTagsForActive();
    }
    function closeTagsOverlay(){
      if (!tagsOverlay) return;
      tagsOverlay.hidden = true;
      tagsOverlay.setAttribute('aria-hidden','true');
      document.body.classList.remove('no-scroll');
      announce('Closed tag overlay');
    }
    function announce(msg){ try { if (tagsOverlayLive) { tagsOverlayLive.textContent=''; setTimeout(()=>{ tagsOverlayLive.textContent=msg; }, 30); } } catch {}
    }

    async function loadMediaTagsForActive(){
      const key = getCurrentMediaKey();
      if (!key) return;
      try {
        const r = await fetch(`/api/media/${encodeURIComponent(key)}/tags`);
        if (!r.ok) throw new Error('failed');
        const j = await r.json().catch(()=>({}));
        const list = Array.isArray(j?.tags) ? j.tags : [];
        // Reuse #media-tags list (if present on page) to show active media tags
        const ul = document.getElementById('media-tags');
        if (ul) {
          ul.innerHTML='';
          for (const tagObj of list){
            const li=document.createElement('li');
            li.className='media-tag-item';
            li.textContent=`${tagObj.tag} (${tagObj.score ?? 0})`;
            li.dataset.tag = tagObj.tag;
            // Voting buttons
            const up=document.createElement('button'); up.type='button'; up.className='vote-up'; up.textContent='▲'; up.addEventListener('click', ()=>applyTagVote(tagObj.tag,1));
            const down=document.createElement('button'); down.type='button'; down.className='vote-down'; down.textContent='▼'; down.addEventListener('click', ()=>applyTagVote(tagObj.tag,-1));
            li.append(' ', up, down);
            ul.appendChild(li);
          }
        }
      } catch {}
    }

    async function applyTagVote(tag, direction){
      const key = getCurrentMediaKey(); if(!key) return;
      try {
        await fetch(`/api/media/${encodeURIComponent(key)}/tags/${encodeURIComponent(tag)}/vote`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ direction }) });
        loadMediaTagsForActive();
      } catch {}
    }

    async function addTag(tag){
      const key = getCurrentMediaKey(); if(!key) return;
      try {
        await fetch(`/api/media/${encodeURIComponent(key)}/tags`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ tag }) });
        loadMediaTagsForActive();
        announce(`Added tag ${tag}`);
      } catch { announce('Failed to add tag'); }
    }

    const addTagBtn = document.getElementById('add-tag-btn');
    const newTagInput = document.getElementById('new-tag-input');
    if (addTagBtn && newTagInput){
      addTagBtn.addEventListener('click', ()=>{ const v=String(newTagInput.value||'').trim(); if(!v) return; addTag(v); newTagInput.value=''; });
      newTagInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); addTagBtn.click(); } });
    }
  if (tagsBtn) tagsBtn.addEventListener('click', openTagsOverlay);
    if (tagsOverlayClose) tagsOverlayClose.addEventListener('click', closeTagsOverlay);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !tagsOverlay?.hidden) closeTagsOverlay(); });

    // Refresh tags when media changes
    const origChangeImage = changeImage;
    changeImage = function(side){ origChangeImage(side); try { loadMediaTagsForActive(); } catch {} };

    setupInactivityAutoHide();
    preventMobilePullToRefresh();

    // --- Scroll / input navigation for media ---
    // Wheel navigation (throttled by isTransitioning flag already)
    window.addEventListener('wheel', (e) => {
      if (!IS_FEED_PAGE) return;
      if (isTransitioning) return;
      const dy = e.deltaY;
      if (Math.abs(dy) < 25) return; // ignore tiny wheel moves
      if (dy > 0) changeImage(true); else changeImage(false);
    }, { passive: true });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!IS_FEED_PAGE) return;
      if (isTransitioning) return;
      if (['ArrowDown','PageDown','ArrowRight',' '].includes(e.key)) { e.preventDefault(); changeImage(true); }
      else if (['ArrowUp','PageUp','ArrowLeft'].includes(e.key)) { e.preventDefault(); changeImage(false); }
    });

    // Touch swipe navigation
    let touchStartY = null;
    window.addEventListener('touchstart', (e) => { if (!IS_FEED_PAGE) return; if (e.touches && e.touches.length===1) touchStartY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchend', (e) => { if (!IS_FEED_PAGE) return; if (touchStartY == null) return; const endY = (e.changedTouches && e.changedTouches[0]?.clientY) || touchStartY; const dy = endY - touchStartY; touchStartY = null; if (Math.abs(dy) < 40) return; if (dy < 0) changeImage(true); else changeImage(false); }, { passive: true });
  } catch {}
  try { if (IS_FEED_PAGE) loadContent(); } catch {}
});

})(); // End of IIFE
