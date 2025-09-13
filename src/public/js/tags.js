// Tags page functionality
(function() {
const MODULE_NAME = 'TagsModule';

window.addEventListener('load', async function() {
    const FUNCTION_NAME = 'initializeTagsPage';
    ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Initializing tags page');
    try {
        // Fetch tag suggestions from the admin endpoint (publicly readable)
        const resp = await fetch('/api/admin/media/tags/suggestions?limit=100');
        const data = await resp.json();
        const tags = (data.tags || []).map(t => t.tag || t);
        const gridContainer = document.getElementById('tagsGrid');
        if (!gridContainer) {
            ApplicationUtilities.warnLog(MODULE_NAME, FUNCTION_NAME, 'Tags grid container not found');
            return;
        }
        gridContainer.innerHTML = '';
        for (const tag of tags) {
            const item = document.createElement('div');
            item.className = 'video-item';
            item.setAttribute('role','button');
            item.setAttribute('tabindex','0');
            item.setAttribute('aria-label', `Open tag ${ApplicationUtilities.formatDisplayText(tag)}`);
            const preview = document.createElement('div');
            preview.className = 'video-thumbnail media-contain';
            const title = document.createElement('div');
            title.className = 'category-title';
            title.textContent = tag;
            item.appendChild(preview);
            item.appendChild(title);
            // Click/keyboard open: go to home with tag filter param
            const go = () => { window.location.href = `/?tag=${encodeURIComponent(tag)}`; };
            item.addEventListener('click', go);
            item.addEventListener('keypress', (e)=>{ if(e.key==='Enter'){ go(); }});
            gridContainer.appendChild(item);
            // Optionally: fetch a random media preview for this tag
            try {
                const rnd = await fetch(`/api/media/random?tag=${encodeURIComponent(tag)}`);
                const media = (await rnd.json())?.data;
                if (media && media.url) {
                    if (media.mediaType === 'static' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(media.url)) {
                        const img = document.createElement('img');
                        img.loading = 'lazy';
                        img.src = `/media/thumb/${encodeURIComponent(media.relativePath || media.url.replace(/^\/?media\//,''))}?w=360`;
                        img.alt = ApplicationUtilities.formatDisplayText(tag);
                        preview.appendChild(img);
                    } else {
                        const video = document.createElement('video');
                        video.src = media.url;
                        video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true; video.controls = false;
                        preview.appendChild(video);
                    }
                }
            } catch {}
        }
    } catch (err) {
        ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed to load tags', err);
        const gridContainer = document.getElementById('tagsGrid');
        if (gridContainer) gridContainer.innerHTML = '<div class="error">Failed to load tags</div>';
    }
});
})();
