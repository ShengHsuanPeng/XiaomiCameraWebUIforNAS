// Load environment variables
require('dotenv').config();

// Global object to track thumbnails being processed, to avoid duplicate processing
global.processingThumbnails = {};
// Track completed rooms
global.completedRooms = new Set();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('@ffprobe-installer/ffprobe');
const config = require('./config');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');

// Check if FFmpeg is installed
const checkFFmpegInstallation = () => {
  try {
    // Check if ffprobe path is available
    if (!ffprobe.path) {
      console.error('❌ Cannot find ffprobe path, thumbnail functionality will not work properly!');
      console.error('Please ensure @ffprobe-installer/ffprobe package is installed correctly.');
    } else {
      console.log('✅ ffprobe path configured:', ffprobe.path);
    }
    
    // Check if FFmpeg is available in the system
    const checkProcess = spawn('ffmpeg', ['-version']);
    
    checkProcess.on('error', (err) => {
      console.error('❌ FFmpeg is not installed or not in PATH! Thumbnail generation will not work properly.');
      console.error('Please visit https://ffmpeg.org/download.html to download and install FFmpeg, or use the following commands:');
      console.error('- Windows (using Chocolatey): choco install ffmpeg');
      console.error('- macOS (using Homebrew): brew install ffmpeg');
      console.error('- Linux (Ubuntu/Debian): sudo apt install ffmpeg');
      
      console.error('After installation, make sure to add FFmpeg to your system PATH environment variable!');
    });
    
    checkProcess.stdout.on('data', (data) => {
      console.log('✅ FFmpeg is installed:', data.toString().split('\n')[0]);
    });
  } catch (error) {
    console.error('Error checking FFmpeg installation:', error);
  }
};

// Set ffprobe path
ffmpeg.setFfprobePath(ffprobe.path);

// Check FFmpeg installation at startup
checkFFmpegInstallation();

const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: '*', // In production, this should be restricted to specific origins
    methods: ['GET', 'POST']
  }
});

// Video files path - get from config file
const VIDEO_BASE_PATH = config.paths.videos;
console.log(`Video directory path: ${VIDEO_BASE_PATH}`);

// Thumbnail path
const THUMBNAIL_BASE_PATH = path.join(__dirname, 'public', 'thumbnails');

// Define error image path
const DEFAULT_ERROR_IMAGE = path.join(__dirname, 'public', 'error_thumbnail.svg');

// Ensure thumbnail directory exists
const ensureThumbnailDirExists = async () => {
  try {
    await fs.access(THUMBNAIL_BASE_PATH);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(THUMBNAIL_BASE_PATH, { recursive: true });
    console.log('Created thumbnail directory:', THUMBNAIL_BASE_PATH);
  }
};

// Ensure thumbnail directory exists at startup
ensureThumbnailDirExists();

// Enable CORS, allow specific origins
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or direct access)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list
    if (config.server.corsOrigins.indexOf(origin) !== -1 || config.server.corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type', 'Accept-Ranges', 'Content-Range']
}));

// Add extra CORS headers for video file paths
app.use('/xiaomi_camera_videos', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  
  // Ensure MP4 files have the correct MIME type
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

// Static file service
app.use(express.static(path.join(__dirname, 'build')));
app.use('/thumbnails', express.static(THUMBNAIL_BASE_PATH));

// Configuration constants - can be adjusted to balance performance
const THUMBNAIL_GENERATION_TIMEOUT = 10000; // 10 seconds timeout
const DURATION_QUERY_TIMEOUT = 15000;  // 15 seconds timeout
const VIDEO_BATCH_SIZE = 5; // Number of videos to process in a batch
const BATCH_INTERVAL = 500; // Interval between batches (milliseconds)

// Cache for storing processed duration information
const durationCache = new Map();
const thumbnailCache = new Map();
const thumbnailFailCache = new Set(); // Record thumbnails that failed to generate

// Function to get video duration
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    // Check if already exists in cache
    if (durationCache.has(filePath)) {
      // console.log(`Returning video duration from cache: ${filePath}`);
      return resolve(durationCache.get(filePath));
    }
    
    // Add timeout handling
    const timeout = setTimeout(() => {
      console.warn(`Getting video duration timed out: ${filePath}`);
      resolve(null);
    }, DURATION_QUERY_TIMEOUT);
    
    console.log(`Starting to get video duration: ${filePath}`);
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      clearTimeout(timeout); // Clear timeout timer
      
      if (err) {
        console.error('Failed to get video duration:', err);
        resolve(null); // Return null on failure, but don't break the flow
      } else {
        // Get duration in seconds
        const durationSeconds = metadata.format.duration;
        // Convert to minutes:seconds format
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Store in cache
        durationCache.set(filePath, formattedDuration);
        
        resolve(formattedDuration);
      }
    });
  });
};

