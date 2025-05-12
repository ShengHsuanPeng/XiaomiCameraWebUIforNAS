#!/bin/bash

# Check if FFmpeg is installed
echo "Checking if FFmpeg is installed..."
if command -v ffmpeg >/dev/null 2>&1; then
  echo "✅ FFmpeg is installed: $(ffmpeg -version | head -n 1)"
else
  echo "❌ FFmpeg not found! Thumbnail generation will not work properly."
  echo "Please follow the instructions in README.md to install FFmpeg."
  
  # Show installation commands based on system type
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS: brew install ffmpeg"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux: sudo apt update && sudo apt install ffmpeg"
  else
    echo "Windows: Please visit https://ffmpeg.org/download.html to download, or use Chocolatey: choco install ffmpeg"
  fi
  
  echo ""
  echo "Do you want to continue starting the application? (y/n)"
  read -r answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Startup cancelled."
    exit 1
  fi
  
  echo "Continuing startup, but thumbnail functionality may not work properly."
fi

# Display local IP address
echo "Getting local IP address..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  IP=$(hostname -I | awk '{print $1}')
else
  # Other systems
  IP="localhost"
fi

echo "Local IP address: $IP"
echo "You can access the application using the following addresses:"
echo "- Local access: http://localhost:3000"
echo "- LAN access: http://$IP:3000"
echo ""

# Ensure thumbnail directory exists
echo "Ensuring thumbnail directory exists..."
mkdir -p public/thumbnails

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the application
echo "Starting application..."
npm run dev 