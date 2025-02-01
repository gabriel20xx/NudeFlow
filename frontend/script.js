// frontend/script.js
let page = 1; // Track the current page

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
    loadMoreContent(page);
  }
});

function loadMoreContent(page) {
    let number = String(index).padStart(5, '0');
    fetch(`https://xxxtok.gfranz.ch/api/webp?url=${number}`)
      .then(response => response.json())
      .then(data => {
        const videoContainer = document.getElementById('video-container');
  
        data.videos.forEach(video => {
          const imgElement = document.createElement('img');
          imgElement.src = number;
          imgElement.classList.add('animated-webp');
          imgElement.dataset.duration = video.duration; // Use server-provided duration
  
          videoContainer.appendChild(imgElement);
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
loadMoreContent(index);
