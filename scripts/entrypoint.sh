#!/bin/bash

# Function to retry a command indefinitely until it succeeds
retry_until_success() {
  local cmd="$1"
  while true; do
    eval "$cmd"
    if [ $? -eq 0 ]; then
      break
    fi
    echo "Command failed. Retrying in 5 seconds..."
    sleep 5
  done
}

# Check if the directory exists and remove it if needed
if [ -d "xxxtok" ]; then
  rm -rf xxxtok
fi

# Create directory and enter it
mkdir -p mnt/models
mkdir -p mnt/images
mkdir xxxtok
cd xxxtok

# Clone the repository if it's not already a Git repo
retry_until_success "git clone https://github.com/gabriel20xx/XXXTok.git ."

# Ensure it's a Git repo before pulling
if [ -d ".git" ]; then
  retry_until_success "git pull origin master"
fi

# Check if package.json exists before running npm install
if [ -f "package.json" ]; then
  npm install express ejs express-ejs-layouts mongoose path sharp cors fs samba-client
else
  echo "package.json not found, skipping npm install"
fi

# Check if the server.js file exists before starting
if [ -f "src/server.js" ]; then
  node src/server.js
else
  echo "server.js not found"
fi
