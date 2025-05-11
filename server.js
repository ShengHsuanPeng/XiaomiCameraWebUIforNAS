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
    // 添加超時處理
    const timeout = setTimeout(() => {
      console.warn(`獲取影片時長超時: ${filePath}`);
      resolve(null);
    }, 10000); // 10秒超時
    
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
        // 添加超時處理，避免無限等待
        const timeoutId = setTimeout(() => {
          console.warn(`縮略圖生成超時: ${videoPath}`);
          reject(new Error('縮略圖生成超時'));
        }, 15000); // 15秒超時
        
        ffmpeg(videoPath)
          .on('error', (err) => {
            clearTimeout(timeoutId); // 清除超時
            console.error('生成縮略圖失敗:', err);
            reject(err);
          })
          .on('end', () => {
            clearTimeout(timeoutId); // 清除超時
            resolve(path.basename(thumbnailPath));
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
  
  socket.on('disconnect', () => {
    console.log('WebSocket客戶端斷開連線:', socket.id);
  });
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
    
    // 按時間戳排序（升序 - 從早到晚）
    videos.sort((a, b) => a.timestamp - b.timestamp);
    
    // 先返回基本資訊，讓前端能快速顯示
    res.json(videos);
    
    // 在背景進行縮略圖生成和時長獲取
    (async () => {
      try {
        const room = `${cameraId}_${date}`;
        
        // console.log(`開始處理 ${videos.length} 個影片的資訊，按照時間順序處理`);
        
        // 確保影片按時間順序處理（從早到晚）
        // videos 已經在之前按照 timestamp 排序過了
        
        // 一次處理一個影片，按順序處理
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          // console.log(`開始處理第 ${i+1}/${videos.length} 個影片: ${video.name}`);
          
          const filePath = path.join(videosPath, video.name);
          
          // 背景生成縮略圖
          const thumbnailFileName = `${cameraId}_${date}_${video.id}.jpg`;
          const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
          
          // 確保縮略圖目錄存在
          await fs.mkdir(path.dirname(thumbnailPath), { recursive: true }).catch(() => {});
          
          try {
            // 先處理時長獲取
            // console.log(`開始獲取影片時長: ${video.name}`);
            const startTime = Date.now();
            let duration = await getVideoDuration(filePath);
            const endTime = Date.now();
            // console.log(`影片 ${video.name} 時長獲取完成，耗時 ${endTime - startTime}ms，結果:`, duration);
            
            // 通知客戶端時長已獲取
            io.to(room).emit('durationUpdated', { 
              videoId: video.id, 
              duration: duration || '未知',
              timestamp: Date.now(),
              index: i,
              total: videos.length
            });
            
            // 然後處理縮略圖
            const thumbnail = await generateThumbnail(filePath, thumbnailPath);
            
            if (thumbnail) {
              // 通知客戶端縮略圖已生成
              io.to(room).emit('thumbnailGenerated', { 
                videoId: video.id, 
                thumbnail: `/thumbnails/${cameraId}/${date}/${thumbnail}`
              });
            }
          } catch (error) {
            console.error(`處理影片失敗 (${video.name}):`, error);
            
            // 確保即使失敗也發送通知
            io.to(room).emit('durationUpdated', { 
              videoId: video.id, 
              duration: '處理出錯',
              error: true,
              timestamp: Date.now(),
              index: i,
              total: videos.length
            });
          }
          
          // 避免資源過度使用，加入短暫的延遲
          if (i < videos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // 更新進度
          const progress = Math.round(((i + 1) / videos.length) * 100);
          // console.log(`處理進度：${progress}%`);
          
          // 如果是最後一個影片，確保發送 100% 進度通知
          if (i === videos.length - 1) {
            // console.log(`完成所有 ${videos.length} 個影片的處理，發送完成通知`);
            // 發送全部處理完成的通知
            io.to(room).emit('processingComplete', { 
              totalVideos: videos.length,
              timestamp: Date.now()
            });
          }
        }
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
      // console.log(`為相機 ${cameraId} 日期 ${dateStr} 生成縮略圖`);
      
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

// 啟動伺服器
server.listen(PORT, HOST, () => {
  console.log(`伺服器運行在 http://${HOST}:${PORT}`);
}); 