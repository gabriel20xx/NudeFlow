// Media loading and display functionality
const MODULE_NAME = 'LoadingModule';

let toLoadImageIndex = 0; // Track the page number for fetching images
let currentImageIndex = 0; // Track the current visible image
let isTransitioning = false;
let startY = 0;
const preLoadImageCount = ApplicationConfiguration?.userInterfaceSettings?.preLoadImageCount || 5;
const mediaContainer = document.getElementById("home-container");
const currentUrl = window.location.href;

ApplicationUtilities.debugLog(MODULE_NAME, 'MODULE_INIT', 'Loading module initialized', { 
  currentUrl,
  preLoadImageCount 
});

const domainPattern = /^https?:\/\/[^\/]+\/?$/;
const categoryPattern = /^https?:\/\/[^\/]+(\/.+[^\/])$/;

// Preload images
loadContent();

function getUrl() {
  const FUNCTION_NAME = 'getUrl';
  ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'Determining URL for content loading', { currentUrl });
  
  const baseUrl = ApplicationConfiguration?.baseServerUrl || window.location.origin;
  
  if (categoryPattern.test(currentUrl)) {
    const match = currentUrl.match(categoryPattern);
    if (match && match[1]) {
        let category = match[1];
        let url = `${baseUrl}/media${category}`;
        ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Category page detected', { category, url });
        return url;
    }
  } else if (domainPattern.test(currentUrl)) {
        let url = `${baseUrl}/media/homepage`;
        ApplicationUtilities.infoLog(MODULE_NAME, FUNCTION_NAME, 'Homepage detected', { url });
        return url;
  } else {
    let url = `${baseUrl}/media/homepage`;
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'No specific page matched, using homepage', { currentUrl });
    return url;
  }
}
    
function loadContent() {
  const url = getUrl();
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load content: ${response.status}`);
      return response.blob();
    })
    .then(blob => {
      const objectURL = URL.createObjectURL(blob);
      const mediaElement = document.createElement("video");

      mediaElement.src = objectURL;
      mediaElement.classList.add("media");

      // Apply media configuration
      const mediaConfig = ApplicationConfiguration?.mediaPlaybackSettings || {};
      mediaElement.autoplay = mediaConfig.autoplay !== false;
      mediaElement.loop = mediaConfig.loop !== false;
      mediaElement.controls = mediaConfig.controls === true;
      mediaElement.muted = mediaConfig.muted !== false;
      mediaElement.playsInline = mediaConfig.playsInline !== false;

      if (toLoadImageIndex == 0) {
        mediaElement.classList.add("active");
      }

      if (toLoadImageIndex == 0) {
        // Attempt to play with sound after user interaction
        document.body.addEventListener("click", () => {
          mediaElement.muted = false;
          mediaElement.play().catch(error => {
            ApplicationUtilities.errorLog(MODULE_NAME, 'mediaPlayback', 'Autoplay failed', { error: error.message });
          });
        }, { once: true });
      }    

      mediaContainer.appendChild(mediaElement);
      ApplicationUtilities.debugLog(MODULE_NAME, 'loadContent', 'Added media element to container', { toLoadImageIndex });
      toLoadImageIndex++;

      if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
        loadContent();
      }
   })
   .catch(error => {
     ApplicationUtilities.errorLog(MODULE_NAME, 'loadContent', 'Error loading content', { error: error.message });
     // Show user-friendly error message
     if (typeof ApplicationUtilities !== 'undefined') {
       ApplicationUtilities.displayUserError("Failed to load media content");
     }
   });
}

window.addEventListener("touchstart", e => {
  startY = e.touches[0].clientY;
});

window.addEventListener("touchend", e => {
  let endY = e.changedTouches[0].clientY;
  let diff = startY - endY;

  if (diff > 50) {
    changeImage(true); // Swipe up
  } else if (diff < -50) {
    changeImage(false); // Swipe down
  }
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowDown") changeImage(true);
  if (e.key === "ArrowUp") changeImage(false);
});

window.addEventListener("wheel", e => {
  if (e.deltaY > 0) {
    changeImage(true); // Scroll down
  } else if (e.deltaY < 0) {
    changeImage(false); // Scroll up
  }
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
    newImage.play();
    newImage.muted = false;

    toggleFlyAnimation(previousImage, 'out', side ? 'up' : 'down');
    toggleFlyAnimation(newImage, 'in', side ? 'up' : 'down');

    currentImageIndex = newImageIndex;

    if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
      loadContent();
    }

    previousImage.pause();
    previousImage.muted = true;

    setTimeout(() => {
      previousImage.classList.remove("active");
      previousImage.classList.remove(`fly-out-up`, `fly-out-down`);
      isTransitioning = false;
    }, 500);
  } else {
    ApplicationUtilities.debugLog(MODULE_NAME, FUNCTION_NAME, 'No content change possible', { 
      canChange: false, 
      currentIndex: currentImageIndex 
    });
  }
}

function toggleFlyAnimation(element, action, direction) {
  const directions = ['up', 'down'];
  const actions = ['in', 'out'];

  // Remove all existing fly classes
  directions.forEach(d => actions.forEach(a => element.classList.remove(`fly-${a}-${d}`)));

  // Apply the new class
  const animationClass = `fly-${action}-${direction}`;
  element.classList.add(animationClass);
}
