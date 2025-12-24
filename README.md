# Annke-to-Alexa Monolith Application

A unified **Bun/Node.js** application that consolidates DVR discovery, RTSP→WebRTC conversion, JWT authentication, Alexa integration, and an interactive web dashboard into a **single deployable unit**.

Perfect for integrating Annke DVR cameras with Amazon Alexa Echo Show devices.

---

## ✨ Features

- 🎥 **Auto-Discovery**: ONVIF discovery + Annke DVR channel probing
- 💾 **Camera Persistence**: Cameras are saved and restored on restart
- 🌐 **WebRTC Streaming**: RTSP to WebRTC conversion via go2rtc
- 🔐 **JWT Authentication**: Short-lived tokens (60s) for secure streaming
- 🗣️ **Alexa Integration**: Full Alexa Smart Home + RTCSessionController
- 📱 **Interactive Setup Wizard**: No env files needed - configure via web UI
- 🐳 **Docker Ready**: Single container deployment
- 📦 **Standalone Binaries**: Compile to `.exe` (Windows) or Linux executable
- 🎨 **Modern Dashboard**: React + Vite with dark theme

---

## 🚀 Quick Start

### One-Line Install (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/Annke-to-alexa/main/install.sh | bash
```

### Manual Installation

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone https://github.com/yourusername/Annke-to-alexa.git
cd Annke-to-alexa
bun install

# Build dashboard
cd dashboard && bun install && bun run build && cd ..

# Start server
bun run dev
```

Visit **http://localhost:3000** for the interactive setup wizard.

---

## 📦 Deployment Options

### Docker (Recommended)

```bash
docker-compose up -d
```

### Standalone Binary

```bash
# Build for your platform
bun run build:linux    # Linux
bun run build:windows  # Windows
bun run build:all      # Both

# Run
./dist/annke-to-alexa-linux
```

### Raspberry Pi

```bash
# Transfer binary
scp dist/annke-to-alexa-linux pi@raspberrypi.local:~/

# Install go2rtc on Pi
ssh pi@raspberrypi.local
wget -O /usr/local/bin/go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_arm64
sudo chmod +x /usr/local/bin/go2rtc

# Run
./annke-to-alexa-linux
```

---

## 🎯 Interactive Setup Wizard

The application features a **4-step setup wizard** (no env files required):

1. **DVR Configuration**: Username, password, IP, RTSP port
2. **WebRTC Settings**: STUN/TURN servers
3. **Discovery Options**: Auto-discovery interval, max cameras
4. **Alexa Integration**: Client ID, secret, redirect URI (optional)

Configuration is saved to `data/config.json` and persists across restarts.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Bun/Node.js App                      │
├─────────────────────────────────────────────────────────┤
│  Express API  │  WebSocket  │  go2rtc  │  ONVIF        │
│  JWT Auth     │  Signaling  │  Process │  Discovery    │
│  React UI     │  Config API │  WebRTC  │  RTSP Probe   │
└─────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    Dashboard      Alexa Echo      DVR/Cameras
                     Show           (RTSP)
```

---

## 📡 API Endpoints

### Cameras
- `GET /api/cameras` - List all cameras
- `GET /api/cameras/:id` - Get camera details
- `POST /api/discover` - Trigger discovery
- `POST /api/cameras` - Add camera manually
- `DELETE /api/cameras/:id` - Remove camera

### WebRTC
- `GET /api/token?cameraId=xxx` - Generate JWT token
- `GET /api/ice-servers` - Get STUN/TURN config
- `GET /api/status` - Service health

### Configuration
- `GET /api/config` - Get current config (sanitized)
- `POST /api/config` - Save configuration
- `GET /api/config/setup-status` - Check if setup completed

### Alexa
- `POST /alexa/discovery` - Device discovery
- `POST /alexa/rtc-session` - WebRTC session init
- `POST /alexa/rtc-session/disconnect` - Session cleanup

---

## 🔌 WebSocket Signaling

Connect to `ws://localhost:3000?token=YOUR_JWT_TOKEN`

```javascript
const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

ws.send(JSON.stringify({
  type: 'offer',
  cameraId: 'camera-id',
  payload: { type: 'offer', sdp: 'your-sdp' }
}));

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'answer') {
    // Handle SDP answer
  }
};
```

---

## 🗣️ Alexa Setup

1. Create Alexa Smart Home skill in [Amazon Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Set endpoint to your public URL (via Cloudflare Tunnel) + `/alexa`
3. Enable RTCSessionController capability
4. Configure OAuth 2.0 account linking
5. Discover devices in Alexa app
6. Say: **"Alexa, show [camera name]"** on Echo Show

---

## ☁️ Cloudflare Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Create tunnel
./cloudflared tunnel create annke-alexa
./cloudflared tunnel route dns annke-alexa your-domain.com

# Run tunnel
./cloudflared tunnel run annke-alexa
```

Or use Docker Compose with `CLOUDFLARE_TUNNEL_TOKEN`.

---

## 🛠️ Development

```bash
# Install dependencies
bun install
cd dashboard && bun install && cd ..

# Run in watch mode
bun run dev

# Build dashboard
cd dashboard && bun run build

# Build binaries
bun run build:all
```

---

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Detailed setup guide
- [BUILD.md](BUILD.md) - Build instructions
- [CAMERA_PERSISTENCE.md](CAMERA_PERSISTENCE.md) - Camera storage details
- [API Documentation](#-api-endpoints) - See above

---

## 🐛 Troubleshooting

### No Cameras Found
- Ensure same network as DVR
- Enable ONVIF on DVR
- Check firewall (ports 554, 3702)

### WebRTC Issues
- Configure TURN server for NAT
- Verify STUN/TURN accessibility
- Check go2rtc is running

### Dashboard Not Loading
- Build dashboard: `cd dashboard && bun run build`
- Check `public/` directory exists

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- [go2rtc](https://github.com/AlexxIT/go2rtc) - WebRTC streaming
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [node-onvif-ts](https://github.com/futomi/node-onvif-ts) - ONVIF discovery

---

**Made with ❤️ for the smart home community**
