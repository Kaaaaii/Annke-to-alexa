# Quick Start Guide

## Installation

### Option 1: Using Bun (Development)

```bash
# Install Bun if not already installed
curl -fsSL https://bun.sh/install | bash

# Clone the repository
git clone https://github.com/yourusername/Annke-to-alexa.git
cd Annke-to-alexa

# Install server dependencies
bun install

# Install dashboard dependencies
cd dashboard
bun install
cd ..

# Build the dashboard
cd dashboard && bun run build && cd ..

# Start the server
bun run dev
```

Visit `http://localhost:3000` to access the interactive setup wizard.

### Option 2: Using Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/Annke-to-alexa.git
cd Annke-to-alexa

# Build and run with Docker Compose
docker-compose up -d

# View logs
docker logs -f annke-to-alexa
```

Visit `http://localhost:3000` for the setup wizard.

### Option 3: Standalone Binary

```bash
# Download the latest release for your platform
# Linux:
wget https://github.com/yourusername/Annke-to-alexa/releases/latest/download/annke-to-alexa-linux
chmod +x annke-to-alexa-linux

# Windows:
# Download annke-to-alexa.exe from releases

# Install go2rtc (required)
# Linux:
wget -O /usr/local/bin/go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64
chmod +x /usr/local/bin/go2rtc

# Run the application
./annke-to-alexa-linux
```

## Initial Setup

1. **Access the Dashboard**: Open `http://localhost:3000` in your browser

2. **Step 1 - DVR Configuration**:
   - Enter your DVR username (default: `admin`)
   - Enter your DVR password (required)
   - Optionally enter DVR IP address (leave blank for auto-discovery)
   - Set RTSP port (default: 554)

3. **Step 2 - WebRTC Configuration**:
   - STUN server is pre-configured (Google's public STUN)
   - Optionally configure TURN server for NAT traversal
   - Add TURN credentials if using a TURN server

4. **Step 3 - Camera Discovery**:
   - Enable/disable automatic discovery
   - Set discovery interval (how often to scan for cameras)
   - Set maximum number of cameras to detect

5. **Step 4 - Alexa Integration** (Optional):
   - Enter Alexa Client ID from Amazon Developer Console
   - Enter Alexa Client Secret
   - Set redirect URI (your public URL + `/auth/alexa/callback`)
   - Skip this step if not using Alexa integration

6. **Complete Setup**: Click "Complete Setup" to save configuration

## Using the Dashboard

### Camera Discovery

- Click "Discover Cameras" to scan your network
- Cameras will appear as cards showing:
  - Camera name and status
  - IP address and port
  - Manufacturer and model
  - Live preview option

### Viewing Camera Streams

1. Click "View Stream" on any camera card
2. A JWT token will be generated (valid for 60 seconds)
3. Use the WebSocket endpoint to connect and stream

### WebSocket Streaming

```javascript
const token = 'your-jwt-token';
const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

ws.onopen = () => {
  // Send WebRTC offer
  ws.send(JSON.stringify({
    type: 'offer',
    cameraId: 'camera-id',
    payload: { type: 'offer', sdp: 'your-sdp-offer' }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'answer') {
    // Handle WebRTC answer
    console.log('Received SDP answer:', message.payload.sdp);
  }
};
```

## Alexa Integration

### Prerequisites

1. **Cloudflare Tunnel**: Set up a tunnel to expose your local server
   ```bash
   cloudflared tunnel create annke-alexa
   cloudflared tunnel route dns annke-alexa your-domain.com
   cloudflared tunnel run annke-alexa
   ```

2. **Alexa Smart Home Skill**: Create a skill in Amazon Developer Console
   - Set endpoint to your Cloudflare URL + `/alexa`
   - Configure OAuth 2.0 account linking
   - Enable RTCSessionController capability

### Using with Echo Show

1. Enable the skill in the Alexa app
2. Link your account
3. Discover devices: "Alexa, discover devices"
4. View cameras: "Alexa, show [camera name]"

## API Usage

### Get All Cameras
```bash
curl http://localhost:3000/api/cameras
```

### Trigger Discovery
```bash
curl -X POST http://localhost:3000/api/discover
```

### Get JWT Token
```bash
curl "http://localhost:3000/api/token?cameraId=camera-id-here"
```

### Get System Status
```bash
curl http://localhost:3000/api/status
```

## Troubleshooting

### No Cameras Found
- Ensure your Raspberry Pi is on the same network as the DVR
- Check that ONVIF is enabled on your DVR
- Try manual discovery by entering DVR IP in setup
- Check firewall settings (ports 554, 3702)

### WebRTC Connection Issues
- Configure a TURN server if behind NAT
- Verify STUN/TURN servers are accessible
- Check that go2rtc is running (`ps aux | grep go2rtc`)

### Dashboard Not Loading
- Build the dashboard: `cd dashboard && bun run build`
- Check that `public/` directory exists with built files
- Verify server is running on port 3000

### Token Expired Errors
- Tokens expire after 60 seconds by default
- Request a new token before streaming
- Adjust `JWT_EXPIRY` in config if needed

## Building from Source

```bash
# Build server for Linux
bun run build:linux

# Build server for Windows
bun run build:windows

# Build both
bun run build:all

# Build dashboard
cd dashboard && bun run build
```

## Next Steps

- Configure Cloudflare Tunnel for remote access
- Set up Alexa Smart Home skill
- Add additional cameras manually if needed
- Configure TURN server for better connectivity
- Set up systemd service for auto-start (Linux)

For more detailed information, see [README.md](README.md) and [BUILD.md](BUILD.md).
