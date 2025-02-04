// Function to dynamically fetch route names and populate the dropdown
        window.onload = function() {
            fetch('https://xxxtok.gfranz.ch/api/routes')  // Update with your actual backend URL if necessary
                .then(response => response.json())
                .then(routes => {
                    var dropdown = document.getElementById("dropdown");
                    routes.forEach(route => {
                        var option = document.createElement("option");
                        option.value = route;  // Use route as value
                        // Format the display name: remove underscores and convert to uppercase
                        option.textContent = route.replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, c => c.toUpperCase());  
                        dropdown.appendChild(option);
                    });
                })
                .catch(error => console.error('Error fetching routes:', error));
        };

        function redirectToOption() {
            var dropdown = document.getElementById("dropdown");
            var selectedOption = dropdown.value;
            window.location.href = "/" + selectedOption;
        }
