# Use an official Node.js runtime as the base image
FROM node:latest

# Set the working directory inside the container
WORKDIR /app

RUN useradd -ms /bin/bash user
RUN chmod -R 777 /app
RUN chown -R user:user /app

# Copy the script.sh into the container
COPY script.sh /app/script.sh

# Make the script executable
RUN chmod +x /app/script.sh

# Install dependencies
RUN npm install express mongoose sharp path cors fs

# Expose the port the app runs on
EXPOSE 5000

# Run the script when the container starts
CMD ["./script.sh"]
