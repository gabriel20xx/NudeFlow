let toLoadImageIndex = 0; // Track the page number for fetching images
let currentImageIndex = 0; // Track the current visible image
let isTransitioning = false;
let startY = 0;
const preLoadImageCount = 5;
const webpContainer = document.getElementById("webp-container");
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
        console.log("This is a category page");
        return url;
    }
  } else if (domainPattern.test(currentUrl)) {
        let url = `https://xxxtok.gfranz.ch/media/homepage`;
        console.log("This is the homepage");
        return url;
  } else {
    let url = `https://xxxtok.gfranz.ch/media/homepage`;
    console.log("This is another page");
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

      if (toLoadImageIndex == 1) {
        imgElement.classList.add("active");
      }

      webpContainer.appendChild(imgElement);
      toLoadImageIndex++;
      if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
        loadContent();
      }
    })
    .catch(error => console.error("Error loading images:", error));
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
  if (isTransitioning) return;

  const images = document.querySelectorAll(".webp");
  const maxIndex = images.length - 1; 
  const canChange = side ? currentImageIndex < maxIndex : currentImageIndex > 0;

  if (canChange) {
    isTransitioning = true;
    const previousImage = images[currentImageIndex];
    let newImageIndex = side ? currentImageIndex + 1 : currentImageIndex - 1;
    const newImage = images[newImageIndex];

    // Animate previous image out
    toggleFlyAnimation(previousImage, 'out', side ? 'up' : 'down');

    // Ensure the new image is visible before animating it in
    newImage.classList.add("active");

    // Animate new image in
    toggleFlyAnimation(newImage, 'in', side ? 'up' : 'down');

    // Update index
    currentImageIndex = newImageIndex;

    // Load content if needed
    if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
      loadContent();
    }

    // Remove active class from previous image after animation
    setTimeout(() => {
      previousImage.classList.remove("active");
      isTransitioning = false;
    }, 500);
  }
}

function toggleFlyAnimation(element, action, direction) {
  const directions = ['up', 'down'];
  const actions = ['in', 'out'];

  // Remove all classes related to the fly animation
  directions.forEach(d => actions.forEach(a => element.classList.remove(`fly-${a}-${d}`)));

  // Add the new class based on the action and direction
  element.classList.add(`fly-${action}-${direction}`);
}
