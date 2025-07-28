// Intro overlay functionality
const MODULE_NAME = 'IntroModule';

document.addEventListener('DOMContentLoaded', function() {
    const FUNCTION_NAME = 'initializeIntroOverlay';
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Initializing intro overlay functionality');
    
    const okButton = document.getElementById('okButton');
    const overlay = document.getElementById('overlay');
    
    if (!okButton) {
        ApplicationUtilities.warnLog(MODULE_NAME, FUNCTION_NAME, 'OK button not found');
        return;
    }
    
    if (!overlay) {
        ApplicationUtilities.warnLog(MODULE_NAME, FUNCTION_NAME, 'Overlay element not found');
        return;
    }
    
    okButton.addEventListener('click', function() {
        const closeFunction = 'closeIntroOverlay';
        ApplicationUtilities.debugLog(MODULE_NAME, closeFunction, 'OK button clicked, closing overlay');
        
        overlay.style.display = 'none';
        
        ApplicationUtilities.infoLog(MODULE_NAME, closeFunction, 'Intro overlay closed successfully');
    });
    
    ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Intro overlay functionality initialized successfully');
});
