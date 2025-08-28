// Media loading and display functionality
(function() {
const MODULE_NAME = 'LoadingModule';

let toLoadImageIndex = 0; // Track the page number for fetching images
let currentImageIndex = 0; // Track the current visible image
let isTransitioning = false;
let startY = 0;
let lastTouchY = 0;
let inactivityTimer = null;
let controlsRoot = null;
let autoAdvanceTimer = null; // setTimeout id
let isAutoscrollOn = false;
let isFullscreen = false;
let lastKnownKey = null;
let currentAutoDurationMs = null;
const SAVED_STORE_KEY = 'nf_savedMedia_v1';

const preLoadImageCount = ApplicationConfiguration?.userInterfaceSettings?.preLoadImageCount || 5;
const mediaContainer = document.getElementById("home-container");
const currentUrl = window.location.href;

ApplicationUtilities.debugLog(MODULE_NAME, 'MODULE_INIT', 'Loading module initialized', { 
  currentUrl,
  preLoadImageCount 
});

const domainPattern = /^https?:\/\/[^/]+\/?$/;
const categoryPattern = /^https?:\/\/[^/]+(\/.+[^/])$/;

// Preload images
loadContent();

// Build floating controls (only on pages with home-container)
if (mediaContainer) {
  buildFloatingControls();
  setupInactivityAutoHide();
  preventMobilePullToRefresh();
}

function getUrl() {
  const FUNCTION_NAME = 'getUrl';
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Determining URL for content loading', { currentUrl });
  
  const baseUrl = ApplicationConfiguration?.baseServerUrl || window.location.origin;
  
  if (categoryPattern.test(currentUrl)) {
    const match = currentUrl.match(categoryPattern);
    if (match && match[1]) {
        let category = match[1];
        let url = `${baseUrl}/api/media/random${category}`;
        ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Category page detected', { category, url });
        return url;
    }
  } else if (domainPattern.test(currentUrl)) {
        let url = `${baseUrl}/api/media/random/homepage`;
        ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Homepage detected', { url });
        return url;
  } else {
    let url = `${baseUrl}/api/media/random/homepage`;
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'No specific page matched, using homepage', { currentUrl });
    return url;
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
  try { if (toLoadImageIndex === 0) syncSaveUi(); } catch {}
      
      toLoadImageIndex++;

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

window.addEventListener("touchstart", e => {
  startY = e.touches[0].clientY;
  lastTouchY = startY;
  revealControlsTemporarily();
});

window.addEventListener("touchend", e => {
  let endY = e.changedTouches[0].clientY;
  let diff = startY - endY;

  if (diff > 50) {
    changeImage(true); // Swipe up
  } else if (diff < -50) {
    changeImage(false); // Swipe down
  }
  scheduleControlsHide();
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowDown") changeImage(true);
  if (e.key === "ArrowUp") changeImage(false);
  revealControlsTemporarily();
});

window.addEventListener("wheel", e => {
  if (e.deltaY > 0) {
    changeImage(true); // Scroll down
  } else if (e.deltaY < 0) {
    changeImage(false); // Scroll up
  }
  revealControlsTemporarily();
});

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
  // Sync save button state for newly active media
  try { syncSaveUi(); } catch {}

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

function buildFloatingControls() {
  const FUNCTION_NAME = 'buildFloatingControls';
  try {
    // Create wrapper
    controlsRoot = document.createElement('div');
    controlsRoot.className = 'floating-controls visible';

    // Buttons
    const fsBtn = document.createElement('button');
    fsBtn.className = 'float-btn float-btn--fs';
    fsBtn.setAttribute('type', 'button');
    fsBtn.setAttribute('aria-label', 'Toggle fullscreen');
    fsBtn.innerHTML = '<i class="fas fa-expand" aria-hidden="true"></i>';

    const autoBtn = document.createElement('button');
    autoBtn.className = 'float-btn float-btn--auto';
    autoBtn.setAttribute('type', 'button');
    autoBtn.setAttribute('aria-pressed', 'false');
    autoBtn.setAttribute('aria-label', 'Toggle autoscroll');
    autoBtn.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'float-btn float-btn--save';
  saveBtn.setAttribute('type', 'button');
  saveBtn.setAttribute('aria-pressed', 'false');
  saveBtn.setAttribute('aria-label', 'Save current media');
  saveBtn.innerHTML = '<i class="fas fa-bookmark" aria-hidden="true"></i>';

    const timerBtn = document.createElement('button');
    timerBtn.className = 'float-btn float-btn--timer';
    timerBtn.setAttribute('type', 'button');
    timerBtn.setAttribute('aria-label', 'Set autoplay duration for this media');
    timerBtn.innerHTML = '<i class="fas fa-clock" aria-hidden="true"></i>';

    // Panel for per-media duration
    const panel = document.createElement('div');
    panel.className = 'float-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Autoplay duration');
    panel.hidden = true;
    panel.innerHTML = `
      <div class="float-panel-row">
        <label>Autoplay: <span class="apv">6</span>s</label>
      </div>
      <input class="ap-range" type="range" min="1" max="30" step="1" value="6" aria-label="Autoplay seconds">
    `;

  // Show fullscreen button on all devices (desktop & mobile)

  controlsRoot.appendChild(fsBtn);
  controlsRoot.appendChild(autoBtn);
  controlsRoot.appendChild(saveBtn);
  controlsRoot.appendChild(timerBtn);
  controlsRoot.appendChild(panel);
    mediaContainer.appendChild(controlsRoot);

    // Handlers
    fsBtn.addEventListener('click', () => {
      revealControlsTemporarily();
      toggleFullscreen();
    });

    autoBtn.addEventListener('click', () => {
      revealControlsTemporarily();
      toggleAutoscroll(autoBtn);
    });

    saveBtn.addEventListener('click', () => {
      revealControlsTemporarily();
      toggleSaveForActive(saveBtn);
    });

    timerBtn.addEventListener('click', () => {
      revealControlsTemporarily();
      toggleDurationPanel(panel);
    });

    // Panel interactions
    const range = panel.querySelector('.ap-range');
    const valueEl = panel.querySelector('.apv');
    range.addEventListener('input', () => {
      const seconds = clamp(Number(range.value) || 6, 1, 30);
      valueEl.textContent = String(seconds);
      const key = getCurrentMediaKey();
      if (key) {
        const ms = seconds * 1000;
        setDurationForMedia(key, ms);
        lastKnownKey = key;
        currentAutoDurationMs = ms;
        if (isAutoscrollOn) scheduleNextAutoAdvance(true);
      }
    });

    // Fullscreen changes
    ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'].forEach(evt => {
      document.addEventListener(evt, syncFullscreenUi);
    });

    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Floating controls initialized');
  // initial save button state
  syncSaveUi();
  } catch (err) {
    ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed to build floating controls', { error: err?.message });
  }
}

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
  const meta = getActiveMediaMeta();
  const saved = isSaved(meta?.id, meta?.url);
  btn.setAttribute('aria-pressed', String(!!saved));
  btn.innerHTML = saved
    ? '<i class="fas fa-bookmark" aria-hidden="true" style="color: var(--color-accent, #ff9800);"></i>'
    : '<i class="fas fa-bookmark" aria-hidden="true"></i>';
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
    const range = panel.querySelector('.ap-range');
    const valueEl = panel.querySelector('.apv');
    const seconds = clamp(Math.round(ms / 1000), 1, 30);
    range.min = '1';
    range.max = '30';
    range.step = '1';
    range.value = String(seconds);
    valueEl.textContent = String(seconds);
  }
  panel.hidden = !willShow;
}