// Function to generate video thumbnail
const generateThumbnail = async (videoPath, thumbnailPath, cameraId, date, videoId) => {
  try {
    // Create cache key
    const cacheKey = `${cameraId}_${date}_${videoId}`;
    
    // Check if known to fail, avoid retrying
    if (thumbnailFailCache.has(cacheKey)) {
      console.log(`Thumbnail previously failed to generate, using error image directly: ${cacheKey}`);
      return await useErrorImage(thumbnailPath, cacheKey, cameraId, date);
    }
    
    // Check if already exists in cache
    if (thumbnailCache.has(cacheKey)) {
      // console.log(`Returning thumbnail path from cache: ${cacheKey}`);
      return thumbnailCache.get(cacheKey);
    }
    
    // Create processing marker to avoid duplicate processing
    if (global.processingThumbnails[cacheKey]) {
      console.log(`Thumbnail ${cacheKey} is already being processed, skipping duplicate request`);
      return null;
    }
    
    // Mark as processing
    global.processingThumbnails[cacheKey] = true;
    
    try {
      // Check if thumbnail already exists
      try {
        await fs.access(thumbnailPath);
        // If thumbnail exists, return path and store in cache
        const relativePath = `/thumbnails/${cameraId}/${date}/${path.basename(thumbnailPath)}`;
        thumbnailCache.set(cacheKey, relativePath);
        
        // Remove processing marker
        delete global.processingThumbnails[cacheKey];
        
        return relativePath;
      } catch (error) {
        // Thumbnail doesn't exist, need to generate
        // Ensure thumbnail directory exists
        await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
        
        // First check if video file exists
        try {
          await fs.access(videoPath);
        } catch (videoError) {
          console.error(`Video file doesn't exist: ${videoPath}`, videoError);
          delete global.processingThumbnails[cacheKey];
          thumbnailFailCache.add(cacheKey);
          return await useErrorImage(thumbnailPath, cacheKey, cameraId, date);
        }
        
        return new Promise((resolve, reject) => {
          // Add timeout handling to avoid infinite waiting
          const timeoutId = setTimeout(() => {
            console.warn(`Thumbnail generation timed out: ${videoPath}`);
            // Use error image on timeout and record failure
            thumbnailFailCache.add(cacheKey);
            
            // Remove processing marker
            delete global.processingThumbnails[cacheKey];
            
            useErrorImage(thumbnailPath, cacheKey, cameraId, date).then(resolve).catch(reject);
          }, THUMBNAIL_GENERATION_TIMEOUT);
          
          console.log(`Starting to generate thumbnail: ${videoPath}`);
          
          // Use try-catch to wrap ffmpeg call to avoid causing crash
          try {
            ffmpeg(videoPath)
              .on('error', (err) => {
                clearTimeout(timeoutId); // Clear timeout
                console.error('Failed to generate thumbnail:', err);
                // Record failure to avoid retrying
                thumbnailFailCache.add(cacheKey);
                
                // Remove processing marker
                delete global.processingThumbnails[cacheKey];
                
                // Use error image on failure
                useErrorImage(thumbnailPath, cacheKey, cameraId, date).then(resolve).catch(reject);
              })
              .on('end', () => {
                clearTimeout(timeoutId); // Clear timeout
                const relativePath = `/thumbnails/${cameraId}/${date}/${path.basename(thumbnailPath)}`;
                // Store in cache
                thumbnailCache.set(cacheKey, relativePath);
                
                // Remove processing marker
                delete global.processingThumbnails[cacheKey];
                
                resolve(relativePath);
              })
              .screenshots({
                count: 1,
                folder: path.dirname(thumbnailPath),
                filename: path.basename(thumbnailPath),
                size: '320x180', // 16:9 thumbnail size
                timestamps: ['5%'] // Take screenshot from 5% of the video, to avoid black screen
              });
          } catch (ffmpegError) {
            clearTimeout(timeoutId); // Clear timeout
            console.error('Failed to start ffmpeg:', ffmpegError);
            thumbnailFailCache.add(cacheKey);
            delete global.processingThumbnails[cacheKey];
            useErrorImage(thumbnailPath, cacheKey, cameraId, date).then(resolve).catch(reject);
          }
        });
      }
    } catch (error) {
      // Remove processing marker
      delete global.processingThumbnails[cacheKey];
      throw error;
    }
  } catch (error) {
    console.error('Error processing thumbnail:', error);
    return null;
  }
};

