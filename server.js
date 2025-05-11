// 載入環境變數
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('@ffprobe-installer/ffprobe');
const config = require('./config');
const http = require('http');
const { Server } = require('socket.io');

// 設置 ffprobe 路徑
ffmpeg.setFfprobePath(ffprobe.path);

const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

// 建立 HTTP 伺服器
const server = http.createServer(app);

// 建立 Socket.io 伺服器
const io = new Server(server, {
  cors: {
    origin: '*', // 生產環境中應該限制為特定來源
    methods: ['GET', 'POST']
  }
});

// 視頻文件路徑 - 從配置文件中獲取
const VIDEO_BASE_PATH = config.paths.videos;
console.log(`影片目錄路徑: ${VIDEO_BASE_PATH}`);

// 縮略圖路徑
const THUMBNAIL_BASE_PATH = path.join(__dirname, 'public', 'thumbnails');

// 定義錯誤圖片路徑
const DEFAULT_ERROR_IMAGE = path.join(__dirname, 'public', 'error_thumbnail.svg');

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
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type', 'Accept-Ranges', 'Content-Range']
}));

// 為視頻文件路徑添加額外的 CORS 頭部
app.use('/xiaomi_camera_videos', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  
  // 確保 MP4 文件有正確的 MIME 類型
  if (req.path.endsWith('.mp4')) {
    res.header('Content-Type', 'video/mp4');
  }
  
  next();
}, express.static(VIDEO_BASE_PATH, {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    }
  }
}));

// 靜態檔案服務
app.use(express.static(path.join(__dirname, 'build')));
app.use('/thumbnails', express.static(THUMBNAIL_BASE_PATH));

// 配置常數 - 可調整以平衡性能
const THUMBNAIL_GENERATION_TIMEOUT = 10000; // 10秒超時
const DURATION_QUERY_TIMEOUT = 15000;  // 15秒超時
const VIDEO_BATCH_SIZE = 5; // 一批處理的影片數量
const BATCH_INTERVAL = 500; // 批次之間的間隔時間 (毫秒)

// 保存已處理的時長資訊的快取
const durationCache = new Map();
const thumbnailCache = new Map();
const thumbnailFailCache = new Set(); // 記錄生成失敗的縮略圖

// 獲取影片時長的函數
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    // 檢查快取中是否已存在
    if (durationCache.has(filePath)) {
      // console.log(`從快取返回影片時長: ${filePath}`);
      return resolve(durationCache.get(filePath));
    }
    
    // 添加超時處理
    const timeout = setTimeout(() => {
      console.warn(`獲取影片時長超時: ${filePath}`);
      resolve(null);
    }, DURATION_QUERY_TIMEOUT);
    
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      clearTimeout(timeout); // 清除超時計時器
      
      if (err) {
        console.error('獲取影片時長失敗:', err);
        resolve(null); // 失敗時返回 null，但不中斷流程
      } else {
        // 獲取時長（秒）
        const durationSeconds = metadata.format.duration;
        // 轉換為分:秒格式
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 存入快取
        durationCache.set(filePath, formattedDuration);
        
        resolve(formattedDuration);
      }
    });
  });
};

