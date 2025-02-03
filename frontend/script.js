let page = 1; // Track the page number for fetching images
let currentIndex = 0; // Track the current visible image
let isTransitioning = false;
const webpContainer = document.getElementById("webp-container");

// Load the first image
loadInitialContent(page);

function setBlurredBackground(imgElement) {
    // Wait for the image to load
    if (imgElement.complete) {
        applyBlur(imgElement);
    } else {
        imgElement.onload = () => applyBlur(imgElement);
    }
}

function applyBlur(imgElement) {
    const blurredBg = document.getElementById("blurred-bg");
    blurredBg.style.backgroundImage = `url(${imgElement.src})`;
}

function loadInitialContent(page) {
  let number = String(page).padStart(5, "0");
  fetch(`https://xxxtok.gfranz.ch/media/ComfyUI_${number}`)
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
      page++;
      loadMoreContent(page);
    })
    .catch(error => console.error("Error loading images:", error));
}

function loadMoreContent(page) {
  let number = String(page).padStart(5, "0");
  fetch(`https://xxxtok.gfranz.ch/media/ComfyUI_${number}`)
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

// Call this when setting a new image
function showNextImage() {
    if (isTransitioning || isLoading) return;

    isTransitioning = true;
    
    const currentImage = images[currentIndex];
    if (currentImage) {
        currentImage.classList.remove("active");
    }

    currentIndex++;
    
    if (currentIndex >= images.length) {
        loadMoreContent(page);
    }

    const nextImage = images[currentIndex];
    if (nextImage) {
        nextImage.classList.add("active");
        setBlurredBackground(nextImage); // Update the blurred background
    }

    if (nextImage) {
        nextImage.scrollIntoView({ behavior: "smooth" });
    }

    setTimeout(() => {
        isTransitioning = false;
    }, 500);
}
