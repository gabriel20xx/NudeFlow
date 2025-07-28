// Dropdown functionality for route navigation
(function() {
const MODULE_NAME = 'DropdownModule';

/**
 * Initialize dropdown functionality when page loads
 */
window.onload = async function initializeDropdownOnLoad() {
    const FUNCTION_NAME = 'initializeDropdownOnLoad';
    ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Initializing dropdown on page load');
    
    try {
        await populateDropdownWithRoutes();
        ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Dropdown initialization completed successfully');
    } catch (initializationError) {
        ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed to initialize dropdown', { error: initializationError.message });
        ApplicationUtilities.displayUserError('Failed to load navigation options');
    }
};

/**
 * Populate dropdown with available routes from API
 */
async function populateDropdownWithRoutes() {
    const FUNCTION_NAME = 'populateDropdownWithRoutes';
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Starting dropdown population');
    
    try {
        const availableRoutes = await ApplicationUtilities.performSafeFetch(
            ApplicationUtilities.buildApiUrl('routes')
        );
        
        ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Routes data received', { 
            routeCount: availableRoutes?.data?.length || 0
        });
        
        const dropdownElement = document.getElementById("dropdown");
        
        if (!dropdownElement) {
            ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Dropdown element not found in DOM');
            throw new Error('Dropdown element not found');
        }

        // Clear existing options except the first one (default "Select an option")
        clearExistingDropdownOptions(dropdownElement);

        // Extract routes data (handle both old and new API response formats)
        const routesData = availableRoutes.data || availableRoutes || [];
        
        if (routesData.length === 0) {
            ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'No routes available to populate');
            return;
        }

        // Add each route as an option
        routesData.forEach(routeName => {
            addRouteOptionToDropdown(dropdownElement, routeName);
        });

        ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Dropdown populated successfully', { 
            optionsAdded: routesData.length 
        });
    } catch (populationError) {
        ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error populating dropdown', populationError);
        throw populationError;
    }
}

/**
 * Clear existing dropdown options except default ones
 * @param {HTMLElement} dropdownElement - The dropdown element
 */
function clearExistingDropdownOptions(dropdownElement) {
    const FUNCTION_NAME = 'clearExistingDropdownOptions';
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Clearing existing dropdown options');
    
    const initialOptionCount = dropdownElement.children.length;
    
    // Keep first option (default "Select an option"), remove the rest
    while (dropdownElement.children.length > 1) {
        dropdownElement.removeChild(dropdownElement.lastChild);
    }
    
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Dropdown options cleared', { 
        initialCount: initialOptionCount,
        remainingCount: dropdownElement.children.length
    });
}

/**
 * Add a route option to the dropdown
 * @param {HTMLElement} dropdownElement - The dropdown element
 * @param {string} routeName - Name of the route to add
 */
function addRouteOptionToDropdown(dropdownElement, routeName) {
    const FUNCTION_NAME = 'addRouteOptionToDropdown';
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Adding route option to dropdown', { routeName });
    
    const optionElement = document.createElement("option");
    optionElement.value = routeName;
    optionElement.textContent = ApplicationUtilities.formatDisplayText(routeName);
    
    // Set homepage as selected by default
    if (routeName.toLowerCase() === 'homepage') {
        optionElement.selected = true;
        ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Homepage set as default selection', { routeName });
    }
    
    dropdownElement.appendChild(optionElement);
    
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Route option added successfully', { 
        routeName,
        displayText: optionElement.textContent,
        isSelected: optionElement.selected
    });
}

/**
 * Handle dropdown selection and redirect to chosen route
 */
function redirectToSelectedOption() {
    const FUNCTION_NAME = 'redirectToSelectedOption';
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing dropdown selection');
    
    const dropdownElement = document.getElementById("dropdown");
    if (!dropdownElement) {
        ApplicationUtilities.errorLog(MODULE_NAME, FUNCTION_NAME, 'Dropdown element not found for redirection');
        return;
    }
    
    const selectedOptionValue = dropdownElement.value;
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Dropdown option selected', { 
        selectedOptionValue 
    });
    
    if (selectedOptionValue && selectedOptionValue.trim() !== '') {
        // Special case for homepage - redirect to root path
        const redirectionUrl = selectedOptionValue.toLowerCase() === 'homepage' ? "/" : "/" + selectedOptionValue;
        ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Redirecting to selected route', { 
            selectedOptionValue,
            redirectionUrl 
        });
        
        window.location.href = redirectionUrl;
    } else {
        ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'No valid option selected, skipping redirection');
    }
}

// Make function globally available for onclick handlers
window.redirectToOption = redirectToSelectedOption;

ApplicationUtilities.debugLog(MODULE_NAME, 'MODULE_INIT', 'Dropdown module loaded and ready');

})(); // End of IIFE