// 生成影片縮略圖的函數
const generateThumbnail = async (videoPath, thumbnailPath, cameraId, date, videoId) => {
  try {
    // 組成快取鍵
    const cacheKey = `${cameraId}_${date}_${videoId}`;
    
    // 檢查是否已知生成失敗，避免重複嘗試
    if (thumbnailFailCache.has(cacheKey)) {
      console.log(`縮略圖先前生成失敗，直接使用錯誤圖片: ${cacheKey}`);
      return await useErrorImage(thumbnailPath, cacheKey, cameraId, date);
    }
    
    // 檢查快取中是否已存在
    if (thumbnailCache.has(cacheKey)) {
      // console.log(`從快取返回縮略圖路徑: ${cacheKey}`);
      return thumbnailCache.get(cacheKey);
    }
    
    // 檢查縮略圖是否已存在
    try {
      await fs.access(thumbnailPath);
      // 如果縮略圖已存在，直接返回路徑並存入快取
      const relativePath = `/thumbnails/${cameraId}/${date}/${path.basename(thumbnailPath)}`;
      thumbnailCache.set(cacheKey, relativePath);
      return relativePath;
    } catch (error) {
      // 縮略圖不存在，需要生成
      // 確保縮略圖目錄存在
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
      
      return new Promise((resolve, reject) => {
        // 添加超時處理，避免無限等待
        const timeoutId = setTimeout(() => {
          console.warn(`縮略圖生成超時: ${videoPath}`);
          // 超時時使用錯誤圖片並記錄失敗
          thumbnailFailCache.add(cacheKey);
          useErrorImage(thumbnailPath, cacheKey, cameraId, date).then(resolve).catch(reject);
        }, THUMBNAIL_GENERATION_TIMEOUT);
        
        ffmpeg(videoPath)
          .on('error', (err) => {
            clearTimeout(timeoutId); // 清除超時
            console.error('生成縮略圖失敗:', err);
            // 記錄失敗以避免重複嘗試
            thumbnailFailCache.add(cacheKey);
            // 失敗時使用錯誤圖片
            useErrorImage(thumbnailPath, cacheKey, cameraId, date).then(resolve).catch(reject);
          })
          .on('end', () => {
            clearTimeout(timeoutId); // 清除超時
            const relativePath = `/thumbnails/${cameraId}/${date}/${path.basename(thumbnailPath)}`;
            // 存入快取
            thumbnailCache.set(cacheKey, relativePath);
            resolve(relativePath);
          })
          .screenshots({
            count: 1,
            folder: path.dirname(thumbnailPath),
            filename: path.basename(thumbnailPath),
            size: '320x180', // 16:9 縮略圖大小
            timestamps: ['5%'] // 從影片開始的 5% 位置取截圖，避免黑畫面
          });
      });
    }
  } catch (error) {
    console.error('處理縮略圖時發生錯誤:', error);
    return null;
  }
};

