let toLoadImageIndex = 0; // Track the page number for fetching images
let currentImageIndex = 0; // Track the current visible image
let isTransitioning = false;
let scrollTimeout = null;
let startY = 0;
const preLoadImageCount = 5;
const webpContainer = document.getElementById("webp-container");
const images = document.querySelectorAll(".webp");
const currentUrl = window.location.href;
const domainPattern = /^https:\/\/[a-zA-Z0-9.-]+\/$/;
const categoryPattern = /https?:\/\/[^/]+\/([^/]+)\//;

// Preload images
loadContent();

function getUrl() {
  if (categoryPattern.test(currentUrl)) {
    const match = currentUrl.match(categoryPattern);
    if (match && match[1]) {
        let category = match[1];
        let url = `https://xxxtok.gfranz.ch/media/${category}`;
        return url;
    }
  } else if (domainPattern.test(currentUrl)) {
        let url = `https://xxxtok.gfranz.ch/media/homepage`;
        return url;
  } else {
    let url = `https://xxxtok.gfranz.ch/media/homepage`;
    return url;
  }
}
    
function loadContent() {
  const url = getUrl();
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("Failed to load image");
      return response.blob();
    })
    .then(blob => {
      const objectURL = URL.createObjectURL(blob);
      const imgElement = document.createElement("img");

      imgElement.src = objectURL;
      imgElement.classList.add("webp");

      if (toLoadImageIndex == 0) {
        imgElement.classList.add("active");
      }

      webpContainer.appendChild(imgElement);
      console.log("Added image:", toLoadImageIndex); // Debugging output
      toLoadImageIndex++;

      if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
        loadContent();
      }
   })
}

// Handle touch swipes
document.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
    isTransitioning = true;
});

document.addEventListener("touchmove", (e) => {
    if (!isSwiping) return;
    let deltaY = e.touches[0].clientY - startY;
    handleSwipe(deltaY);
});

document.addEventListener("touchend", () => {
    isTransitioning = false;
});

// Handle mouse wheel scroll
document.addEventListener("wheel", (e) => {
    if (isTransitioning) return;
    isTransitioning = true;

    handleSwipe(e.deltaY);

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isTransitioning = false;
    }, 200); // Prevent rapid scrolling
});

// Handle arrow keys
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
        goToNextPage();
    } else if (e.key === "ArrowUp") {
        goToPreviousPage();
    }
});

// Swipe handler for both touch and scroll
function handleSwipe(deltaY) {
    if (Math.abs(deltaY) > 50) { // Minimum movement to trigger
        if (deltaY < 0) {
            goToNextPage();
        } else {
            goToPreviousPage();
        }
    }
}

// Navigate to next page
function goToNextPage() {
    if (currentImageIndex < images.length - 1) {
        currentImageIndex++;
        updatePagePosition();
    }
}

// Navigate to previous page
function goToPreviousPage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updatePagePosition();
    }
}

// Update the page positions
function updatePagePosition() {
    const offset = currentImageIndex * -100;
    images.forEach((images) => {
        images.style.transform = `translateY(${offset}%)`;
    });
    if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
        loadContent();
    }
}
