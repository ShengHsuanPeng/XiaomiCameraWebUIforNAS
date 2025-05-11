/**
 * 從後端 API 獲取數據的工具函數
 */

// 基於文件路徑獲取數據
const BASE_PATH = '/xiaomi_camera_videos';

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
  
  // 使用固定的後端 IP 地址，確保無論從哪裡訪問前端都能連接到正確的後端
  // 注意：請將此處的 IP 地址替換為您的後端伺服器實際 IP 地址
  return 'http://192.168.68.69:5001';
  
  // 舊的方式（根據前端 hostname 決定）可能導致連接問題
  // return window.location.hostname === 'localhost' 
  //   ? 'http://localhost:5001' 
  //   : `http://${window.location.hostname}:5001`;
};

const API_BASE_URL = getApiBaseUrl();

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