console.log('Thumbnail generation function defined');
// Function to use default error image when ffmpeg fails
const useErrorImage = async (thumbnailPath, cacheKey, cameraId, date) => {
  try {
    // Check if default error image exists
    await fs.access(DEFAULT_ERROR_IMAGE);
    
    // Copy default error image to target location
    await fs.copyFile(DEFAULT_ERROR_IMAGE, thumbnailPath);
    
    // Return relative path
    const relativePath = `/thumbnails/${cameraId}/${date}/${path.basename(thumbnailPath)}`;
    thumbnailCache.set(cacheKey, relativePath);
    return relativePath;
  } catch (error) {
    console.error('Failed to copy error image:', error);
    // If unable to copy error image, return fixed error image path
    return '/error_thumbnail.jpg';
  }
};

// Get camera name from config, or use default format if not exists
const getCameraName = (cameraId) => {
  return config.cameras[cameraId] || `相機 ${cameraId}`;
};

// Parse date string
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

// Get all camera list
app.get('/api/cameras', async (req, res) => {
  try {
    const cameraDirs = await fs.readdir(VIDEO_BASE_PATH);
    
    const cameras = await Promise.all(cameraDirs.map(async (cameraId) => {
      // Check if it's a directory
      const stats = await fs.stat(path.join(VIDEO_BASE_PATH, cameraId));
      if (stats.isDirectory()) {
        // Get camera name from config file
        const name = getCameraName(cameraId);
        return { id: cameraId, name };
      }
      return null;
    }));
    
    // Filter out non-directory items
    res.json(cameras.filter(camera => camera !== null));
  } catch (error) {
    console.error('Failed to get camera list:', error);
    res.status(500).json({ error: 'Failed to get camera list' });
  }
});

// Get specific camera's date list
app.get('/api/cameras/:cameraId/dates', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const cameraPath = path.join(VIDEO_BASE_PATH, cameraId);
    
    // Check if camera directory exists
    try {
      await fs.access(cameraPath);
    } catch (error) {
      return res.status(404).json({ error: 'Cannot find specified camera' });
    }
    
    const dateDirs = await fs.readdir(cameraPath);
    
    const dates = await Promise.all(dateDirs.map(async (dateDir) => {
      const stats = await fs.stat(path.join(cameraPath, dateDir));
      if (stats.isDirectory()) {
        // Use date parsing function from config
        const dateInfo = parseDateString(dateDir);
        return {
          date: dateDir,
          label: dateInfo.formatted
        };
      }
      return null;
    }));
    
    // Sort dates (ascending - from early to late)
    const sortedDates = dates
      .filter(date => date !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json(sortedDates);
  } catch (error) {
    console.error(`Failed to get date list for camera ${req.params.cameraId}:`, error);
    res.status(500).json({ error: `Failed to get date list` });
  }
});

