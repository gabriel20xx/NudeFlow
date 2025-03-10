let toLoadImageIndex = 0; // Track the page number for fetching images
let currentImageIndex = 0; // Track the current visible image
let isTransitioning = false;
let startY = 0;
const preLoadImageCount = 5;
const webpContainer = document.getElementById("home-container");
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
      if (!response.ok) throw new Error("Failed to load image");
      return response.blob();
    })
    .then(blob => {
      const objectURL = URL.createObjectURL(blob);
      const imgElement = document.createElement("video");

      imgElement.src = objectURL;
      imgElement.classList.add("webp");

      imgElement.autoplay = true;
      imgElement.loop = true;
      imgElement.controls = false;

      // Attempt to play with sound after user interaction
      document.body.addEventListener("click", () => {
          document.getElementById('overlay').style.display = 'none';
          imgElement.muted = false;
          imgElement.play().catch(error => console.error("Autoplay failed:", error));
      }, { once: true });

      webpContainer.appendChild(imgElement);
      console.log("Added image:", toLoadImageIndex); // Debugging output
      toLoadImageIndex++;

      if (toLoadImageIndex == 0) {
        imgElement.classList.add("active");
      }    

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

  // const maxIndex = images.length - 1; 
  // const canChange = side ? currentImageIndex < maxIndex : currentImageIndex > 0;
  const canChange = !( !side && currentImageIndex <= 0 );

  if (canChange) {
    isTransitioning = true;
    const previousImage = images[currentImageIndex];
    let newImageIndex = side ? currentImageIndex + 1 : currentImageIndex - 1;
    const newImage = images[newImageIndex];

    console.log("New image index:", newImageIndex);
    newImage.classList.add("active");
    newImage.play();

    toggleFlyAnimation(previousImage, 'out', side ? 'up' : 'down');
    toggleFlyAnimation(newImage, 'in', side ? 'up' : 'down');

    currentImageIndex = newImageIndex;

    if ((toLoadImageIndex - currentImageIndex) < preLoadImageCount) {
      loadContent();
    }

    setTimeout(() => {
      previousImage.classList.remove("active");
      previousImage.classList.remove(`fly-out-up`, `fly-out-down`);
      previousImage.pause();
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
}
