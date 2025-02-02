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
        return response.json(); // Parse JSON if the response is OK
      } else {
        return response.text(); // Otherwise, return raw text (for debugging)
      }
    })
    .then(data => {
      const webpContainer = document.getElementById('webp-container');

      data.webp.forEach(webp => {
        const imgElement = document.createElement('img');

        // Directly use the image URL (already processed on the server)
        const imageURL = `https://xxxtok.gfranz.ch/api/webp?number=${number}&width=600`;
        imgElement.src = imageURL; // Set the image source to the URL

        imgElement.classList.add('animated-webp');
        imgElement.dataset.duration = webp.duration; // Use server-provided duration

        webpContainer.appendChild(imgElement); // Append the image to the container
      });

      if (page === 1) {
        startAutoScroll();
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
