#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Annke to Alexa Bridge Starter ===${NC}"

# Check for cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}Error: cloudflared is not installed.${NC}"
    echo "Please install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

# Check for go2rtc
if ! command -v go2rtc &> /dev/null; then
    echo -e "${RED}Error: go2rtc is not installed or not in PATH.${NC}"
    echo "Please install it or put the binary in the current folder and add to PATH."
    exit 1
fi

# Ask for Tunnel Token if not in Env
if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
    echo -e "${BLUE}Enter your Cloudflare Tunnel Token:${NC}"
    read -r -s TOKEN
    export CLOUDFLARE_TUNNEL_TOKEN=$TOKEN
else
    echo -e "${GREEN}Using Tunnel Token from environment.${NC}"
fi

# Kill existing go2rtc if running
echo "Cleaning up..."
pkill go2rtc || true

# Start go2rtc in background
echo -e "${GREEN}Starting go2rtc...${NC}"
# config file assumed in current dir or default
go2rtc -config go2rtc.yaml > /dev/null 2>&1 &
GO2RTC_PID=$!

# Wait for go2rtc
sleep 2

# Start Backend Server
echo -e "${GREEN}Starting Bridge Server...${NC}"
# Assuming bun is installed and we are in project root
export PORT=3000
export GO2RTC_ENABLED=true
export GO2RTC_API=http://localhost:1984

# Start Cloudflare Tunnel
echo -e "${GREEN}Starting Cloudflare Tunnel...${NC}"
cloudflared tunnel run --token $CLOUDFLARE_TUNNEL_TOKEN > cloudflared.log 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel to stabilize
sleep 5

# Check for bun
if ! command -v bun &> /dev/null; then
    echo -e "${BLUE}Installing bun...${NC}"
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Start App
# We use bun run dev for now, but in prod maybe 'bun run start'
# We'll run it in foreground to keep script alive
echo -e "${GREEN}Starting Application...${NC}"
bun run dev &
APP_PID=$!

# Cleanup function
cleanup() {
    echo -e "${BLUE}Shutting down...${NC}"
    kill $GO2RTC_PID
    kill $TUNNEL_PID
    kill $APP_PID
    exit
}

trap cleanup SIGINT SIGTERM

# Wait
wait $APP_PID
