# Build Instructions

## Prerequisites

- **Bun** 1.0 or later
- **go2rtc** (for WebRTC functionality)
- **Docker** (optional, for containerized deployment)

## Development Build

```bash
# Install dependencies
bun install

# Run in development mode with hot reload
bun run dev

# The server will start on http://localhost:3000
```

## Production Builds

### Linux Binary

```bash
# Build standalone Linux executable
bun run build:linux

# Output: dist/annke-to-alexa-linux
# Run it:
./dist/annke-to-alexa-linux
```

### Windows Executable

```bash
# Build standalone Windows .exe
bun run build:windows

# Output: dist/annke-to-alexa.exe
# Transfer to Windows machine and run
```

### Build All Platforms

```bash
# Build both Linux and Windows binaries
bun run build:all

# Outputs:
# - dist/annke-to-alexa-linux
# - dist/annke-to-alexa.exe
```

## Docker Build

```bash
# Build Docker image
docker build -t annke-to-alexa .

# Run container
docker run -p 3000:3000 -p 1984:1984 -p 8554:8554 -p 8555:8555 annke-to-alexa

# Or use Docker Compose
docker-compose up -d
```

## Binary Distribution

The standalone binaries include:
- ✅ All Node.js dependencies bundled
- ✅ TypeScript compiled to native code
- ✅ No need for Node.js/Bun on target machine
- ✅ Single executable file

### Linux Binary Requirements
- glibc 2.31+ (Ubuntu 20.04+, Debian 11+)
- No additional dependencies

### Windows Binary Requirements
- Windows 10/11 or Windows Server 2019+
- No additional dependencies

## go2rtc Installation

The standalone binaries require go2rtc to be installed separately:

### Linux
```bash
wget -O /usr/local/bin/go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64
chmod +x /usr/local/bin/go2rtc
```

### Windows
Download from: https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_win64.exe

Place in the same directory as the executable or add to PATH.

## Configuration

On first run, access the web dashboard at `http://localhost:3000/dashboard` to complete the interactive setup wizard.

Configuration is saved to:
- Linux: `./data/config.json`
- Windows: `.\data\config.json`
- Docker: `/app/data/config.json` (mount as volume for persistence)

## Deployment

### Raspberry Pi (Recommended)

```bash
# Transfer the Linux binary
scp dist/annke-to-alexa-linux pi@raspberrypi.local:~/

# SSH into Pi
ssh pi@raspberrypi.local

# Install go2rtc
wget -O /usr/local/bin/go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_arm64
sudo chmod +x /usr/local/bin/go2rtc

# Run the application
chmod +x annke-to-alexa-linux
./annke-to-alexa-linux
```

### Systemd Service (Linux)

Create `/etc/systemd/system/annke-to-alexa.service`:

```ini
[Unit]
Description=Annke to Alexa Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/home/pi/annke-to-alexa-linux
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable annke-to-alexa
sudo systemctl start annke-to-alexa
sudo systemctl status annke-to-alexa
```

## Troubleshooting Build Issues

### Bun not found
```bash
curl -fsSL https://bun.sh/install | bash
```

### Build fails on Windows
Use WSL2 or cross-compile from Linux:
```bash
bun build src/index.ts --compile --target=bun-windows-x64 --outfile dist/annke-to-alexa.exe
```

### Binary too large
The binary includes all dependencies. Typical size: 50-80MB. This is normal for standalone executables.
