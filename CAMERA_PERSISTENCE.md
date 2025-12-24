# Camera Persistence

## Overview

The Annke-to-Alexa application now includes persistent storage for cameras. This means that cameras you add manually or discover will be saved and automatically restored when you restart the application.

## How It Works

### Storage Location
Cameras are stored in a JSON file located at:
```
data/cameras.json
```

This file is automatically created when you add your first camera and is updated whenever:
- A camera is manually added
- A camera is removed
- New cameras are discovered

### What Gets Saved

Each camera entry includes:
- **id**: Unique identifier
- **name**: Camera name
- **rtspUrl**: RTSP stream URL
- **ip**: Camera IP address
- **port**: RTSP port (usually 554)
- **channel**: Channel number
- **status**: Current status (online/offline/unknown)
- **lastSeen**: Last time the camera was detected
- **manufacturer**: Camera manufacturer (if detected)
- **model**: Camera model (if detected)
- **capabilities**: List of camera capabilities (if detected)

### Automatic Loading

When the application starts:
1. The DiscoveryService loads all saved cameras from `data/cameras.json`
2. Cameras are immediately available in the dashboard
3. The discovery service can still find new cameras and add them

### Manual Backup

Since the `data/` directory is gitignored, you may want to manually back up your `cameras.json` file if you have many manually configured cameras.

## Implementation Details

### StorageService
Located at `src/services/storage.ts`, this service handles:
- Loading cameras from disk on startup
- Saving cameras whenever they change
- Creating the data directory if it doesn't exist
- Handling errors gracefully

### DiscoveryService Integration
The DiscoveryService (`src/services/discovery.ts`) now:
- Loads cameras from storage on initialization
- Saves cameras after discovery completes
- Saves cameras when manually added
- Saves cameras when removed

## Privacy & Security

The `cameras.json` file may contain sensitive information like:
- IP addresses of your cameras
- RTSP URLs (which may include credentials)

**Important**: The `data/` directory is already in `.gitignore`, so this file won't be committed to version control. Keep this file secure and don't share it publicly.