// 當 ffmpeg 失敗時使用預設錯誤圖片的函數
const useErrorImage = async (thumbnailPath, cacheKey, cameraId, date) => {
  try {
    // 檢查預設錯誤圖片是否存在
    await fs.access(DEFAULT_ERROR_IMAGE);
    
    // 複製預設錯誤圖片到目標位置
    await fs.copyFile(DEFAULT_ERROR_IMAGE, thumbnailPath);
    
    // 返回相對路徑
    const relativePath = `/thumbnails/${cameraId}/${date}/${path.basename(thumbnailPath)}`;
    thumbnailCache.set(cacheKey, relativePath);
    return relativePath;
  } catch (error) {
    console.error('複製錯誤圖片失敗:', error);
    // 如果無法複製錯誤圖片，返回固定的錯誤圖片路徑
    return '/error_thumbnail.jpg';
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

// WebSocket 連線處理
io.on('connection', (socket) => {
  console.log('新的WebSocket連線:', socket.id);
  
  // 加入特定相機和日期的房間
  socket.on('joinRoom', ({ cameraId, date }) => {
    const room = `${cameraId}_${date}`;
    socket.join(room);
    console.log(`客戶端 ${socket.id} 加入房間 ${room}`);
  });
  
  // 離開房間
  socket.on('leaveRoom', ({ cameraId, date }) => {
    const room = `${cameraId}_${date}`;
    socket.leave(room);
    console.log(`客戶端 ${socket.id} 離開房間 ${room}`);
  });
  
  // 處理特定影片信息請求
  socket.on('requestVideoInfo', async ({ cameraId, date, videoId }) => {
    try {
      console.log(`收到對影片 ${videoId} 的特殊請求`);
      
      // 獲取影片文件路徑
      const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
      const videoFiles = await fs.readdir(videosPath);
      
      // 尋找匹配的影片
      const videoFile = videoFiles.find(file => file.endsWith('.mp4') && file.replace('.mp4', '') === videoId);
      
      if (videoFile) {
        const filePath = path.join(videosPath, videoFile);
        // 獲取影片時長
        const duration = await getVideoDuration(filePath);
        
        // 發送信息回客戶端
        const room = `${cameraId}_${date}`;
        io.to(room).emit('durationUpdated', {
          videoId,
          duration: duration || '未知',
          timestamp: Date.now(),
          isSpecialRequest: true
        });
        
        console.log(`已回應特殊請求：影片 ${videoId} 時長為 ${duration || '未知'}`);
      } else {
        console.error(`找不到請求的影片: ${videoId}`);
      }
    } catch (error) {
      console.error(`處理影片信息特殊請求失敗:`, error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('WebSocket客戶端斷開連線:', socket.id);
  });
});

// 分批處理函數 - 用於處理大量影片
const processBatch = async (videos, videosPath, cameraId, date, room, io, startIndex = 0) => {
  const totalVideos = videos.length;
  const endIndex = Math.min(startIndex + VIDEO_BATCH_SIZE, totalVideos);
  
  // console.log(`處理批次：${startIndex} 到 ${endIndex-1} (共 ${totalVideos} 個影片)`);
  
  // 先處理第一個影片 - 優先處理
  if (startIndex === 0 && videos.length > 0) {
    const firstVideo = videos[0];
    const filePath = path.join(videosPath, firstVideo.name);
    
    try {
      // 獲取時長
      const duration = await getVideoDuration(filePath);
      
      // 通知客戶端時長已獲取
      io.to(room).emit('durationUpdated', { 
        videoId: firstVideo.id, 
        duration: duration || '未知',
        timestamp: Date.now(),
        index: 0,
        total: totalVideos,
        isFirstVideo: true
      });
      
      // 獲取縮略圖
      const thumbnailFileName = `${cameraId}_${date}_${firstVideo.id}.jpg`;
      const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
      
      const thumbnail = await generateThumbnail(filePath, thumbnailPath, cameraId, date, firstVideo.id);
      
      if (thumbnail) {
        io.to(room).emit('thumbnailGenerated', { 
          videoId: firstVideo.id, 
          thumbnail
        });
      }
    } catch (error) {
      console.error(`處理第一個影片失敗 (${firstVideo.name}):`, error);
    }
  }
  
  // 然後處理批次中的其他影片
  for (let i = Math.max(startIndex, 1); i < endIndex; i++) {
    const video = videos[i];
    const filePath = path.join(videosPath, video.name);
    
    try {
      // 獲取時長
      const duration = await getVideoDuration(filePath);
      
      // 通知客戶端時長已獲取
      io.to(room).emit('durationUpdated', { 
        videoId: video.id, 
        duration: duration || '未知',
        timestamp: Date.now(),
        index: i,
        total: totalVideos
      });
      
      // 獲取縮略圖
      const thumbnailFileName = `${cameraId}_${date}_${video.id}.jpg`;
      const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
      
      const thumbnail = await generateThumbnail(filePath, thumbnailPath, cameraId, date, video.id);
      
      if (thumbnail) {
        io.to(room).emit('thumbnailGenerated', { 
          videoId: video.id, 
          thumbnail
        });
      }
    } catch (error) {
      console.error(`處理影片失敗 (${video.name}):`, error);
      
      io.to(room).emit('durationUpdated', { 
        videoId: video.id, 
        duration: '處理出錯',
        error: true,
        timestamp: Date.now(),
        index: i,
        total: totalVideos
      });
    }
  }
  
  // 如果還有更多批次，繼續處理
  if (endIndex < totalVideos) {
    setTimeout(() => {
      processBatch(videos, videosPath, cameraId, date, room, io, endIndex);
    }, BATCH_INTERVAL);
  } else {
    // 發送全部處理完成的通知
    io.to(room).emit('processingComplete', { 
      totalVideos,
      timestamp: Date.now()
    });
  }
};

// 針對單一影片時長的專用API端點
app.get('/api/video-duration/:cameraId/:date/:videoId', async (req, res) => {
  try {
    const { cameraId, date, videoId } = req.params;
    const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
    
    // 檢查目錄是否存在
    try {
      await fs.access(videosPath);
    } catch (error) {
      return res.status(404).json({ error: '找不到指定的日期目錄' });
    }
    
    // 查找匹配的影片檔案
    const videoFiles = await fs.readdir(videosPath);
    const videoFile = videoFiles.find(file => file.endsWith('.mp4') && file.replace('.mp4', '') === videoId);
    
    if (!videoFile) {
      return res.status(404).json({ error: '找不到指定的影片' });
    }
    
    // 獲取影片時長
    const filePath = path.join(videosPath, videoFile);
    const duration = await getVideoDuration(filePath);
    
    res.json({ 
      videoId,
      duration: duration || '未知',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`獲取影片時長失敗:`, error);
    res.status(500).json({ error: '獲取影片時長失敗' });
  }
});

// 批量處理影片縮略圖和時長
app.get('/api/process-videos/:cameraId/:date', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
    
    // 檢查目錄是否存在
    try {
      await fs.access(videosPath);
    } catch (error) {
      return res.status(404).json({ error: '找不到指定的日期目錄' });
    }
    
    // 獲取視頻列表
    const videoFiles = await fs.readdir(videosPath);
    
    // 過濾出 .mp4 檔案並處理
    const videos = videoFiles
      .filter(file => file.endsWith('.mp4'))
      .map((file) => {
        const nameWithoutExt = file.replace('.mp4', '');
        return {
          id: nameWithoutExt,
          name: file
        };
      });
    
    videos.sort((a, b) => a.name.localeCompare(b.name));
    
    // 構建房間名稱
    const room = `${cameraId}_${date}`;
    
    // 立即返回確認信息
    res.json({ 
      status: 'processing',
      totalVideos: videos.length,
      message: `開始處理 ${videos.length} 個影片，過程將透過 WebSocket 通知`
    });
    
    // 在背景開始處理
    processBatch(videos, videosPath, cameraId, date, room, io, 0);
    
  } catch (error) {
    console.error(`批量處理影片失敗:`, error);
    res.status(500).json({ error: '批量處理影片失敗' });
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
    const videos = videoFiles
      .filter(file => file.endsWith('.mp4'))
      .map((file) => {
        // 從檔案名稱解析資訊
        const nameWithoutExt = file.replace('.mp4', '');
        const parts = nameWithoutExt.split('_');
        const startTime = parts[0]; // 例如 "55M55S" - 影片開始的時間（分:秒）
        const timestamp = parts[1] ? parseInt(parts[1], 10) : 0;
        
        // 構建縮略圖路徑（不等待生成）
        const thumbnailFileName = `${cameraId}_${date}_${nameWithoutExt}.jpg`;
        const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
        
        return {
          id: nameWithoutExt,
          name: file,
          timestamp,
          startTime: startTime.replace('M', ':').replace('S', ''), // 格式化為 "分:秒" 格式
          duration: '載入中', // 先返回載入中，稍後更新
          thumbnail: `/thumbnails/${cameraId}/${date}/${thumbnailFileName}`
        };
      });
    
    // 改為按檔名排序（以改善使用者體驗）
    videos.sort((a, b) => a.name.localeCompare(b.name));
    
    // 先返回基本資訊，讓前端能快速顯示
    res.json(videos);
    
    // 在背景進行縮略圖生成和時長獲取
    (async () => {
      try {
        const room = `${cameraId}_${date}`;
        
        // 使用批次處理來提高效率
        processBatch(videos, videosPath, cameraId, date, room, io, 0);
        
      } catch (error) {
        console.error('背景處理影片資訊失敗:', error);
      }
    })();
  } catch (error) {
    console.error(`獲取相機 ${req.params.cameraId} 日期 ${req.params.date} 的影片列表失敗:`, error);
    res.status(500).json({ error: '獲取影片列表失敗' });
  }
});

// 獲取特定時間點的縮略圖
app.get('/api/thumbnails/:cameraId/:dateStr', async (req, res) => {
  try {
    const { cameraId, dateStr } = req.params;
    const cacheKey = `${cameraId}_${dateStr}_thumb`;
    
    // 檢查是否為已知失敗的縮略圖
    if (thumbnailFailCache.has(cacheKey)) {
      console.log(`直接返回錯誤圖片: ${cacheKey}`);
      return res.sendFile(DEFAULT_ERROR_IMAGE);
    }
    
    // 解析日期字符串
    const dateInfo = parseDateString(dateStr);
    const formattedDate = dateInfo.formatted;
    
    // 檢查相機和日期目錄是否存在
    const datePath = path.join(VIDEO_BASE_PATH, cameraId, dateStr);
    
    try {
      await fs.access(datePath);
    } catch (error) {
      thumbnailFailCache.add(cacheKey);
      return res.status(404).json({ error: '找不到指定的日期目錄' });
    }
    
    // 查找該時間點的第一個影片文件
    const videoFiles = await fs.readdir(datePath);
    const mp4Files = videoFiles.filter(file => file.endsWith('.mp4'));
    
    if (mp4Files.length === 0) {
      thumbnailFailCache.add(cacheKey);
      return res.status(404).json({ error: '在指定時間沒有找到影片' });
    }
    
    // 取第一個影片生成縮略圖
    const firstVideoFile = mp4Files[0];
    const videoPath = path.join(datePath, firstVideoFile);
    
    // 生成縮略圖的文件名和路徑
    const thumbnailFileName = `${cameraId}_${dateStr}_thumb.jpg`;
    const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, thumbnailFileName);
    const thumbnailDir = path.dirname(thumbnailPath);
    
    // 確保縮略圖目錄存在
    await fs.mkdir(thumbnailDir, { recursive: true });
    
    // 嘗試獲取現有縮略圖，如果不存在則生成
    try {
      await fs.access(thumbnailPath);
      // 如果縮略圖已存在，直接返回
      return res.sendFile(thumbnailPath);
    } catch (error) {
      // 縮略圖不存在，需要生成
      console.log(`為相機 ${cameraId} 日期 ${dateStr} 生成縮略圖`);
      
      // 添加超時處理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('縮略圖生成超時'));
        }, THUMBNAIL_GENERATION_TIMEOUT);
      });
      
      // 縮略圖生成處理
      const ffmpegPromise = new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on('error', (err) => {
            console.error('生成縮略圖失敗:', err);
            thumbnailFailCache.add(cacheKey);
            reject(err);
          })
          .on('end', () => {
            resolve(thumbnailPath);
          })
          .screenshots({
            count: 1,
            folder: thumbnailDir,
            filename: path.basename(thumbnailPath),
            size: '320x180', // 16:9 縮略圖大小
            timestamps: ['5%'] // 從影片開始的 5% 位置取截圖，避免黑畫面
          });
      });
      
      // 使用 Promise.race 來處理可能的超時情況
      try {
        const result = await Promise.race([ffmpegPromise, timeoutPromise]);
        return res.sendFile(result);
      } catch (err) {
        console.error('縮略圖生成失敗或超時:', err);
        thumbnailFailCache.add(cacheKey);
        
        // 使用預設錯誤圖片
        try {
          await fs.copyFile(DEFAULT_ERROR_IMAGE, thumbnailPath);
          return res.sendFile(thumbnailPath);
        } catch (copyErr) {
          // 如果連複製也失敗，直接返回錯誤圖片
          if (await fileExists(DEFAULT_ERROR_IMAGE)) {
            return res.sendFile(DEFAULT_ERROR_IMAGE);
          } else {
            return res.status(500).json({ error: '無法生成縮略圖' });
          }
        }
      }
    }
  } catch (error) {
    console.error(`獲取縮略圖失敗:`, error);
    return res.status(500).json({ error: '獲取縮略圖失敗' });
  }
});

// 檢查文件是否存在的輔助函數
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// 所有其他請求返回 React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 啟動伺服器
server.listen(PORT, HOST, () => {
  console.log(`伺服器運行在 http://${HOST}:${PORT}`);
}); 