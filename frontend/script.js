let toLoadImage = 1; // Track the page number for fetching images
let currentImage = 1; // Track the current visible image
let isTransitioning = false;
let isInitial = true;
const webpContainer = document.getElementById("webp-container");

// Load the first image
loadInitialContent(toLoadImage);

function getUrl(toLoadImage) {
  const currentUrl = window.location.href;
  const domainPattern = /^https:\/\/[a-zA-Z0-9.-]+\/$/;
  const categoryPattern = /https?:\/\/[^/]+\/([^/]+)\//;
  let number = String(toLoadImage).padStart(5, "0");
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

function loadInitialContent(toLoadImage) {
    url = getUrl(toLoadImage);
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
            toLoadImage++;
            loadMoreContent(toLoadImage);
        })
        .catch(error => console.error("Error loading images:", error));
}
    
function loadMoreContent(toLoadImage) {
  url = getUrl(toLoadImage);
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
      toLoadImage++;
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
  if (startY - endY > 50) showNextImage(toLoadImage); // Swipe up detected
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowDown") showNextImage(toLoadImage);
});

window.addEventListener("wheel", e => {
  if (e.deltaY > 0) showNextImage(toLoadImage);
});

function showNextImage(toLoadImage) {
  if (isTransitioning) return;
  isTransitioning = true;

  const images = document.querySelectorAll(".webp");

  // If there are more images loaded, show the next one
  if (isInitial) {
    isInitial = false;
  } else {
    images[currentImage-1].classList.remove("active");
    currentImage++;
    images[currentImage-1].classList.add("active");
  }
    // Load the next image and increment the page number
     // Increment the page number after loading the next imag
  loadMoreContent(toLoadImage);

  setTimeout(() => {
    isTransitioning = false;
  }, 500);
}
