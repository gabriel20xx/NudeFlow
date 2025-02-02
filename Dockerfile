# Use official Node.js image with Debian-based OS
FROM node:latest

# Install smbclient
RUN apt-get update && apt-get install -y smbclient && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create a non-root user
RUN useradd -ms /bin/bash user
RUN chown -R user:user /app

# Switch to non-root user
USER user

# Copy the script into the container
COPY script.sh /app/script.sh

# Make the script executable
RUN chmod +x /app/script.sh

# Expose the application port
EXPOSE 5000

# Run the script when the container starts
CMD ["./script.sh"]