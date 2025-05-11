const path = require('path');
const os = require('os');

// 獲取本機 IP 地址
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳過非 IPv4 和內部 IP
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0'; // 如果找不到合適的 IP，使用 0.0.0.0 (所有網路介面)
};

module.exports = {
  // 伺服器設定
  server: {
    port: process.env.REACT_APP_API_PORT || 5001,
    host: process.env.REACT_APP_API_HOST  || getLocalIpAddress(), // 使用本機 IP 地址
    corsOrigins: ['http://localhost:3000', `http://${getLocalIpAddress()}:3000`], // 允許的來源
  },
  
  // 影片檔案的基礎路徑
  paths: {
    videos: process.env.VIDEO_BASE_PATH || path.join(__dirname, 'xiaomi_camera_videos'),
    // 如果需要指定其他路徑，可以在這裡添加
  },
  
  // 相機 ID 到名稱的映射
  cameras: {
    // 格式: 'cameraId': '相機名稱'
    '607ea43c610c': '客廳相機',
    '04cf8cce9d4e': '門口相機',
    // 可以根據需要添加更多相機
  },
  
  // 日期格式設定
  dateFormat: {
    // 用於解析和格式化日期的設定
    yearStart: 0,  // 年份在日期字符串中的起始位置
    yearLength: 4, // 年份的長度
    monthStart: 4, // 月份在日期字符串中的起始位置
    monthLength: 2, // 月份的長度
    dayStart: 6,   // 日在日期字符串中的起始位置
    dayLength: 2,  // 日的長度
    hourStart: 8,  // 小時在日期字符串中的起始位置
    hourLength: 2, // 小時的長度
  },
  
  // 前端設定
  client: {
    // 用於前端的 API 基礎 URL
    apiBaseUrl: process.env.NODE_ENV === 'production' 
      ? '' // 生產環境使用相對路徑
      : process.env.REACT_APP_API_BASE_URL || `http://${getLocalIpAddress()}:5001` // 開發環境使用完整 URL
  }
}; 