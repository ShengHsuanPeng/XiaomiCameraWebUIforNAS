const path = require('path');
const os = require('os');

// Get local IP address
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip non-IPv4 and internal IPs
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0'; // If no suitable IP is found, use 0.0.0.0 (all network interfaces)
};

// Parse camera names from environment variables
// Format: CAMERA_NAMES="cameraId1:name1,cameraId2:name2"
const parseCameraNames = () => {
  const cameraEnv = process.env.CAMERA_NAMES || '';
  const cameras = {};
  
  if (cameraEnv) {
    cameraEnv.split(',').forEach(pair => {
      const [id, name] = pair.split(':');
      if (id && name) {
        cameras[id.trim()] = name.trim();
      }
    });
  }
  
  // If no configuration in environment variables, use default values
  if (Object.keys(cameras).length === 0) {
    cameras['607ea43c610c'] = '一樓車庫';
    cameras['04cf8cce9d4e'] = '二樓陽台';
  }
  
  return cameras;
};

// Function to get camera name, returns ID if mapping fails
const getCameraName = (cameraId) => {
  const cameras = parseCameraNames();
  return cameras[cameraId] || cameraId;
};

module.exports = {
  // Server settings
  server: {
    port: process.env.REACT_APP_API_PORT || 5001,
    host: process.env.REACT_APP_API_HOST  || getLocalIpAddress(), // Use local IP address
    corsOrigins: ['http://localhost:3000', `http://${getLocalIpAddress()}:3000`], // Allowed origins
  },
  
  // Base path for video files
  paths: {
    videos: process.env.REACT_APP_BASE_PATH || path.join(__dirname, 'xiaomi_camera_videos'),
    // If need to specify other paths, can add here
  },
  
  // Camera ID to name mapping
  cameras: parseCameraNames(),
  
  // Helper function to get camera name
  getCameraName,
  
  // Date format settings
  dateFormat: {
    // Settings for parsing and formatting dates
    yearStart: 0,  // Starting position of year in date string
    yearLength: 4, // Length of year
    monthStart: 4, // Starting position of month in date string
    monthLength: 2, // Length of month
    dayStart: 6,   // Starting position of day in date string
    dayLength: 2,  // Length of day
    hourStart: 8,  // Starting position of hour in date string
    hourLength: 2, // Length of hour
  },
  
  // Frontend settings
  client: {
    // API base URL for frontend
    apiBaseUrl: process.env.NODE_ENV === 'production' 
      ? '' // Production environment uses relative path
      : process.env.REACT_APP_API_BASE_URL || `http://${getLocalIpAddress()}:5001` // Development environment uses full URL
  }
}; 