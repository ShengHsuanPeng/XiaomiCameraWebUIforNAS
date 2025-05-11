const fs = require('fs');
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
  return '192.168.68.69'; // 如果找不到合適的 IP，使用默認值
};

// 檢查並創建後端.env文件
const setupServerEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env');
  
  // 檢查文件是否存在
  if (!fs.existsSync(envPath)) {
    console.log('.env 不存在，正在為後端服務創建...');
    
    // 獲取本機IP地址
    const localIp = getLocalIpAddress();
    console.log(`檢測到本機IP地址: ${localIp}`);
    
    // 準備環境變數內容
    const envContent = `# 後端服務配置（自動生成於 ${new Date().toISOString()}）
HOST=${localIp}
PORT=5001

# 影片基礎路徑
# VIDEO_BASE_PATH=/path/to/videos

# 允許的跨域來源 (以逗號分隔)
CORS_ORIGINS=http://localhost:3000,http://${localIp}:3000
`;
    
    // 寫入文件
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ 已創建後端 .env 並設置 HOST 為 ${localIp}`);
  } else {
    console.log('後端 .env 已存在，跳過創建步驟');
  }
};

// 執行腳本
setupServerEnvFile(); 