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

3. 訪問 http://localhost:5001

## 配置說明

系統使用 `config.js` 文件進行配置，您可以根據需要修改以下設定：

### 伺服器設定
```javascript
server: {
  port: process.env.PORT || 5001, // 伺服器端口
}
```

### 影片檔案路徑
```javascript
paths: {
  videos: path.join(__dirname, 'xiaomi_camera_videos'), // 影片檔案的位置
}
```

### 相機名稱映射
```javascript
cameras: {
  '607ea43c610c': '客廳相機', // 相機 ID 到名稱的映射
  '04cf8cce9d4e': '門口相機',
  // 可以根據需要添加更多相機
}
```

### 日期格式設定
```javascript
dateFormat: {
  yearStart: 0,  // 年份在日期字符串中的起始位置
  yearLength: 4, // 年份的長度
  monthStart: 4, // 月份在日期字符串中的起始位置
  monthLength: 2, // 月份的長度
  dayStart: 6,   // 日在日期字符串中的起始位置
  dayLength: 2,  // 日的長度
  hourStart: 8,  // 小時在日期字符串中的起始位置
  hourLength: 2, // 小時的長度
}
```

## 系統架構

- 前端：React.js + React Router + Styled Components
- 後端：Express.js
- 資料來源：直接讀取檔案系統中的影片檔案
- 縮略圖：使用 ffmpeg 自動生成並緩存

## 技術棧

- React.js
- React Router
- Styled Components
- Express.js
- HTML5 Video API
- fluent-ffmpeg (用於獲取影片時長和生成縮略圖)

## 縮略圖功能

系統會自動為影片生成縮略圖，以幫助用戶快速識別影片內容：

- 縮略圖會在首次訪問影片時生成，並緩存在 `public/thumbnails` 目錄中
- 支持兩種檢視模式：網格檢視（顯示大縮略圖）和表格檢視（顯示小縮略圖和詳細資訊）
- 在影片播放頁面，會先顯示縮略圖，點擊後開始播放影片
- 縮略圖大小為 320x180 像素（16:9 寬高比）

## 授權

MIT 