// WebSocket connection processing
io.on('connection', (socket) => {
  console.log('New WebSocket connection:', socket.id);
  
  // Join specific camera and date room
  socket.on('joinRoom', ({ cameraId, date }) => {
    const room = `${cameraId}_${date}`;
    socket.join(room);
    console.log(`Client ${socket.id} joined room ${room}`);
  });
  
  // Leave room
  socket.on('leaveRoom', ({ cameraId, date }) => {
    const room = `${cameraId}_${date}`;
    socket.leave(room);
    console.log(`Client ${socket.id} left room ${room}`);
    
    // Check if room still has other clients
    const roomClients = io.sockets.adapter.rooms.get(room);
    if (!roomClients || roomClients.size === 0) {
      // If room has no clients, clean up related resources
      console.log(`Room ${room} has no clients, clean up resources`);
      global.completedRooms.delete(room);
    }
  });
  
  // Process specific video information request
  socket.on('requestVideoInfo', async ({ cameraId, date, videoId }) => {
    try {
      console.log(`Received special request for video ${videoId}`);
      
      // Get video file path
      const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
      const videoFiles = await fs.readdir(videosPath);
      
      // Find matching video
      const videoFile = videoFiles.find(file => file.endsWith('.mp4') && file.replace('.mp4', '') === videoId);
      
      if (videoFile) {
        const filePath = path.join(videosPath, videoFile);
        // Get video duration
        const duration = await getVideoDuration(filePath);
        
        // Send information back to client
        const room = `${cameraId}_${date}`;
        io.to(room).emit('durationUpdated', {
          videoId,
          duration: duration || 'Unknown',
          timestamp: Date.now(),
          isSpecialRequest: true
        });
        
        console.log(`Responded to special request: Video ${videoId} duration is ${duration || 'Unknown'}`);
      } else {
        console.error(`Cannot find requested video: ${videoId}`);
      }
    } catch (error) {
      console.error(`Failed to process special video information request:`, error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('WebSocket client disconnected:', socket.id);
  });
});

// Batch processing function - used to process large number of videos
const processBatch = async (videos, videosPath, cameraId, date, room, io, startIndex = 0) => {
  const totalVideos = videos.length;
  const endIndex = Math.min(startIndex + VIDEO_BATCH_SIZE, totalVideos);
  
  // If room is marked as completed, don't process
  if (global.completedRooms.has(room)) {
    console.log(`Room ${room} is already processed, skipping remaining batches`);
    return;
  }
  
  // console.log(`Processing batch: ${startIndex} to ${endIndex-1} (Total ${totalVideos} videos)`);
  
  // First process first video - prioritize processing
  if (startIndex === 0 && videos.length > 0) {
    const firstVideo = videos[0];
    const filePath = path.join(videosPath, firstVideo.name);
    
    try {
      // Get duration
      const duration = await getVideoDuration(filePath);
      
      // Check if room is still being processed
      if (!global.completedRooms.has(room)) {
        // Notify clients duration is obtained
        io.to(room).emit('durationUpdated', { 
          videoId: firstVideo.id, 
          duration: duration || 'Unknown',
          timestamp: Date.now(),
          index: 0,
          total: totalVideos,
          isFirstVideo: true
        });
      }
      
      // Get thumbnail
      const thumbnailFileName = `${cameraId}_${date}_${firstVideo.id}.jpg`;
      const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
      
      const thumbnail = await generateThumbnail(filePath, thumbnailPath, cameraId, date, firstVideo.id);
      
      if (thumbnail && !global.completedRooms.has(room)) {
        io.to(room).emit('thumbnailGenerated', { 
          videoId: firstVideo.id, 
          thumbnail
        });
      }
    } catch (error) {
      console.error(`Failed to process first video (${firstVideo.name}):`, error);
    }
  }
  
  // Then process other videos in the batch
  for (let i = Math.max(startIndex, 1); i < endIndex; i++) {
    // Check if room is still being processed
    if (global.completedRooms.has(room)) {
      console.log(`Room ${room} is already processed, stop current batch processing`);
      break;
    }
    
    const video = videos[i];
    const filePath = path.join(videosPath, video.name);
    
    try {
      // Get duration
      const duration = await getVideoDuration(filePath);
      
      // Check if room is still being processed
      if (!global.completedRooms.has(room)) {
        // Notify clients duration is obtained
        io.to(room).emit('durationUpdated', { 
          videoId: video.id, 
          duration: duration || 'Unknown',
          timestamp: Date.now(),
          index: i,
          total: totalVideos
        });
      }
      
      // Get thumbnail
      const thumbnailFileName = `${cameraId}_${date}_${video.id}.jpg`;
      const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
      
      const thumbnail = await generateThumbnail(filePath, thumbnailPath, cameraId, date, video.id);
      
      if (thumbnail && !global.completedRooms.has(room)) {
        io.to(room).emit('thumbnailGenerated', { 
          videoId: video.id, 
          thumbnail
        });
      }
    } catch (error) {
      console.error(`Failed to process video (${video.name}):`, error);
      
      if (!global.completedRooms.has(room)) {
        io.to(room).emit('durationUpdated', { 
          videoId: video.id, 
          duration: 'Processing error',
          error: true,
          timestamp: Date.now(),
          index: i,
          total: totalVideos
        });
      }
    }
  }
  
  // If there are more batches, continue processing
  if (endIndex < totalVideos && !global.completedRooms.has(room)) {
    setTimeout(() => {
      processBatch(videos, videosPath, cameraId, date, room, io, endIndex);
    }, BATCH_INTERVAL);
  } else if (endIndex >= totalVideos && !global.completedRooms.has(room)) {
    // Send notification of all processing completed
    io.to(room).emit('processingComplete', { 
      totalVideos,
      timestamp: Date.now()
    });
    
    // Mark room as completed
    global.completedRooms.add(room);
    console.log(`Room ${room} processing completed, marked as completed`);
  }
};

// Special API endpoint for single video duration
app.get('/api/video-duration/:cameraId/:date/:videoId', async (req, res) => {
  try {
    const { cameraId, date, videoId } = req.params;
    const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
    
    // Check if directory exists
    try {
      await fs.access(videosPath);
    } catch (error) {
      return res.status(404).json({ error: 'Cannot find specified date directory' });
    }
    
    // Find matching video file
    const videoFiles = await fs.readdir(videosPath);
    const videoFile = videoFiles.find(file => file.endsWith('.mp4') && file.replace('.mp4', '') === videoId);
    
    if (!videoFile) {
      return res.status(404).json({ error: 'Cannot find specified video' });
    }
    
    // Get video duration
    const filePath = path.join(videosPath, videoFile);
    const duration = await getVideoDuration(filePath);
    
    res.json({ 
      videoId,
      duration: duration || 'Unknown',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Failed to get video duration:`, error);
    res.status(500).json({ error: 'Failed to get video duration' });
  }
});

// Batch process video thumbnails and duration
app.get('/api/process-videos/:cameraId/:date', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
    
    // Check if directory exists
    try {
      await fs.access(videosPath);
    } catch (error) {
      return res.status(404).json({ error: 'Cannot find specified date directory' });
    }
    
    // Get video list
    const videoFiles = await fs.readdir(videosPath);
    
    // Filter out .mp4 files and process
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
    
    // Build room name
    const room = `${cameraId}_${date}`;
    
    // Immediately return confirmation information
    res.json({ 
      status: 'processing',
      totalVideos: videos.length,
      message: `Starting to process ${videos.length} videos, process will be notified through WebSocket`
    });
    
    // Start processing in background
    processBatch(videos, videosPath, cameraId, date, room, io, 0);
    
  } catch (error) {
    console.error(`Failed to batch process videos:`, error);
    res.status(500).json({ error: 'Failed to batch process videos' });
  }
});

// Get specific camera and date video list
app.get('/api/cameras/:cameraId/dates/:date/videos', async (req, res) => {
  try {
    const { cameraId, date } = req.params;
    const videosPath = path.join(VIDEO_BASE_PATH, cameraId, date);
    
    // Check if video directory exists
    try {
      await fs.access(videosPath);
    } catch (error) {
      return res.status(404).json({ error: 'Cannot find specified date directory' });
    }
    
    const videoFiles = await fs.readdir(videosPath);
    
    // Filter out .mp4 files
    const videos = videoFiles
      .filter(file => file.endsWith('.mp4'))
      .map((file) => {
        // Parse file name for information
        const nameWithoutExt = file.replace('.mp4', '');
        const parts = nameWithoutExt.split('_');
        const startTime = parts[0]; // For example "55M55S" - video start time (minutes:seconds)
        const timestamp = parts[1] ? parseInt(parts[1], 10) : 0;
        
        // Build thumbnail path (without waiting for generation)
        const thumbnailFileName = `${cameraId}_${date}_${nameWithoutExt}.jpg`;
        const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, date, thumbnailFileName);
        
        return {
          id: nameWithoutExt,
          name: file,
          timestamp,
          startTime: startTime.replace('M', ':').replace('S', ''), // Format as "minutes:seconds" format
          duration: 'Loading', // Return loading first, update later
          thumbnail: `/thumbnails/${cameraId}/${date}/${thumbnailFileName}`
        };
      });
    
    // Sort by file name (to improve user experience)
    videos.sort((a, b) => a.name.localeCompare(b.name));
    
    // First return basic information, let frontend quickly display
    res.json(videos);
    
    // In background, perform thumbnail generation and duration retrieval
    (async () => {
      try {
        const room = `${cameraId}_${date}`;
        
        // Use batch processing to improve efficiency
        processBatch(videos, videosPath, cameraId, date, room, io, 0);
        
      } catch (error) {
        console.error('Background processing video information failed:', error);
      }
    })();
  } catch (error) {
    console.error(`Failed to get video list for camera ${req.params.cameraId} date ${req.params.date}:`, error);
    res.status(500).json({ error: 'Failed to get video list' });
  }
});

// Get specific thumbnail at specific time point
app.get('/api/thumbnails/:cameraId/:dateStr', async (req, res) => {
  try {
    const { cameraId, dateStr } = req.params;
    const cacheKey = `${cameraId}_${dateStr}_thumb`;
    
    // Check if it's a known failed thumbnail
    if (thumbnailFailCache.has(cacheKey)) {
      console.log(`Directly return error image: ${cacheKey}`);
      return res.sendFile(DEFAULT_ERROR_IMAGE);
    }
    
    // Check if it's being processed
    if (global.processingThumbnails[cacheKey]) {
      console.log(`Thumbnail ${cacheKey} is being processed, return waiting status`);
      return res.status(202).json({ status: 'processing', message: 'Thumbnail is being generated, please try again later' });
    }
    
    // Parse date string
    const dateInfo = parseDateString(dateStr);
    const formattedDate = dateInfo.formatted;
    
    // Check if camera and date directory exists
    const datePath = path.join(VIDEO_BASE_PATH, cameraId, dateStr);
    
    try {
      await fs.access(datePath);
    } catch (error) {
      thumbnailFailCache.add(cacheKey);
      return res.status(404).json({ error: 'Cannot find specified date directory' });
    }
    
    // Find first video file of that time point
    const videoFiles = await fs.readdir(datePath);
    const mp4Files = videoFiles.filter(file => file.endsWith('.mp4'));
    
    if (mp4Files.length === 0) {
      thumbnailFailCache.add(cacheKey);
      return res.status(404).json({ error: 'No video found at specified time' });
    }
    
    // Take first video to generate thumbnail
    const firstVideoFile = mp4Files[0];
    const videoPath = path.join(datePath, firstVideoFile);
    
    // Generate thumbnail file name and path
    const thumbnailFileName = `${cameraId}_${dateStr}_thumb.jpg`;
    const thumbnailPath = path.join(THUMBNAIL_BASE_PATH, cameraId, thumbnailFileName);
    const thumbnailDir = path.dirname(thumbnailPath);
    
    // Ensure thumbnail directory exists
    await fs.mkdir(thumbnailDir, { recursive: true });
    
    // Try to get existing thumbnail, if not exists generate
    try {
      await fs.access(thumbnailPath);
      // If thumbnail exists, return directly
      return res.sendFile(thumbnailPath);
    } catch (error) {
      // Thumbnail doesn't exist, need to generate
      console.log(`Generating thumbnail for camera ${cameraId} date ${dateStr}`);
      
      // Mark as processing
      global.processingThumbnails[cacheKey] = true;
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          delete global.processingThumbnails[cacheKey];
          reject(new Error('Thumbnail generation timed out'));
        }, THUMBNAIL_GENERATION_TIMEOUT);
      });
      
      console.log(`Starting to generate thumbnail2: ${videoPath}`);
      // Thumbnail generation processing
      const ffmpegPromise = new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on('error', (err) => {
            console.error('Failed to generate thumbnail:', err);
            thumbnailFailCache.add(cacheKey);
            delete global.processingThumbnails[cacheKey];
            reject(err);
          })
          .on('end', () => {
            delete global.processingThumbnails[cacheKey];
            resolve(thumbnailPath);
          })
          .screenshots({
            count: 1,
            folder: thumbnailDir,
            filename: path.basename(thumbnailPath),
            size: '320x180', // 16:9 thumbnail size
            timestamps: ['5%'] // Take screenshot from 5% of the video, to avoid black screen
          });
      });
      
      // Use Promise.race to handle possible timeout situations
      try {
        const result = await Promise.race([ffmpegPromise, timeoutPromise]);
        return res.sendFile(result);
      } catch (err) {
        console.error('Thumbnail generation failed or timed out:', err);
        thumbnailFailCache.add(cacheKey);
        delete global.processingThumbnails[cacheKey];
        
        // Use default error image
        try {
          await fs.copyFile(DEFAULT_ERROR_IMAGE, thumbnailPath);
          return res.sendFile(thumbnailPath);
        } catch (copyErr) {
          // If even copying fails, directly return error image
          if (await fileExists(DEFAULT_ERROR_IMAGE)) {
            return res.sendFile(DEFAULT_ERROR_IMAGE);
          } else {
            return res.status(500).json({ error: 'Cannot generate thumbnail' });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to get thumbnail:`, error);
    return res.status(500).json({ error: 'Failed to get thumbnail' });
  }
});

// Helper function to check if file exists
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// All other requests return React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
}); 