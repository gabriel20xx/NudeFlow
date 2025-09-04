// Categories page functionality
(function() {
const MODULE_NAME = 'CategoriesModule';

window.addEventListener('load', async function() {
    const FUNCTION_NAME = 'initializeCategoriesPage';
    ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Initializing categories page');
    
    try {
        const routesResp = await ApplicationUtilities.performSafeFetch(ApplicationUtilities.buildApiUrl('routes'));
    let routes = routesResp?.data || routesResp || [];
    // Ensure 'all' appears first if present
    routes = Array.isArray(routes) ? routes.slice().sort((a,b)=> (String(a).toLowerCase()==='all'? -1:0) - (String(b).toLowerCase()==='all'? -1:0)) : routes;
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
            const routeIsAll = String(route).toLowerCase() === 'all';
            item.setAttribute('aria-label', `Open ${routeIsAll ? 'All' : ApplicationUtilities.formatDisplayText(route)}`);

            // Preview wrapper
            const preview = document.createElement('div');
            // Use shared thumbnail wrapper with non-cropping contain behavior
            preview.className = 'video-thumbnail media-contain';

            const title = document.createElement('div');
            // Title styling will inherit from .video-item text rules
            title.className = 'category-title';
                                    try {
                                        const decoded = decodeURIComponent(String(route)).replace(/\+/g,' ');
                                        title.textContent = routeIsAll ? 'All' : decoded;
                                    } catch {
                                        title.textContent = routeIsAll ? 'All' : String(route);
                                    }

            item.appendChild(preview);
            item.appendChild(title);

            // Click/keyboard open: go to home with category in path
            const go = () => { window.location.href = `/${encodeURIComponent(route)}`; };
            item.addEventListener('click', go);
            item.addEventListener('keypress', (e)=>{ if(e.key==='Enter'){ go(); }});

            gridContainer.appendChild(item);

            // Load random preview media for this category using the proper endpoint
            try {
                const cat = String(route).toLowerCase() === 'all' ? 'all' : route;
                const rnd = await ApplicationUtilities.performSafeFetch(`${window.location.origin}/api/media/random/${encodeURIComponent(cat)}`);
                const media = rnd?.data;
        if (media && media.url) {
                    // Image or video element based on mediaType
                    if (media.mediaType === 'static' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(media.url)) {
                        const img = document.createElement('img');
            // Use server thumbnail route for faster category loading
            const encoded = encodeURIComponent(media.relativePath || media.url.replace(/^\/?media\//,''));
            img.loading = 'lazy';
            img.src = `/media/thumb/${encoded}?w=360`;
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
