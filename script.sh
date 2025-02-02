#!/bin/bash

# Check if the directory exists and remove it if needed
if [ -d "xxxtok" ]; then
  rm -rf xxxtok
fi

# Create directory and enter it
mkdir xxxtok
cd xxxtok

# Clone the repository if it's not already a Git repo
if [ ! -d ".git" ]; then
  git clone https://github.com/gabriel20xx/XXXTok.git .
else
  git pull origin master
fi

npm install express mongoose path sharp cors fs smb2

# Check if the server.js file exists before starting
if [ -f "backend/server.js" ]; then
  node backend/server.js
else
  echo "server.js not found in backend/"
fi
