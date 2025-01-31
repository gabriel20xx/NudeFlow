# Use an official Node.js runtime as the base image
FROM node:current-alpine

# Set the working directory inside the container
WORKDIR /app/backend

# Copy package.json and package-lock.json to leverage Docker caching
COPY backend/package*.json ./

# Install dependencies
RUN npm install express mongoose sharp path cors fs

# Expose the port the app runs on
EXPOSE 5000

# Command to start the server
CMD ["node", "server.js"]
