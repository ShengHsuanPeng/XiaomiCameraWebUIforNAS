/**
 * Utility functions for fetching data from backend API
 */

// Get data based on file path - using environment variables
const BASE_PATH = process.env.REACT_APP_BASE_PATH || '/xiaomi_camera_videos';

// Get API base URL
export const getApiBaseUrl = () => {
  // If in production environment, use relative path
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // Try to get from environment variables
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Use IP and port from environment variables, or default values if not set
  const apiHost = process.env.REACT_APP_API_HOST || '192.168.68.69';
  const apiPort = process.env.REACT_APP_API_PORT || '5001';
  
  return `http://${apiHost}:${apiPort}`;
};

const API_BASE_URL = getApiBaseUrl();

// Frontend cache for storing video duration information
const durationCache = new Map();

// Date format settings (consistent with backend config.js)
const dateFormat = {
  yearStart: 0,
  yearLength: 4,
  monthStart: 4,
  monthLength: 2,
  dayStart: 6,
  dayLength: 2,
  hourStart: 8,
  hourLength: 2
};

// Camera information cache
const cameraInfoCache = new Map();

// Get all cameras list
export const getCameras = async () => {
  try {
    console.log('Getting camera list, API URL:', `${API_BASE_URL}/api/cameras`);
    const response = await fetch(`${API_BASE_URL}/api/cameras`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    console.log('Retrieved camera list:', data);
    return data;
  } catch (error) {
    console.error('Failed to get camera list:', error);
    return [];
  }
};

// Get date list for specific camera
export const getCameraDates = async (cameraId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cameras/${cameraId}/dates`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to get date list for camera ${cameraId}:`, error);
    return [];
  }
};

// Get video list for specific camera and date
export const getDateVideos = async (cameraId, date) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cameras/${cameraId}/dates/${date}/videos`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to get video list for camera ${cameraId} date ${date}:`, error);
    return [];
  }
};

// Get duration for specific video
export const getVideoDuration = async (cameraId, date, videoId) => {
  // Create cache key
  const cacheKey = `${cameraId}_${date}_${videoId}`;
  
  // Check if already in cache
  if (durationCache.has(cacheKey)) {
    console.log(`Getting video duration from frontend cache: ${cacheKey}`);
    return durationCache.get(cacheKey);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/video-duration/${cameraId}/${date}/${videoId}`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    
    // Store in cache
    if (data.duration) {
      durationCache.set(cacheKey, data.duration);
    }
    
    return data.duration;
  } catch (error) {
    console.error(`Failed to get duration for video ${videoId}:`, error);
    return 'Unknown';
  }
};

// Trigger batch processing of video information (for processing large number of videos)
export const processVideos = async (cameraId, date) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/process-videos/${cameraId}/${date}`);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to trigger batch video processing:`, error);
    return { status: 'error', message: error.message };
  }
};

// Get video path
export const getVideoPath = (cameraId, date, videoName) => {
  // Ensure API_BASE_URL doesn't end with a slash
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  
  // BASE_PATH may contain local system absolute path, need to extract valid API path
  // For example: "/media/ext_hdd/share/xiaomi_camera_videos" should become "/xiaomi_camera_videos"
  let apiPath = "/xiaomi_camera_videos";
  
  // If BASE_PATH contains xiaomi_camera_videos, use it
  if (BASE_PATH.includes("xiaomi_camera_videos")) {
    apiPath = "/xiaomi_camera_videos";
  }
  
  return `${baseUrl}${apiPath}/${cameraId}/${date}/${videoName}`;
};

// Format timestamp to readable time
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Parse year, month, day, hour from date string
export const parseDateString = (dateStr) => {
  const year = dateStr.substring(dateFormat.yearStart, dateFormat.yearStart + dateFormat.yearLength);
  const month = dateStr.substring(dateFormat.monthStart, dateFormat.monthStart + dateFormat.monthLength);
  const day = dateStr.substring(dateFormat.dayStart, dateFormat.dayStart + dateFormat.dayLength);
  const hour = dateStr.substring(dateFormat.hourStart, dateFormat.hourStart + dateFormat.hourLength);
  
  return {
    year,
    month,
    day,
    hour,
    formatted: `${year}-${month}-${day} ${hour}:00`
  };
};

// Clear duration cache, for scenarios that require forced update
export const clearDurationCache = (cameraId = null, date = null) => {
  if (!cameraId && !date) {
    // Clear all cache
    durationCache.clear();
    console.log('Cleared all video duration cache');
    return;
  }
  
  if (cameraId && !date) {
    // Clear all cache for specific camera
    const keysToDelete = [];
    durationCache.forEach((value, key) => {
      if (key.startsWith(`${cameraId}_`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => durationCache.delete(key));
    console.log(`Cleared all video duration cache for camera ${cameraId}`);
    return;
  }
  
  if (cameraId && date) {
    // Clear all cache for specific camera and date
    const keysToDelete = [];
    durationCache.forEach((value, key) => {
      if (key.startsWith(`${cameraId}_${date}_`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => durationCache.delete(key));
    console.log(`Cleared all video duration cache for camera ${cameraId} date ${date}`);
    return;
  }
};

// Get camera name
export const getCameraName = async (cameraId) => {
  // First look in cache
  if (cameraInfoCache.has(cameraId)) {
    return cameraInfoCache.get(cameraId).name;
  }
  
  try {
    // Get all camera information
    const cameras = await getCameras();
    
    // Update cache
    cameras.forEach(camera => {
      cameraInfoCache.set(camera.id, camera);
    });
    
    // Find specific camera
    const camera = cameras.find(cam => cam.id === cameraId);
    return camera ? camera.name : cameraId;
  } catch (error) {
    console.error(`Failed to get name for camera ${cameraId}:`, error);
    return cameraId; // Return ID if failed
  }
};

// Synchronous version, directly returns if camera is already in local cache
export const getCameraNameSync = (cameraId) => {
  if (cameraInfoCache.has(cameraId)) {
    return cameraInfoCache.get(cameraId).name;
  }
  return cameraId; // Return ID if missing cache data
}; 