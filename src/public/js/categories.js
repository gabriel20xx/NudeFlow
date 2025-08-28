// Categories page functionality
(function() {
const MODULE_NAME = 'CategoriesModule';

window.addEventListener('load', async function() {
    const FUNCTION_NAME = 'initializeCategoriesPage';
    ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Initializing categories page');
    
    try {
        const routesResp = await ApplicationUtilities.performSafeFetch(ApplicationUtilities.buildApiUrl('routes'));
        const routes = routesResp?.data || routesResp || [];
        const gridContainer = document.getElementById('categoriesGrid');

        if (!gridContainer) {
            ApplicationUtilities.warnLog(MODULE_NAME, FUNCTION_NAME, 'Categories grid container not found');
            return;
        }

        // Clear any existing
        gridContainer.innerHTML = '';

    for (const route of routes) {
            // Create grid item
            const item = document.createElement('div');
            // Reuse saved/search card styles for consistent design
            item.className = 'video-item';
            item.setAttribute('role','button');
            item.setAttribute('tabindex','0');
            item.setAttribute('aria-label', `Open ${ApplicationUtilities.formatDisplayText(route)}`);

            // Preview wrapper
            const preview = document.createElement('div');
            // Use the same thumbnail wrapper as saved cards
            preview.className = 'video-thumbnail';

            const title = document.createElement('div');
            // Title styling will inherit from .video-item text rules
            title.className = 'category-title';
            title.textContent = ApplicationUtilities.formatDisplayText(route);

            item.appendChild(preview);
            item.appendChild(title);

            // Click/keyboard open: go to home with category in path
            const go = () => { window.location.href = `/${route}`; };
            item.addEventListener('click', go);
            item.addEventListener('keypress', (e)=>{ if(e.key==='Enter'){ go(); }});

            gridContainer.appendChild(item);

            // Load random preview media for this category using the proper endpoint
            try {
                const rnd = await ApplicationUtilities.performSafeFetch(`${window.location.origin}/api/media/random/${encodeURIComponent(route)}`);
                const media = rnd?.data;
                if (media && media.url) {
                    // Image or video element based on mediaType
                    if (media.mediaType === 'static' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(media.url)) {
                        const img = document.createElement('img');
                        img.src = media.thumbnail || media.url;
                        img.alt = ApplicationUtilities.formatDisplayText(route);
                        preview.appendChild(img);
                    } else {
                        const video = document.createElement('video');
                        video.src = media.url;
                        video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true; video.controls = false;
                        preview.appendChild(video);
                    }
                }
            } catch (e) {
                ApplicationUtilities.warnLog(MODULE_NAME, FUNCTION_NAME, 'Failed to load preview media', { route, error: e?.message });
            }
        }

        ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Categories page initialized successfully', { totalCategories: routes.length });
    } catch (error) {
        ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed to load categories', { error: error.message });
        ApplicationUtilities.displayUserError('Failed to load categories');
    }
});

})(); // End of IIFE
