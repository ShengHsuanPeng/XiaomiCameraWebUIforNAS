const fs = require('fs');
const path = require('path');
const os = require('os');

// 獲取本機 IP 地址（與config.js中相同邏輯）
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
  return '192.168.68.69'; // 如果找不到合適的 IP，使用默認值
};

// 檢查並創建.env文件
const setupEnvFile = () => {
  const envDevPath = path.join(__dirname, '..', '.env');
  
  // 檢查文件是否存在
  if (!fs.existsSync(envDevPath)) {
    console.log('.env 不存在，正在創建...');
    
    // 獲取本機IP地址
    const localIp = getLocalIpAddress();
    console.log(`檢測到本機IP地址: ${localIp}`);
    
    // 準備環境變數內容
    const envContent = `# API 配置（自動生成於 ${new Date().toISOString()}）
REACT_APP_API_HOST=${localIp}
REACT_APP_API_PORT=5001

# 或者直接設置完整的 API 基礎 URL
# REACT_APP_API_BASE_URL=http://${localIp}:5001

# 基礎路徑設定
REACT_APP_BASE_PATH=/xiaomi_camera_videos

# 相機名稱映射
CAMERA_NAMES=607ea43c610c:客廳相機,04cf8cce9d4e:門口相機
`;
    
    // 寫入文件
    fs.writeFileSync(envDevPath, envContent);
    console.log(`✅ 已創建 .env 並設置 API Host 為 ${localIp}`);
  } else {
    console.log('.env 已存在，跳過創建步驟');
  }
};

// 執行腳本
setupEnvFile(); 