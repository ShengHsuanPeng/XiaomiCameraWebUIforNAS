# 小米監視器影片預覽系統

這是一個用於預覽小米監視器備份到 NAS 上的影片的網頁應用程式。此應用會動態讀取檔案系統中的影片檔案，並提供瀏覽和播放功能。

## 功能特點

- 瀏覽多個監視器相機
- 依照日期和時間查看錄影檔案
- 在線播放影片檔案
- 影片縮略圖預覽，幫助快速識別影片內容
- 支持網格和表格兩種檢視模式
- 響應式設計，適合各種設備使用
  - 在桌面設備上，側邊欄顯示在左側
  - 在手機等小螢幕設備上，側邊欄顯示在頂部並可折疊
- 動態讀取檔案系統中的影片資料
- 使用配置檔管理相機名稱和系統設定
- 實時生成縮略圖並顯示處理進度
- 通過 Socket.io 提供處理狀態的即時更新

## 檔案結構

小米監視器的影片檔案結構為：
```
xiaomi_camera_videos/相機ID/YYYYMMDDHH/xxMxxS_timestamp.mp4
```

其中：
- 相機ID：相機的唯一識別碼
- YYYYMMDDHH：年月日時（例如：2025051114 表示 2025年5月11日14時）
- xxMxxS：影片開始的時間點（分鐘和秒，例如：55M55S 表示 55分55秒）
- timestamp：Unix 時間戳

例如：
```
xiaomi_camera_videos/607ea43c610c/2025051114/55M55S_1746946555.mp4
```

## 安裝與運行

### 前置需求

- Node.js (v14.0.0 或更高)
- npm (v6.0.0 或更高)
- FFmpeg (必須安裝在系統中並添加到PATH環境變量)

#### FFmpeg安裝指南

FFmpeg是必須的系統依賴，用於生成縮略圖和處理影片：

**Windows：**
1. 使用Chocolatey（推薦）：
   ```
   choco install ffmpeg
   ```
2. 或者從官方網站下載：[https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
   - 下載後解壓到任意目錄，如 `C:\ffmpeg`
   - 將 `C:\ffmpeg\bin` 添加到系統 PATH 環境變量

**macOS：**
```
brew install ffmpeg
```

**Linux (Ubuntu/Debian)：**
```
sudo apt update
sudo apt install ffmpeg
```

**驗證安裝：**
安裝完成後，在命令列執行以下命令確認安裝成功：
```
ffmpeg -version
```

如果看到版本信息，表示安裝成功。如未成功，請確保FFmpeg的bin目錄已添加到系統PATH中。

### 安裝步驟

1. 克隆此專案到本地
   ```
   git clone <repository-url>
   ```

2. 進入專案目錄
   ```
   cd xiaomi-camera-ui
   ```

3. 安裝依賴
   ```
   npm install
   ```

4. 啟動開發模式（同時運行前端和後端）
   ```
   npm run dev
   ```

5. 打開瀏覽器訪問 http://localhost:3000

### 僅運行後端伺服器
```
npm run server
```

### 僅運行前端開發伺服器
```
npm start
```

## 部署到生產環境

1. 構建生產版本
   ```
   npm run build
   ```

2. 運行生產伺服器
   ```
   npm run server
   ```

3. 訪問 http://[你的伺服器IP]:5001

### 使用 start.sh 啟動腳本

專案提供了一個方便的啟動腳本，可以自動設置環境變數並啟動服務：

```
chmod +x start.sh  # 賦予執行權限
./start.sh         # 執行腳本
```

## 環境變數配置

系統支持通過環境變數配置各種參數。你可以創建一個 `.env` 文件或直接在系統中設置這些變數：

```
# 伺服器設定
REACT_APP_API_PORT=5001        # 伺服器端口
REACT_APP_API_HOST=192.168.1.2 # 伺服器主機 IP（默認自動檢測）

# 影片檔案路徑
# REACT_APP_BASE_PATH=/path/to/xiaomi_camera_videos  # 影片文件的基礎路徑

# 相機名稱配置（格式: "相機ID:名稱,相機ID:名稱"）
CAMERA_NAMES="607ea43c610c:一樓車庫,04cf8cce9d4e:二樓陽台"

# API基礎URL（僅開發環境使用）
REACT_APP_API_BASE_URL=http://192.168.1.2:5001
```

## 配置說明

系統使用 `config.js` 文件進行配置，您可以根據需要修改設定。該文件會自動讀取環境變數，優先使用環境變數中的設定，如環境變數不存在則使用默認值。

主要配置項包括：

### 伺服器設定
```javascript
server: {
  port: process.env.REACT_APP_API_PORT || 5001, // 伺服器端口
  host: process.env.REACT_APP_API_HOST || getLocalIpAddress(), // 伺服器主機
  corsOrigins: ['http://localhost:3000', `http://${getLocalIpAddress()}:3000`], // CORS配置
}
```

### 影片檔案路徑
```javascript
paths: {
  videos: process.env.REACT_APP_BASE_PATH || path.join(__dirname, 'xiaomi_camera_videos'),
}
```

### 相機名稱映射
相機名稱可通過環境變數 `CAMERA_NAMES` 配置，格式為 `"相機ID:名稱,相機ID:名稱"`。如果未配置，系統使用默認值：
```javascript
cameras: {
  '607ea43c610c': '一樓車庫',
  '04cf8cce9d4e': '二樓陽台',
}
```

## 系統架構

- 前端：React.js + React Router + Styled Components
- 後端：Express.js + Socket.io
- 資料來源：直接讀取檔案系統中的影片檔案
- 縮略圖：使用 ffmpeg 自動生成並緩存
- 實時通訊：使用 Socket.io 提供縮略圖生成進度的即時更新

## 技術棧

- React.js
- React Router
- Styled Components
- Express.js
- Socket.io
- HTML5 Video API
- fluent-ffmpeg (用於獲取影片時長和生成縮略圖)
- @ffprobe-installer/ffprobe (用於自動安裝 ffprobe)

## 縮略圖功能

系統會自動為影片生成縮略圖，以幫助用戶快速識別影片內容：

- 縮略圖會在首次訪問影片時生成，並緩存在 `public/thumbnails` 目錄中
- 支持兩種檢視模式：網格檢視（顯示大縮略圖）和表格檢視（顯示小縮略圖和詳細資訊）
- 在影片播放頁面，會先顯示縮略圖，點擊後開始播放影片
- 縮略圖生成過程會通過 Socket.io 實時顯示進度
- 縮略圖大小為 320x180 像素（16:9 寬高比）

## 授權

MIT 