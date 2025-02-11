window.onload = function() {
    fetch('https://xxxtok.gfranz.ch/api/routes')  // Update with your actual backend URL if necessary
        .then(response => response.json())
        .then(routes => {
            var gridContainer = document.getElementById("grid-container");

            // Loop through the fetched routes and create grid boxes
            routes.forEach(route => {
                var box = document.createElement("div");
                box.classList.add("box");
                
                // Set a background image (adjust this as necessary, for example, based on route)
                box.style.backgroundImage = `url('path/to/image/${route}.jpg')`;  // Adjust image path

                var title = document.createElement("h2");
                title.textContent = route.replace(/_/g, ' ')  // Replace underscores with spaces
                                          .toLowerCase()   // Convert to lowercase
                                          .replace(/\b\w/g, c => c.toUpperCase());  // Capitalize each word

                box.appendChild(title);
                gridContainer.appendChild(box);
            });
        })
        .catch(error => console.error('Error fetching routes:', error));
};
