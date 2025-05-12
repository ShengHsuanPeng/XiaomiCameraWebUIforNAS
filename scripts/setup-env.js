const fs = require('fs');
const path = require('path');
const os = require('os');

// Get local IP address (same logic as in config.js)
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
  return '192.168.68.69'; // If no suitable IP is found, use default value
};

// Check and create .env file
const setupEnvFile = () => {
  const envDevPath = path.join(__dirname, '..', '.env');
  
  // Check if file exists
  if (!fs.existsSync(envDevPath)) {
    console.log('.env does not exist, creating...');
    
    // Get local IP address
    const localIp = getLocalIpAddress();
    console.log(`Detected local IP address: ${localIp}`);
    
    // Prepare environment variable content
    const envContent = `# API configuration (auto-generated on ${new Date().toISOString()})
REACT_APP_API_HOST=${localIp}
REACT_APP_API_PORT=5001

# Or directly set complete API base URL
# REACT_APP_API_BASE_URL=http://${localIp}:5001

# Base path setting
REACT_APP_BASE_PATH=./xiaomi_camera_videos

# Camera name mapping
CAMERA_NAMES=607ea43c610c:一樓車庫,04cf8cce9d4e:二樓陽台
`;
    
    // Write to file
    fs.writeFileSync(envDevPath, envContent);
    console.log(`✅ Created .env and set API Host to ${localIp}`);
  } else {
    console.log('.env already exists, skipping creation step');
  }
};

// Execute script
setupEnvFile(); 