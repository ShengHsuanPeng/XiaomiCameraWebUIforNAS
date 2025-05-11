/**
 * 從後端 API 獲取數據的工具函數
 */

// 基於文件路徑獲取數據 - 使用環境變數
const BASE_PATH = process.env.REACT_APP_BASE_PATH || '/xiaomi_camera_videos';

// 獲取 API 基礎 URL
const getApiBaseUrl = () => {
  // 如果在生產環境，使用相對路徑
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // 嘗試從環境變數獲取
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // 使用環境變數中的 IP 和端口，如果未設置則使用默認值
  const apiHost = process.env.REACT_APP_API_HOST || '192.168.68.69';
  const apiPort = process.env.REACT_APP_API_PORT || '5001';
  
  return `http://${apiHost}:${apiPort}`;
  
  // 舊的方式（根據前端 hostname 決定）可能導致連接問題
  // return window.location.hostname === 'localhost' 
  //   ? 'http://localhost:5001' 
  //   : `http://${window.location.hostname}:5001`;
};

const API_BASE_URL = getApiBaseUrl();

// 前端快取，用於緩存影片時長資訊
const durationCache = new Map();

// 日期格式設定 (與後端 config.js 保持一致)
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

// 獲取所有相機列表
export const getCameras = async () => {
  try {
    console.log('正在獲取相機列表，API URL:', `${API_BASE_URL}/api/cameras`);
    const response = await fetch(`${API_BASE_URL}/api/cameras`);
    if (!response.ok) {
      throw new Error(`HTTP 錯誤: ${response.status}`);
    }
    const data = await response.json();
    console.log('獲取到的相機列表:', data);
    return data;
  } catch (error) {
    console.error('獲取相機列表失敗:', error);
    return [];
  }
};

// 獲取特定相機的日期列表
export const getCameraDates = async (cameraId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cameras/${cameraId}/dates`);
    if (!response.ok) {
      throw new Error(`HTTP 錯誤: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`獲取相機 ${cameraId} 的日期列表失敗:`, error);
    return [];
  }
};

// 獲取特定相機和日期的影片列表
export const getDateVideos = async (cameraId, date) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cameras/${cameraId}/dates/${date}/videos`);
    if (!response.ok) {
      throw new Error(`HTTP 錯誤: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`獲取相機 ${cameraId} 日期 ${date} 的影片列表失敗:`, error);
    return [];
  }
};

// 獲取特定影片的時長
export const getVideoDuration = async (cameraId, date, videoId) => {
  // 建立快取鍵
  const cacheKey = `${cameraId}_${date}_${videoId}`;
  
  // 檢查是否已經在快取中
  if (durationCache.has(cacheKey)) {
    console.log(`從前端快取中獲取影片時長: ${cacheKey}`);
    return durationCache.get(cacheKey);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/video-duration/${cameraId}/${date}/${videoId}`);
    if (!response.ok) {
      throw new Error(`HTTP 錯誤: ${response.status}`);
    }
    const data = await response.json();
    
    // 存入快取
    if (data.duration) {
      durationCache.set(cacheKey, data.duration);
    }
    
    return data.duration;
  } catch (error) {
    console.error(`獲取影片 ${videoId} 的時長失敗:`, error);
    return '未知';
  }
};

// 觸發批量處理影片資訊 (用於大量影片處理)
export const processVideos = async (cameraId, date) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/process-videos/${cameraId}/${date}`);
    if (!response.ok) {
      throw new Error(`HTTP 錯誤: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`觸發批量處理影片失敗:`, error);
    return { status: 'error', message: error.message };
  }
};

// 獲取影片路徑
export const getVideoPath = (cameraId, date, videoName) => {
  return `${API_BASE_URL}${BASE_PATH}/${cameraId}/${date}/${videoName}`;
};

// 格式化時間戳記為可讀時間
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

// 從日期字符串解析年月日時
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

// 清除時長快取，用於需要強制更新的場景
export const clearDurationCache = (cameraId = null, date = null) => {
  if (!cameraId && !date) {
    // 清除所有快取
    durationCache.clear();
    console.log('已清除所有影片時長快取');
    return;
  }
  
  if (cameraId && !date) {
    // 清除特定相機的所有快取
    const keysToDelete = [];
    durationCache.forEach((value, key) => {
      if (key.startsWith(`${cameraId}_`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => durationCache.delete(key));
    console.log(`已清除相機 ${cameraId} 的所有影片時長快取`);
    return;
  }
  
  if (cameraId && date) {
    // 清除特定相機和日期的所有快取
    const keysToDelete = [];
    durationCache.forEach((value, key) => {
      if (key.startsWith(`${cameraId}_${date}_`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => durationCache.delete(key));
    console.log(`已清除相機 ${cameraId} 日期 ${date} 的所有影片時長快取`);
    return;
  }
};

// 導出 API 基礎 URL，方便其他模組使用
export { getApiBaseUrl }; 