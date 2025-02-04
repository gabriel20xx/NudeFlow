let page = 1; // Track the page number for fetching images
let currentIndex = 0; // Track the current visible image
let isTransitioning = false;
const webpContainer = document.getElementById("webp-container");

// Load the first image
loadInitialContent(page);

function getUrl(page) {
  const currentUrl = window.location.href;
  const domainPattern = /^https:\/\/[a-zA-Z0-9.-]+\/$/;
  const categoryPattern = /https?:\/\/[^/]+\/([^/]+)\//;
  let number = String(page).padStart(5, "0");
  if (categoryPattern.test(currentUrl)) {
    const match = currentUrl.match(categoryPattern);
    if (match && match[1]) {
        let category = match[1];
        let url = `https://xxxtok.gfranz.ch/media/${category}/${category}_${number}_`;
        console.log("This is a category page");
        return url;
    }
  } else if (domainPattern.test(currentUrl)) {
        let url = `https://xxxtok.gfranz.ch/media/ComfyUI_${number}`;
        console.log("This is the homepage");
        return url;
  } else {
    let url = `https://xxxtok.gfranz.ch/media/ComfyUI_${number}`;
    console.log("This is another page");
    return url;
  }
}

function loadInitialContent(page) {
    url = getUrl(page);
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

            // Add the first image as visible
            imgElement.classList.add("active"); // First image should be visible

            webpContainer.appendChild(imgElement);
            loadMoreContent(page);
        })
        .catch(error => console.error("Error loading images:", error));
}
    
function loadMoreContent(page) {
  url = getUrl(page);
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

      webpContainer.appendChild(imgElement);
    })
    .catch(error => console.error("Error loading images:", error));
}

// Handle swipe & scroll
let startY = 0;

window.addEventListener("touchstart", e => {
  startY = e.touches[0].clientY;
});

window.addEventListener("touchend", e => {
  let endY = e.changedTouches[0].clientY;
  if (startY - endY > 50) showNextImage(); // Swipe up detected
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowDown") showNextImage();
});

window.addEventListener("wheel", e => {
  if (e.deltaY > 0) showNextImage();
});

function showNextImage() {
  if (isTransitioning) return;
  isTransitioning = true;

  const images = document.querySelectorAll(".webp");

  // If there are more images loaded, show the next one
  if (currentIndex < images.length - 1) {
    images[currentIndex].classList.remove("active");
    currentIndex++;
    images[currentIndex].classList.add("active");
    // Load the next image and increment the page number
     // Increment the page number after loading the next image
    loadMoreContent(page);
    page++;
  }

  setTimeout(() => {
    isTransitioning = false;
  }, 500);
}
