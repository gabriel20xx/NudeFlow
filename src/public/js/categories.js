// Categories page functionality
(function() {
const MODULE_NAME = 'CategoriesModule';

window.onload = async function() {
    const FUNCTION_NAME = 'initializeCategoriesPage';
    ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Initializing categories page');
    
    try {
        const routes = await ApplicationUtilities.performSafeFetch(ApplicationUtilities.buildApiUrl('routes'));
        const gridContainer = document.getElementById("categories-container");

        if (!gridContainer) {
            ApplicationUtilities.warnLog(MODULE_NAME, FUNCTION_NAME, 'Categories container not found');
            return;
        }

        ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Grid container found, processing routes', { 
            routeCount: routes.length 
        });

        // Clear existing content except for title
        const existingBoxes = gridContainer.querySelectorAll('.box');
        existingBoxes.forEach(box => box.remove());

        // Loop through the fetched routes and create grid boxes
        routes.forEach((route, index) => {
            ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Creating category box', { route, index });
            
            const box = document.createElement("div");
            box.classList.add("box");
            
            // Set a background image (adjust this as necessary, based on route)
            box.style.backgroundImage = `url('path/to/image/${route}.jpg')`;  // Adjust image path

            const title = document.createElement("h2");
            title.textContent = ApplicationUtilities.formatDisplayText(route);

            box.appendChild(title);
            
            // Add click handler for navigation
            box.addEventListener('click', () => {
                ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Category box clicked, navigating', { route });
                window.location.href = `/${route}`;
            });

            gridContainer.appendChild(box);
        });
        
        ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Categories page initialized successfully', { 
            totalCategories: routes.length 
        });
    } catch (error) {
        ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed to initialize categories page', { 
            error: error.message 
        });
        ApplicationUtilities.displayUserError('Failed to load categories');
    }
};

})(); // End of IIFE
