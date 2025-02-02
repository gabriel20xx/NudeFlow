#!/bin/bash

mkdir XXXTok
cd XXXTok

# Clone the repository
git clone https://github.com/gabriel20xx/XXXTok.git .

# Pull the latest changes from the master branch
git pull origin master

# Start the server
node backend/server.js
