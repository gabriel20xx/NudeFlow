# Use official Node.js image with Debian-based OS
FROM node:latest

# Install smbclient
RUN apt-get update && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the script into the container
COPY scripts/entrypoint.sh /app/entrypoint.sh

# Make the script executable
RUN chmod +x /app/entrypoint.sh

# Create a non-root user
RUN useradd -ms /bin/bash user
RUN chown -R user:user /app

# Switch to non-root user
USER user

# Expose the application port
EXPOSE 5000

# Run the script when the container starts
CMD ["./entrypoint.sh"]