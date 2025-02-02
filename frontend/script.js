let page = 1;
let currentIndex = 0;
let isTransitioning = false;
const webpContainer = document.getElementById("webp-container");

// Load the first image
loadMoreContent(page);

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

      if (webpContainer.children.length === 0) {
        imgElement.classList.add("active"); // First image should be visible
      }

      webpContainer.appendChild(imgElement);
      page++;
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
  if (currentIndex < images.length - 1) {
    images[currentIndex].classList.remove("active");
    currentIndex++;
    images[currentIndex].classList.add("active");
  } else {
    loadMoreContent(page + 1);
  }

  setTimeout(() => {
    isTransitioning = false;
  }, 500);
}
