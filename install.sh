#!/bin/bash

# Annke-to-Alexa Installation Script
# This script installs and sets up the Annke-to-Alexa application

set -e

echo "🎥 Annke-to-Alexa Installation Script"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Please do not run this script as root"
  exit 1
fi

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected OS: $OS"
echo "Detected Architecture: $ARCH"
echo ""

# Install required system dependencies
if [ "$OS" = "Linux" ]; then
  if ! command -v unzip &> /dev/null; then
    echo "📦 Installing unzip (required for Bun)..."
    sudo apt-get update
    sudo apt-get install -y unzip
  fi
fi

# Install Bun if not present
if ! command -v bun &> /dev/null; then
  echo "📦 Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
else
  echo "✅ Bun is already installed"
fi

# Install FFmpeg if not present
if ! command -v ffmpeg &> /dev/null; then
  echo "📦 Installing FFmpeg..."
  
  if [ "$OS" = "Linux" ]; then
    sudo apt-get update
    sudo apt-get install -y ffmpeg
    echo "✅ FFmpeg installed"
  else
    echo "⚠️  Please install FFmpeg manually: https://ffmpeg.org/download.html"
  fi
else
  echo "✅ FFmpeg is already installed"
fi

# Install dependencies
echo ""
echo "📦 Installing server dependencies..."
bun install

echo "📦 Installing dashboard dependencies..."
cd dashboard
bun install
cd ..

# Build dashboard
echo ""
echo "🔨 Building dashboard..."
cd dashboard
bun run build
cd ..

# Create data directory
mkdir -p data

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo ""
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✅ Created .env file. Please edit it with your DVR credentials."
fi

# Create systemd service (optional)
read -p "Would you like to install a systemd service? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  SERVICE_FILE="/etc/systemd/system/annke-to-alexa.service"
  
  echo "Creating systemd service..."
  sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Annke to Alexa Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which bun) run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable annke-to-alexa
  
  echo "✅ Systemd service installed"
  echo "   Start with: sudo systemctl start annke-to-alexa"
  echo "   View logs: sudo journalctl -u annke-to-alexa -f"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your DVR credentials (or use the web setup wizard)"
echo "2. Start the server: bun run dev"
echo "3. Open http://localhost:3000 in your browser"
echo "4. Complete the interactive setup wizard"
echo ""
echo "For production deployment, see BUILD.md"
echo ""
