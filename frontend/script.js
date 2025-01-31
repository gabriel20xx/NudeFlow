// frontend/script.js
let index = 1; // Track the current page

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 100) {
    loadMoreContent(page);
  }
});

function loadMoreContent(page) {
    let picture = String(index).padStart(5, '0');
    fetch(`https://xxxtok.gfranz.ch/api/webp?url=${video.url}`)
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
  
        if (index === 1) {
          startAutoScroll();
        }
  
        index++;
      })
      .catch(error => console.error('Error loading images:', error));
  }
  

// Load the first batch of videos (WebP images)
loadMoreContent(index);
