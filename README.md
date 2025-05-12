# Xiaomi Camera Video Preview System

A web application for previewing Xiaomi camera videos backed up to NAS. This application dynamically reads video files from the file system and provides browsing and playback functionality.

## Features

- Browse multiple camera monitors
- View recordings by date and time
- Play videos online
- Video thumbnail preview to help quickly identify video content
- Support for both grid and table view modes
- Responsive design suitable for various devices
  - On desktop devices, the sidebar is displayed on the left
  - On mobile and small screen devices, the sidebar is displayed at the top and can be collapsed
- Dynamically read video data from the file system
- Manage camera names and system settings through configuration files
- Generate thumbnails in real-time and display processing progress
- Provide real-time updates on processing status via Socket.io

## File Structure

Xiaomi camera video file structure:
```
xiaomi_camera_videos/cameraID/YYYYMMDDHH/xxMxxS_timestamp.mp4
```

Where:
- cameraID: The unique identifier of the camera
- YYYYMMDDHH: Year, month, day, hour (e.g., 2025051114 means May 11, 2025, 14:00)
- xxMxxS: Video start time (minutes and seconds, e.g., 55M55S means 55 minutes 55 seconds)
- timestamp: Unix timestamp

Example:
```
xiaomi_camera_videos/607ea43c610c/2025051114/55M55S_1746946555.mp4
```

## Installation and Running

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- FFmpeg (must be installed on the system and added to the PATH environment variable)

#### FFmpeg Installation Guide

FFmpeg is a required system dependency for generating thumbnails and processing videos:

**Windows:**
1. Using Chocolatey (recommended):
   ```
   choco install ffmpeg
   ```
2. Or download from the official website: [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
   - After downloading, extract to any directory, such as `C:\ffmpeg`
   - Add `C:\ffmpeg\bin` to the system PATH environment variable

**macOS:**
```
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```
sudo apt update
sudo apt install ffmpeg
```

**Verify Installation:**
After installation, run the following command in the command line to confirm successful installation:
```
ffmpeg -version
```

If you see version information, the installation was successful. If not, please ensure the FFmpeg bin directory has been added to the system PATH.

### Installation Steps

1. Clone this project to your local machine
   ```
   git clone <repository-url>
   ```

2. Enter the project directory
   ```
   cd xiaomi-camera-ui
   ```

3. Install dependencies
   ```
   npm install
   ```

4. Start development mode (runs both frontend and backend)
   ```
   npm run dev
   ```

5. Open a browser and visit http://localhost:3000

### Run Backend Server Only
```
npm run server
```

### Run Frontend Development Server Only
```
npm start
```

## Deployment to Production Environment

1. Build production version
   ```
   npm run build
   ```

2. Run production server
   ```
   npm run server
   ```

3. Visit http://[your-server-IP]:5001

### Using start.sh Script

The project provides a convenient startup script that can automatically set environment variables and start the service:

```
chmod +x start.sh  # Grant execution permissions
./start.sh         # Execute the script
```

## Environment Variable Configuration

The system supports configuring various parameters through environment variables. You can create a `.env` file or set these variables directly in the system:

```
# Server settings
REACT_APP_API_PORT=5001        # Server port
REACT_APP_API_HOST=192.168.1.2 # Server host IP (auto-detect by default)

# Video file path
# REACT_APP_BASE_PATH=/path/to/xiaomi_camera_videos  # Base path for video files

# Camera name configuration (format: "cameraID:name,cameraID:name")
CAMERA_NAMES="607ea43c610c:一樓車庫,04cf8cce9d4e:二樓陽台"

# API base URL (for development environment only)
REACT_APP_API_BASE_URL=http://192.168.1.2:5001
```

## Configuration Description

The system uses the `config.js` file for configuration. You can modify settings as needed. This file automatically reads environment variables, prioritizing settings from environment variables if they exist, otherwise using default values.

Main configuration items include:

### Server Settings
```javascript
server: {
  port: process.env.REACT_APP_API_PORT || 5001, // Server port
  host: process.env.REACT_APP_API_HOST || getLocalIpAddress(), // Server host
  corsOrigins: ['http://localhost:3000', `http://${getLocalIpAddress()}:3000`], // CORS configuration
}
```

### Video File Path
```javascript
paths: {
  videos: process.env.REACT_APP_BASE_PATH || path.join(__dirname, 'xiaomi_camera_videos'),
}
```

### Camera Name Mapping
Camera names can be configured through the `CAMERA_NAMES` environment variable in the format `"cameraID:name,cameraID:name"`. If not configured, the system uses default values:
```javascript
cameras: {
  '607ea43c610c': '一樓車庫',
  '04cf8cce9d4e': '二樓陽台',
}
```

## System Architecture

- Frontend: React.js + React Router + Styled Components
- Backend: Express.js + Socket.io
- Data Source: Directly read video files from the file system
- Thumbnails: Automatically generated and cached using ffmpeg
- Real-time Communication: Using Socket.io to provide real-time updates on thumbnail generation progress

## Technology Stack

- React.js
- React Router
- Styled Components
- Express.js
- Socket.io
- HTML5 Video API
- fluent-ffmpeg (for getting video duration and generating thumbnails)
- @ffprobe-installer/ffprobe (for automatically installing ffprobe)

## Thumbnail Functionality

The system automatically generates thumbnails for videos to help users quickly identify video content:

- Thumbnails are generated on first visit to the video and cached in the `public/thumbnails` directory
- Supports two viewing modes: Grid view (showing large thumbnails) and Table view (showing small thumbnails and detailed information)
- On the video playback page, the thumbnail is displayed first, and the video starts playing when clicked
- Thumbnail generation progress is displayed in real-time via Socket.io
- Thumbnail size is 320x180 pixels (16:9 aspect ratio)

## License

MIT 

## Icon Attribution

[Video call icons](https://www.flaticon.com/free-icons/video-call) created by Md Tanvirul Haque - [Flaticon](https://www.flaticon.com/)