// --- Saved list helpers (localStorage, client-side) ---
function getActiveMediaMeta() {
  const el = document.querySelector('#home-container .media.active');
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

function getSavedList() {
  try {
    const raw = localStorage.getItem(SAVED_STORE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

function saveSavedList(list) {
  try { localStorage.setItem(SAVED_STORE_KEY, JSON.stringify(list)); } catch {}
}

function isSaved(id, url) {
  const list = getSavedList();
  return list.some(x => (id && x.id === id) || (url && x.url === url));
}

function addSaved(item) {
  if (!item?.id && !item?.url) return false;
  // Dedupe existing by id or url
  const list = getSavedList().filter(x => !( (item.id && x.id === item.id) || (item.url && x.url === item.url) ));
  list.unshift(item);
  saveSavedList(list);
  return true;
}

function removeSavedById(id, url) {
  const list = getSavedList();
  const next = list.filter(x => !((id && x.id === id) || (url && x.url === url)));
  saveSavedList(next);
}

function toggleSaveForActive(btn) {
  const meta = getActiveMediaMeta();
  if (!meta) return;
  if (isSaved(meta.id, meta.url)) {
    removeSavedById(meta.id, meta.url);
    notify('info', 'Removed from saved');
  } else {
    addSaved(meta);
    notify('success', 'Saved');
  }
  syncSaveUi();
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

function getEffectiveDurationMs(key) {
  const def = ApplicationConfiguration?.userInterfaceSettings?.autoAdvanceMs || 6000;
  if (!key) return typeof currentAutoDurationMs === 'number' ? currentAutoDurationMs : def;
  const map = getDurationsMap();
  if (typeof map[key] === 'number' && map[key] > 0) return map[key];
  if (key === lastKnownKey && typeof currentAutoDurationMs === 'number') return currentAutoDurationMs;
  return def;
}

function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

})(); // End of IIFE
