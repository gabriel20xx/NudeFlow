let toLoadImage = 1; // Track the page number for fetching images
let currentImage = 1; // Track the current visible image
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
        let url = `https://xxxtok.gfranz.ch/media/random`;
        console.log("This is the homepage");
        return url;
  } else {
    let url = `https://xxxtok.gfranz.ch/media/random`;
    console.log("This is another page");
    return url;
  }
}
    
function loadContent() {
  const url = getUrl(); // Declare 'url' properly
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

      if (toLoadImage == 1) {
        imgElement.classList.add("active");
      }

      webpContainer.appendChild(imgElement);
      toLoadImage++;
      if ((toLoadImage - currentImage) < preLoadImageCount) {
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
  isTransitioning = true;

  const images = document.querySelectorAll(".webp");
  const canChange = side ? currentImage < images.length : currentImage > 1;
  
  if (canChange) {
    images[currentImage - 1].classList.remove("active");
    if (side) {
      flyOut(images[currentImage - 1]);
      currentImage++;
      flyIn(images[currentImage - 1]);
    } else {
      currentImage--;
    }
    images[currentImage - 1].classList.add("active");

    // Load the next image and increment the page number
    if ((toLoadImage - currentImage) < preLoadImageCount) {
        loadContent();
    }
  }

  setTimeout(() => {
    isTransitioning = false;
  }, 500);
}

function flyOut(element) {
  element.classList.add('fly-out');
  element.classList.remove('fly-in');
}

function flyIn(element) {
  element.classList.add('fly-in');
  element.classList.remove('fly-out');
}
