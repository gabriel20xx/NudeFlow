// frontend/script.js
let page = 1; // Track the current page

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
    loadMoreContent(page);
  }
});

function loadMoreContent(page) {
    fetch(`http://xxxtok.gfranz.ch/api/webp?page=${page}`)
      .then(response => response.json())
      .then(data => {
        const videoContainer = document.getElementById('video-container');
  
        data.videos.forEach(video => {
          const imgElement = document.createElement('img');
          imgElement.src = video.url;
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
  

// Load the first batch of videos (WebP images)
loadMoreContent(page);
