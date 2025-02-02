// frontend/script.js
let page = 1; // Track the current page

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
    loadMoreContent(page);
  }
});

function loadMoreContent(page) {
  let number = String(page).padStart(5, '0');
  fetch(`https://xxxtok.gfranz.ch/api/webp?number=${number}`)
    .then(response => {
      if (response.ok) {
        return response.blob(); // Parse the response as a Blob (for image data)
      } else {
        return response.text(); // Otherwise, return raw text (for debugging)
      }
    })
    .then(data => {
      const webpContainer = document.getElementById('webp-container');

      // Check if the response is a blob (image)
      if (data instanceof Blob) {
        const objectURL = URL.createObjectURL(data); // Create an object URL from the blob
        const imgElement = document.createElement('img');
        imgElement.src = objectURL; // Set the image source to the object URL (image buffer)

        imgElement.classList.add('animated-webp');
        webpContainer.appendChild(imgElement); // Append the image to the container
      } else {
        console.error("Expected image data, but received:", data);
      }

      if (page === 1) {
        // startAutoScroll();
      }

      page++;
    })
    .catch(error => console.error('Error loading images:', error));
}


// Function to auto-scroll when WebP animation ends
function startAutoScroll() {
  const images = document.querySelectorAll('.animated-webp');

  function scrollToNext() {
    if (currentIndex >= images.length) {
      currentIndex = 0; // Restart from the first image if at the end
    }

    images[currentIndex].scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      currentIndex++;
      scrollToNext();
    }, animationDuration);
  }

  scrollToNext();
}


// Load the first batch of videos (WebP images)
loadMoreContent(page);
