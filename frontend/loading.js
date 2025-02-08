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
  console.log("Change image triggered", side ? "next" : "previous");
  if (isTransitioning) return;

  const images = document.querySelectorAll(".webp");
  console.log("Total images:", images.length, "Current Index:", currentImageIndex);

  const maxIndex = images.length - 1; 
  const canChange = side ? currentImageIndex < maxIndex : currentImageIndex > 0;

  if (canChange) {
    isTransitioning = true;
    const previousImage = images[currentImageIndex];
    let newImageIndex = side ? currentImageIndex + 1 : currentImageIndex - 1;
    const newImage = images[newImageIndex];

    console.log("New image index:", newImageIndex);
    newImage.classList.add("active");

    toggleFlyAnimation(previousImage, 'out', side ? 'up' : 'down');
    toggleFlyAnimation(newImage, 'in', side ? 'up' : 'down');

    currentImageIndex = newImageIndex;

    if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
      loadContent();
    }

    setTimeout(() => {
      previousImage.classList.remove("active");
      previousImage.classList.remove(`fly-out-up`, `fly-out-down`);
      isTransitioning = false;
    }, 500);
  } else {
    console.log("No image change possible");
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

  // Ensure the animation class is removed after completion
  element.addEventListener('animationend', () => {
    element.classList.remove(animationClass);
    if (action === 'in') {
      element.style.transform = 'none'; // Prevent resetting
    }
  }, { once: true });
}
