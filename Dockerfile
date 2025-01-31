# Use an official Node.js runtime as the base image
FROM node:latest

# Set the working directory inside the container
WORKDIR /app

RUN git clone https://github.com/gabriel20xx/XXXTok.git .
RUN chmod -r 777 ./
RUN chown -r user:user ./

# Install dependencies
RUN npm install express mongoose sharp path cors fs

# Expose the port the app runs on
EXPOSE 5000

# Command to start the server
CMD ["node", "backend/server.js"]
