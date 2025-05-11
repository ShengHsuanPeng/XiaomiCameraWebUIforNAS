const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('@ffprobe-installer/ffprobe');
const config = require('./config');

// 設置 ffprobe 路徑
ffmpeg.setFfprobePath(ffprobe.path);

const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

// 影片檔案的基礎路徑
const VIDEO_BASE_PATH = config.paths.videos;
// 縮略圖的基礎路徑
const THUMBNAIL_BASE_PATH = path.join(__dirname, 'public', 'thumbnails');

// 確保縮略圖目錄存在
const ensureThumbnailDirExists = async () => {
  try {
    await fs.access(THUMBNAIL_BASE_PATH);
  } catch (error) {
    // 目錄不存在，創建它
    await fs.mkdir(THUMBNAIL_BASE_PATH, { recursive: true });
    console.log('已創建縮略圖目錄:', THUMBNAIL_BASE_PATH);
  }
};

// 啟動時確保縮略圖目錄存在
ensureThumbnailDirExists();

// 啟用 CORS，允許特定來源
app.use(cors({
  origin: function(origin, callback) {
    // 允許來自無來源的請求（如移動應用或直接訪問）
    if (!origin) return callback(null, true);
    
    // 檢查來源是否在允許列表中
    if (config.server.corsOrigins.indexOf(origin) !== -1 || config.server.corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('不允許的來源'));
    }
  },
  credentials: true
}));

// 靜態檔案服務
app.use('/xiaomi_camera_videos', express.static(VIDEO_BASE_PATH));
app.use(express.static(path.join(__dirname, 'build')));
app.use('/thumbnails', express.static(THUMBNAIL_BASE_PATH));

// 獲取影片時長的函數
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('獲取影片時長失敗:', err);
        resolve(null); // 失敗時返回 null，但不中斷流程
      } else {
        // 獲取時長（秒）
        const durationSeconds = metadata.format.duration;
        // 轉換為分:秒格式
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        resolve(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    });
  });
};

// 生成影片縮略圖的函數
const generateThumbnail = async (videoPath, thumbnailPath) => {
  try {
    // 檢查縮略圖是否已存在
    try {
      await fs.access(thumbnailPath);
      // 如果縮略圖已存在，直接返回路徑
      return path.basename(thumbnailPath);
    } catch (error) {
      // 縮略圖不存在，需要生成
      // 確保縮略圖目錄存在
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on('error', (err) => {
            console.error('生成縮略圖失敗:', err);
            reject(err);
          })
          .on('end', () => {
            resolve(path.basename(thumbnailPath));
          })
          .screenshots({
            count: 1,
            folder: path.dirname(thumbnailPath),
            filename: path.basename(thumbnailPath),
            size: '320x180' // 16:9 縮略圖大小
          });
      });
    }
  } catch (error) {
    console.error('處理縮略圖時發生錯誤:', error);
    return null;
  }
};

// 從配置中獲取相機名稱，如果不存在則使用默認格式
const getCameraName = (cameraId) => {
  return config.cameras[cameraId] || `相機 ${cameraId}`;
};

// 解析日期字符串
const parseDateString = (dateStr) => {
  const df = config.dateFormat;
  const year = dateStr.substring(df.yearStart, df.yearStart + df.yearLength);
  const month = dateStr.substring(df.monthStart, df.monthStart + df.monthLength);
  const day = dateStr.substring(df.dayStart, df.dayStart + df.dayLength);
  const hour = dateStr.substring(df.hourStart, df.hourStart + df.hourLength);
  
  return {
    year,
    month,
    day,
    hour,
    formatted: `${year}-${month}-${day} ${hour}:00`
  };
};

// 獲取所有相機列表
app.get('/api/cameras', async (req, res) => {
  try {
    const cameraDirs = await fs.readdir(VIDEO_BASE_PATH);
    
    const cameras = await Promise.all(cameraDirs.map(async (cameraId) => {
      // 檢查是否為目錄
      const stats = await fs.stat(path.join(VIDEO_BASE_PATH, cameraId));
      if (stats.isDirectory()) {
        // 從配置檔獲取相機名稱
        const name = getCameraName(cameraId);
        return { id: cameraId, name };
      }
      return null;
    }));
    
    // 過濾掉非目錄項
    res.json(cameras.filter(camera => camera !== null));
  } catch (error) {
    console.error('獲取相機列表失敗:', error);
    res.status(500).json({ error: '獲取相機列表失敗' });
  }
});

// 獲取特定相機的日期列表
app.get('/api/cameras/:cameraId/dates', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const cameraPath = path.join(VIDEO_BASE_PATH, cameraId);
    
    // 檢查相機目錄是否存在
    try {
      await fs.access(cameraPath);
    } catch (error) {
      return res.status(404).json({ error: '找不到指定的相機' });
    }
    
    const dateDirs = await fs.readdir(cameraPath);
    
    const dates = await Promise.all(dateDirs.map(async (dateDir) => {
      const stats = await fs.stat(path.join(cameraPath, dateDir));
      if (stats.isDirectory()) {
        // 使用配置中的日期解析函數
        const dateInfo = parseDateString(dateDir);
        return {
          date: dateDir,
          label: dateInfo.formatted
        };
      }
      return null;
    }));
    
    // 按日期排序（升序 - 從早到晚）
    const sortedDates = dates
      .filter(date => date !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json(sortedDates);
  } catch (error) {
    console.error(`獲取相機 ${req.params.cameraId} 的日期列表失敗:`, error);
    res.status(500).json({ error: `獲取日期列表失敗` });
  }
});

