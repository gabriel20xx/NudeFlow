let toLoadImageIndex = 0; // Track the page number for fetching images
let currentImageIndex = 0; // Track the current visible image
let isTransitioning = false;
let startY = 0;
const preLoadImageCount = 5;
const mediaContainer = document.getElementById("home-container");
const currentUrl = window.location.href;
console.log("Full URL:", currentUrl);
const domainPattern = /^https?:\/\/[^\/]+\/?$/;
const categoryPattern = /^https?:\/\/[^\/]+(\/.+[^\/])$/;

// Preload images
loadContent();

function getUrl() {
  if (categoryPattern.test(currentUrl)) {
    const match = currentUrl.match(categoryPattern);
    if (match && match[1]) {
        let category = match[1];
        let url = `https://xxxtok.gfranz.ch/images/${category}`;
        console.log("Category page", currentUrl);
        return url;
    }
  } else if (domainPattern.test(currentUrl)) {
        let url = `https://xxxtok.gfranz.ch/images/homepage`;
        console.log("Homepage", currentUrl);
        return url;
  } else {
    let url = `https://xxxtok.gfranz.ch/images/homepage`;
    console.log("No page matched, using homepage", currentUrl);
    return url;
  }
}
    
function loadContent() {
  const url = getUrl();
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("Failed to load content");
      return response.blob();
    })
    .then(blob => {
      const objectURL = URL.createObjectURL(blob);
      const mediaElement = document.createElement("video");

      mediaElement.src = objectURL;
      mediaElement.classList.add("media");

      mediaElement.autoplay = true;
      mediaElement.loop = true;
      mediaElement.controls = false;
      mediaElement.muted = true;
      mediaElement.playsInline = true;

      if (toLoadImageIndex == 0) {
        mediaElement.classList.add("active");
      }

      if (toLoadImageIndex == 0) {
        // Attempt to play with sound after user interaction
        document.body.addEventListener("click", () => {
          mediaElement.muted = false;
          mediaElement.play().catch(error => console.error("Autoplay failed:", error));
        }, { once: true });
      }    

      mediaContainer.appendChild(mediaElement);
      console.log("Added media:", toLoadImageIndex); // Debugging output
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
  console.log("Change content triggered", side ? "next" : "previous");
  if (isTransitioning) return;

  const media = document.querySelectorAll(".media");
  console.log("Total media:", media.length, "Current Index:", currentImageIndex);

  // const maxIndex = images.length - 1; 
  // const canChange = side ? currentImageIndex < maxIndex : currentImageIndex > 0;
  const canChange = !( !side && currentImageIndex <= 0 );

  if (canChange) {
    isTransitioning = true;
    const previousImage = media[currentImageIndex];
    let newImageIndex = side ? currentImageIndex + 1 : currentImageIndex - 1;
    const newImage = media[newImageIndex];

    console.log("New content index:", newImageIndex);
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
    console.log("No content change possible");
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