// 獲取特定相機和日期的影片列表
app.get('/api/cameras/:cameraId/dates/:date/videos', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
    
    // 檢查影片目錄是否存在
    try {
      await fs.access(videosPath);
    } catch (error) {
      return res.status(404).json({ error: '找不到指定的日期目錄' });
    }
    
    const videoFiles = await fs.readdir(videosPath);
    
    // 過濾出 .mp4 檔案
    const videoPromises = videoFiles
      .filter(file => file.endsWith('.mp4'))
      .map(async (file) => {
        // 從檔案名稱解析資訊
        const nameWithoutExt = file.replace('.mp4', '');
        const parts = nameWithoutExt.split('_');
        const startTime = parts[0]; // 例如 "55M55S" - 影片開始的時間（分:秒）
        const timestamp = parts[1] ? parseInt(parts[1], 10) : 0;
        
        // 獲取影片時長
        const filePath = path.join(videosPath, file);
        const duration = await getVideoDuration(filePath);
        
        // 生成縮略圖
        const thumbnailFileName = `${cameraId}_${date}_${nameWithoutExt}.jpg`;
        const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
        const thumbnail = await generateThumbnail(filePath, thumbnailPath);
        
        return {
          id: nameWithoutExt,
          name: file,
          timestamp,
          startTime: startTime.replace('M', ':').replace('S', ''), // 格式化為 "分:秒" 格式
          duration: duration || '未知', // 如果獲取失敗，顯示 "未知"
          thumbnail: thumbnail ? `/thumbnails/${cameraId}/${date}/${thumbnail}` : null
        };
      });
    
    const videos = await Promise.all(videoPromises);
    
    // 按時間戳排序（升序 - 從早到晚）
    videos.sort((a, b) => a.timestamp - b.timestamp);
    
    res.json(videos);
  } catch (error) {
    console.error(`獲取相機 ${req.params.cameraId} 日期 ${req.params.date} 的影片列表失敗:`, error);
    res.status(500).json({ error: '獲取影片列表失敗' });
  }
});

// 獲取特定時間點的縮略圖
app.get('/api/thumbnails/:cameraId/:dateStr', async (req, res) => {
  try {
    const { cameraId, dateStr } = req.params;
    
    // 解析日期字符串
    const dateInfo = parseDateString(dateStr);
    const formattedDate = dateInfo.formatted;
    
    // 檢查相機和日期目錄是否存在
    const datePath = path.join(VIDEO_BASE_PATH, cameraId, dateStr);
    
    try {
      await fs.access(datePath);
    } catch (error) {
      return res.status(404).json({ error: '找不到指定的日期目錄' });
    }
    
    // 查找該時間點的第一個影片文件
    const videoFiles = await fs.readdir(datePath);
    const mp4Files = videoFiles.filter(file => file.endsWith('.mp4'));
    
    if (mp4Files.length === 0) {
      return res.status(404).json({ error: '在指定時間沒有找到影片' });
    }
    
    // 取第一個影片生成縮略圖
    const firstVideoFile = mp4Files[0];
    const videoPath = path.join(datePath, firstVideoFile);
    
    // 生成縮略圖的文件名和路徑
    const thumbnailFileName = `${cameraId}_${dateStr}_thumb.jpg`;
    const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, thumbnailFileName);
    
    // 確保縮略圖目錄存在
    await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
    
    // 嘗試獲取現有縮略圖，如果不存在則生成
    try {
      await fs.access(thumbnailPath);
      // 如果縮略圖已存在，直接返回
      res.sendFile(thumbnailPath);
    } catch (error) {
      // 縮略圖不存在，需要生成
      console.log(`為相機 ${cameraId} 日期 ${dateStr} 生成縮略圖`);
      
      ffmpeg(videoPath)
        .on('error', (err) => {
          console.error('生成縮略圖失敗:', err);
          res.status(500).json({ error: '生成縮略圖失敗' });
        })
        .on('end', () => {
          // 成功生成縮略圖後返回
          res.sendFile(thumbnailPath);
        })
        .screenshots({
          count: 1,
          folder: path.dirname(thumbnailPath),
          filename: path.basename(thumbnailPath),
          size: '320x180' // 16:9 縮略圖大小
        });
    }
  } catch (error) {
    console.error(`獲取縮略圖失敗:`, error);
    res.status(500).json({ error: '獲取縮略圖失敗' });
  }
});

// 所有其他請求返回 React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`伺服器運行在 http://${HOST}:${PORT}`);
}); 