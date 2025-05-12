import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { getDateVideos, formatTimestamp, parseDateString, getVideoDuration, processVideos, getApiBaseUrl, clearDurationCache, getCameraName } from '../utils/dataUtils';
import theme from '../utils/theme';
import { io } from 'socket.io-client';

const PageTitle = styled.h1`
  color: ${theme.text.primary};
  margin-bottom: 0.5rem;
`;

const SubTitle = styled.h2`
  color: ${theme.text.muted};
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: 1rem;
  color: ${theme.text.muted};
  text-decoration: none;
  
  &:hover {
    color: ${theme.primary.main};
    text-decoration: underline;
  }
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  
  @media (min-width: 768px) {
    gap: 1.5rem;
  }
  
  @media (max-width: 767px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
  }
`;

const VideoCard = styled.div`
  background-color: ${theme.background.paper};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: ${theme.shadow.sm};
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.shadow.md};
  }
`;

const ThumbnailContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background-color: ${theme.background.sidebar};
  overflow: hidden;
`;

const Thumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlayIcon = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 32px;
  height: 32px;
  background-color: rgba(59, 130, 246, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  opacity: 0.8;
  transition: opacity 0.2s, transform 0.2s;
  
  ${VideoCard}:hover & {
    opacity: 1;
    transform: scale(1.1);
  }
`;

const VideoInfo = styled.div`
  padding: 1rem;
  
  @media (max-width: 767px) {
    padding: 0.5rem;
  }
`;

const VideoTitle = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: ${theme.text.primary};
  
  @media (max-width: 767px) {
    margin: 0;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${theme.text.muted};
  font-size: 0.9rem;
  
  @media (max-width: 767px) {
    display: none;
  }
`;

// Add a loading thumbnail placeholder
const ThumbnailPlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: ${theme.background.sidebar};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.text.muted};
  font-size: 0.9rem;
`;

// Add a loading animation effect
const LoadingText = styled.span`
  color: ${theme.text.muted};
  font-style: italic;
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  
  animation: pulse 1.5s infinite;
`;

const VideoTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: ${theme.background.paper};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: ${theme.shadow.sm};
`;

const TableHeader = styled.thead`
  background-color: ${theme.background.sidebar};
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: ${theme.background.default};
  }
  
  &:hover {
    background-color: ${theme.border.light};
  }
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: ${theme.text.primary};
  border-bottom: 2px solid ${theme.border.light};
  
  @media (max-width: 767px) {
    &.hide-mobile {
      display: none;
    }
  }
`;

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${theme.border.light};
  
  @media (max-width: 767px) {
    &.hide-mobile {
      display: none;
    }
  }
`;

const ThumbnailCell = styled(TableCell)`
  width: 120px;
  padding: 0.5rem;
`;

const TableThumbnail = styled.div`
  width: 120px;
  height: 67px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  background-color: ${theme.background.sidebar};
`;

const TableThumbnailImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const VideoLink = styled(Link)`
  color: ${theme.primary.main};
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const OrderInfo = styled.div`
  margin-bottom: 1rem;
  color: ${theme.text.muted};
  font-size: 0.9rem;
  font-style: italic;
`;

const ViewToggle = styled.div`
  display: flex;
  margin-bottom: 1rem;
`;

const ToggleButton = styled.button`
  background-color: ${props => props.active ? theme.primary.main : theme.background.sidebar};
  color: ${props => props.active ? theme.primary.contrastText : theme.text.secondary};
  border: none;
  padding: 0.5rem 1rem;
  margin-right: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.active ? theme.primary.dark : theme.border.light};
  }
`;

// Determine which columns to display based on screen width
const useResponsiveColumns = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return { isMobile };
};

// Create a global variable specifically for storing video durations
let globalVideoDurations = {};
let firstVideoProcessed = false;
let firstVideoInfo = { id: null, duration: null };

const VideoList = () => {
  const { cameraId, date } = useParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' 或 'table'
  const dateInfo = parseDateString(date);
  const { isMobile } = useResponsiveColumns();
  const [thumbnailErrors, setThumbnailErrors] = useState({});
  const [thumbnailLoading, setThumbnailLoading] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // for progress bar
  const [socketRetries, setSocketRetries] = useState(0); // for websocket reconnect
  const [cameraName, setCameraName] = useState(cameraId); // for camera name
  
  // for processed count and other persistent states
  const processedCount = useRef(0);
  const socketRef = useRef(null);
  const completionTimeoutRef = useRef(null);
  const videoListRef = useRef([]);  // for current loaded video list
  
  // for thumbnail errors from localStorage
  useEffect(() => {
    if (!cameraId || !date) return;
    
    try {
      const key = `thumbnailErrors_${cameraId}_${date}`;
      const savedErrors = localStorage.getItem(key);
      
      if (savedErrors) {
        const parsedErrors = JSON.parse(savedErrors);
        console.log(`from localStorage loaded ${Object.keys(parsedErrors).length} thumbnail errors`);
        setThumbnailErrors(parsedErrors);
      }
    } catch (error) {
      console.error('read thumbnail error cache failed:', error);
    }
  }, [cameraId, date]);
  
  // save thumbnail errors to localStorage
  const saveThumbnailErrors = useCallback((errors) => {
    if (!cameraId || !date) return;
    
    try {
      const key = `thumbnailErrors_${cameraId}_${date}`;
      localStorage.setItem(key, JSON.stringify(errors));
    } catch (error) {
      console.error('save thumbnail error cache failed:', error);
    }
  }, [cameraId, date]);
  
  // get API base URL
  const getApiBaseUrl = useCallback(() => {
    // if in production, use relative path
    if (process.env.NODE_ENV === 'production') {
      return '';
    }
    
    // try to get from environment variable
    if (process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }
    
    // use environment variable IP and port, if not set, use default value
    const apiHost = process.env.REACT_APP_API_HOST || '192.168.68.69';
    const apiPort = process.env.REACT_APP_API_PORT || '5001';
    
    return `http://${apiHost}:${apiPort}`;
  }, []);
  
  // Handle thumbnail loading errors
  const handleThumbnailError = (videoId) => {
    console.warn(`Thumbnail ${videoId} failed to load, using placeholder image`);
    // If already marked as error, don't process again
    if (thumbnailErrors[videoId]) return;
    
    const updatedErrors = {
      ...thumbnailErrors,
      [videoId]: true
    };
    
    setThumbnailErrors(updatedErrors);
    saveThumbnailErrors(updatedErrors);
    // Removed auto-retry logic to avoid page constantly refreshing
  };
  
  // Handle thumbnail loading state
  const handleThumbnailLoading = (videoId, isLoading) => {
    setThumbnailLoading(prev => ({
      ...prev,
      [videoId]: isLoading
    }));
  };
  
  // Update a specific video's duration
  const updateVideoDuration = useCallback((videoId, duration) => {
    // Only increment counter if actually updating with valid duration
    const isValidDuration = duration && duration !== '載入中';
    
    // Store in global variable to maintain across page views
    if (isValidDuration) {
      globalVideoDurations[videoId] = duration;
    }
    
    setVideos(prevVideos => {
      const updatedVideo = { ...prevVideos.find(v => v.id === videoId) };
      if (updatedVideo && updatedVideo.duration === '載入中' && isValidDuration) {
        // Only increment counter when changing from "Loading..." to actual duration
        processedCount.current += 1;
      }
      
      // Return updated video list
      return prevVideos.map(video => 
        video.id === videoId ? { ...video, duration } : video
      );
    });
  }, []);
  
  // Update a specific video's thumbnail
  const updateVideoThumbnail = useCallback((videoId, thumbnail) => {
    console.log(`Updating thumbnail for video ${videoId}`);
    
    // If already marked as error, don't try to update
    if (thumbnailErrors[videoId]) {
      console.log(`Video ${videoId} thumbnail already marked as error, skipping update`);
      return;
    }
    
    setVideos(prevVideos => prevVideos.map(video => 
      video.id === videoId ? { ...video, thumbnail } : video
    ));
    
    // Clear error status after successful thumbnail generation
    const updatedErrors = {
      ...thumbnailErrors,
      [videoId]: false
    };
    setThumbnailErrors(updatedErrors);
    saveThumbnailErrors(updatedErrors);
  }, [thumbnailErrors, saveThumbnailErrors]);
  
  // for preload thumbnails
  const preloadNextThumbnails = useCallback((currentVideoIndex, count = 3) => {
    if (!videoListRef.current || videoListRef.current.length === 0) return;
    
    const startIdx = currentVideoIndex + 1;
    const endIdx = Math.min(startIdx + count, videoListRef.current.length);
    
    for (let i = startIdx; i < endIdx; i++) {
      const video = videoListRef.current[i];
      if (!video) continue;
      
      // skip known failed thumbnails
      if (thumbnailErrors[video.id]) {
        console.log(`skip known failed thumbnails: ${video.id}`);
        continue;
      }
      
      const img = new Image();
      const thumbnailUrl = video.thumbnail 
        ? `${getApiBaseUrl()}${video.thumbnail}` 
        : `${getApiBaseUrl()}/thumbnails/${cameraId}/${date}/${cameraId}_${date}_${video.id}.jpg`;
        
      img.src = thumbnailUrl;
      console.log(`preload thumbnails: ${video.id}`);
    }
  }, [cameraId, date, getApiBaseUrl, thumbnailErrors]);
  
  // for websocket connection
  useEffect(() => {
    if (!cameraId || !date) return;
    
    let socketInstance = null;
    
    // initialize websocket
    const initSocket = () => {
      const socket = io(getApiBaseUrl(), {
        reconnectionAttempts: 10, // increase reconnect attempts
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
      
      socketRef.current = socket;
      
      // after connection, join specified room
      socket.on('connect', () => {
        console.log('WebSocket connection successful');
        setSocketConnected(true);
        setSocketRetries(0); // reset reconnect attempts
        socket.emit('joinRoom', { cameraId, date });
      });
      
      // disconnect
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket connection disconnected, reason: ${reason}`);
        setSocketConnected(false);
      });
      
      // try to reconnect
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`try to reconnect (${attemptNumber}/10)`);
        setSocketRetries(attemptNumber);
      });
      
      // reconnect successful
      socket.on('reconnect', () => {
        console.log('WebSocket reconnect successful');
        setSocketConnected(true);
        setSocketRetries(0); // reset reconnect attempts
        socket.emit('joinRoom', { cameraId, date });
      });
      
      // reconnect failed
      socket.on('reconnect_failed', () => {
        console.error('reconnect failed, no more attempts');
        
        // if reconnect failed, update all "loading" durations to "unknown"
        setVideos(prevVideos => prevVideos.map(video => 
          video.duration === '載入中' ? { ...video, duration: '連接失敗' } : video
        ));
      });
      
      // receive thumbnail generation complete notification
      socket.on('thumbnailGenerated', data => {
        if (data.videoId && data.thumbnail) {
          console.log(`received thumbnail update for video ${data.videoId}`);
          
          // check if this video's thumbnail is already marked as error
          if (thumbnailErrors[data.videoId]) {
            console.log(`video ${data.videoId} thumbnail is already marked as error, ignore update notification`);
            return;
          }
          
          updateVideoThumbnail(data.videoId, data.thumbnail);
          
          // find the position of current video in the list, and preload next thumbnails
          const videoIndex = videoListRef.current.findIndex(v => v.id === data.videoId);
          if (videoIndex !== -1) {
            preloadNextThumbnails(videoIndex);
          }
        }
      });
      
      // receive duration update notification
      socket.on('durationUpdated', data => {
        console.log(`received duration update for video ${data.videoId}:`, data);
        
        if (!data || !data.videoId) {
          console.error('received invalid duration update data:', data);
          return;
        }
        
        // handle first video specially
        if (data.isFirstVideo || (firstVideoInfo.id && data.videoId === firstVideoInfo.id)) {
          console.log(`received duration update for first video ${data.videoId}: ${data.duration}`);
          
          // immediately save first video duration
          if (data.duration && data.duration !== '載入中') {
            firstVideoInfo.duration = data.duration;
            firstVideoProcessed = true;
          }
          
          // ensure first video update successfully by multiple ways
          updateVideoDuration(data.videoId, data.duration);
          
          // immediately update status
          setVideos(prevVideos => {
            if (prevVideos.length > 0 && prevVideos[0].id === data.videoId) {
              return [
                { ...prevVideos[0], duration: data.duration },
                ...prevVideos.slice(1)
              ];
            }
            return prevVideos;
          });
          
          // ensure update by delaying processing
          setTimeout(() => {
            setVideos(prevVideos => {
              if (prevVideos.length > 0 && prevVideos[0].id === data.videoId && 
                  (prevVideos[0].duration === '載入中' || !prevVideos[0].duration)) {
                console.log(`confirm update first video ${data.videoId} duration`);
                return [
                  { ...prevVideos[0], duration: data.duration },
                  ...prevVideos.slice(1)
                ];
              }
              return prevVideos;
            });
          }, 500);
        }
        
        // update processing progress (based on server sent index)
        if (data.index !== undefined && data.total) {
          const newProgress = Math.min(100, Math.round(((data.index + 1) / data.total) * 100));
          
          // only update when new progress is greater than old progress, avoid progress bar jumping back
          setLoadingProgress(prevProgress => {
            // if processing is completed (progress is 101), no longer respond to any progress update
            if (prevProgress >= 101) {
              return prevProgress;
            }
            
            if (newProgress > prevProgress) {
              console.log(`update progress: ${newProgress}% (${data.index + 1}/${data.total})`);
              return newProgress;
            } else {
              // if received progress value is less than current progress, ignore
              console.log(`ignore smaller progress value: ${newProgress}% (current progress: ${prevProgress}%)`);
              return prevProgress;
            }
          });
        }
        
        if (data.duration) {
          console.log(`✅ update video ${data.videoId} duration to: ${data.duration}`);
          updateVideoDuration(data.videoId, data.duration);
        } else {
          console.warn(`⚠️ video ${data.videoId} duration update to empty value`);
          updateVideoDuration(data.videoId, '未知');
        }
      });
      
      // receive processing complete notification
      socket.on('processingComplete', data => {
        console.log(`all videos processed (total ${data.totalVideos} videos)`, data);
        
        // force set progress to 100%
        setLoadingProgress(100);
        
        // clear completion timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
        
        // check if all videos are processed
        setVideos(prevVideos => {
          const pendingVideos = prevVideos.filter(v => v.duration === '載入中');
          
          if (pendingVideos.length > 0) {
            console.warn(`${pendingVideos.length} videos are not processed, mark as unknown`);
            
            // mark all unprocessed videos as unknown
            return prevVideos.map(video => 
              video.duration === '載入中' ? { ...video, duration: '未知' } : video
            );
          }
          
          return prevVideos;
        });
        
        // auto hide progress after 3 seconds
        setTimeout(() => {
          setLoadingProgress(prevProgress => prevProgress === 100 ? 101 : prevProgress); // 101 indicates completed and should be hidden
          
          // cancel listening to progress update message, avoid receiving unnecessary old messages
          if (socket) {
            // optional: remove specific event listener, avoid unnecessary processing
            socket.off('durationUpdated');
            console.log('cancel listening to progress update message');
          }
        }, 3000);
      });
      
      // connection error handling
      socket.on('error', error => {
        console.error('WebSocket connection error:', error);
      });
      
      return socket;
    };
    
    // initialize WebSocket
    socketInstance = initSocket();
    
    // add duration update timeout handling
    const durationTimeout = setTimeout(() => {
      console.log('duration get timeout, update all "loading" duration to "unknown"');
      setVideos(prevVideos => prevVideos.map(video => 
        video.duration === '載入中' ? { ...video, duration: '未知' } : video
      ));
    }, 60000); // 60 seconds later, if still showing "loading", update to "unknown"
    
    // add overall completion timeout handling, ensure even processingComplete event is lost, it can be completed
    completionTimeoutRef.current = setTimeout(() => {
      console.log('processing complete notification timeout, force set to completed state');
      setLoadingProgress(100);
      setVideos(prevVideos => prevVideos.map(video => 
        video.duration === '載入中' ? { ...video, duration: '未知 (超時)' } : video
      ));
    }, 120000); // 2 minutes later, force completion
    
    // clean up when component unmounts
    return () => {
      console.log('leave page, close WebSocket connection');
      clearTimeout(durationTimeout);
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      if (socketInstance && socketInstance.connected) {
        socketInstance.emit('leaveRoom', { cameraId, date });
        socketInstance.disconnect();
      }
    };
  }, [cameraId, date, getApiBaseUrl, updateVideoDuration, updateVideoThumbnail, preloadNextThumbnails, thumbnailErrors]);
  
  // clean up when component unmounts, or cameraId/date changes
  useEffect(() => {
    return () => {
      console.log('leave page, clear video duration cache');
      clearDurationCache(cameraId, date);
    };
  }, [cameraId, date]);
  
  // load video list
  useEffect(() => {
    const loadVideos = async () => {
      try {
        // reset processed count
        processedCount.current = 0;
        setLoadingProgress(0);
        firstVideoProcessed = false; // reset first video processed state
        
        // load video list
        const videoList = await getDateVideos(cameraId, date);
        
        // save video list to ref for later use
        videoListRef.current = videoList;
        
        // apply existing duration data (if any)
        const updatedVideoList = await Promise.all(videoList.map(async (video) => {
          // check if there is cached duration data
          if (globalVideoDurations[video.id]) {
            return {
              ...video, 
              duration: globalVideoDurations[video.id]
            };
          }
          
          // if there is saved first video info, apply it directly
          if (firstVideoInfo.id === video.id && firstVideoInfo.duration) {
            return {
              ...video,
              duration: firstVideoInfo.duration
            };
          }
          
          // get duration from cache API (if cached, it will return directly)
          try {
            const duration = await getVideoDuration(cameraId, date, video.id);
            if (duration && duration !== '未知') {
              // update global cache
              globalVideoDurations[video.id] = duration;
              return {
                ...video,
                duration
              };
            }
          } catch (err) {
            console.error(`failed to get duration for video ${video.id}`, err);
          }
          
          return video;
        }));
        
        setVideos(updatedVideoList);
        
        // check if all videos have valid duration data
        const allVideosHaveDuration = updatedVideoList.every(video => 
          video.duration && video.duration !== '載入中' && video.duration !== '未知'
        );
        
        // preload thumbnails for the first few videos
        for (let i = 0; i < Math.min(5, videoList.length); i++) {
          preloadNextThumbnails(i-1, 1); // preload one thumbnail at a time
        }
        
        // save first video id
        if (videoList.length > 0) {
          firstVideoInfo.id = videoList[0].id;
          
          // if all videos have duration data, set completed state and skip processing
          if (allVideosHaveDuration) {
            console.log('all videos duration data is from cache, skip processing');
            setLoadingProgress(101); // set to 101 to indicate completed and should be hidden
            return; // skip processing
          }
          
          // immediately send request to get first video info
          setTimeout(() => {
            const socket = socketRef.current;
            if (socket && socket.connected) {
              console.log('actively request first video info');
              socket.emit('requestVideoInfo', { 
                cameraId, 
                date, 
                videoId: videoList[0].id,
                priority: 'high'
              });
            }
          }, 500);
          
          // check and request first video info after 3 seconds
          setTimeout(() => {
            setVideos(prevVideos => {
              if (prevVideos.length > 0 && prevVideos[0].duration === '載入中') {
                console.log('3 seconds later, still not get first video duration, request again');
                const socket = socketRef.current;
                if (socket && socket.connected) {
                  socket.emit('requestVideoInfo', { 
                    cameraId, 
                    date, 
                    videoId: prevVideos[0].id,
                    priority: 'urgent'
                  });
                }
              }
              return prevVideos;
            });
          }, 3000);
          
          // check and request first video info after 6 seconds
          setTimeout(() => {
            setVideos(prevVideos => {
              if (prevVideos.length > 0 && prevVideos[0].duration === '載入中') {
                console.log('6 seconds later, still not get first video duration, use emergency solution');
                // use new direct API to get video duration
                getVideoDuration(cameraId, date, prevVideos[0].id)
                  .then(duration => {
                    if (duration) {
                      console.log(`get first video duration from API: ${duration}`);
                      updateVideoDuration(prevVideos[0].id, duration);
                      firstVideoInfo.duration = duration;
                    }
                  })
                  .catch(err => console.error('failed to get first video duration:', err));
              }
              return prevVideos;
            });
          }, 6000);
        }
        
        // trigger backend batch processing after loading the list
        if (videoList.length > 0) {
          setTimeout(() => {
            processVideos(cameraId, date)
              .then(response => {
                console.log('trigger video batch processing:', response);
              })
              .catch(error => {
                console.error('failed to trigger batch processing:', error);
              });
          }, 1000);
        }
      } catch (error) {
        console.error('failed to load video list:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (cameraId && date) {
      loadVideos();
    }
  }, [cameraId, date, updateVideoDuration, preloadNextThumbnails]);

  // load camera name
  useEffect(() => {
    if (!cameraId) return;
    
    const loadCameraName = async () => {
      const name = await getCameraName(cameraId);
      setCameraName(name);
    };
    
    loadCameraName();
  }, [cameraId]);

  if (loading) {
    return <div>載入中...</div>;
  }
  
  // thumbnail loading optimization function - delay loading thumbnails not in the visible area
  const getThumbnailUrl = (video) => {
    // if we already know this thumbnail loading will fail, return placeholder image directly
    if (thumbnailErrors[video.id]) {
      return "/placeholder-thumbnail.svg";
    }
    
    // if the video has thumbnail path, use it
    if (video.thumbnail) {
      return `${getApiBaseUrl()}${video.thumbnail}`;
    }
    
    // otherwise use standard path
    return `${getApiBaseUrl()}/thumbnails/${cameraId}/${date}/${cameraId}_${date}_${video.id}.jpg`;
  };
  
  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <BackLink to={`/camera/${cameraId}`}>← 返回日期列表</BackLink>
      </div>
      
      <PageTitle>監視錄影影片</PageTitle>
      <SubTitle>
        {cameraName} - {dateInfo.formatted}
      </SubTitle>
      
      {videos.length === 0 ? (
        <p>此時段沒有錄影資料。</p>
      ) : (
        <>
          <OrderInfo>按時間順序顯示（從早到晚）</OrderInfo>
          
          <ViewToggle>
            <ToggleButton 
              active={viewMode === 'grid'} 
              onClick={() => setViewMode('grid')}
            >
              縮略圖檢視
            </ToggleButton>
            <ToggleButton 
              active={viewMode === 'table'} 
              onClick={() => setViewMode('table')}
            >
              表格檢視
            </ToggleButton>
          </ViewToggle>
          
          {viewMode === 'grid' ? (
            <VideoGrid>
              {videos.map(video => (
                <VideoCard key={video.id}>
                  <Link to={`/camera/${cameraId}/date/${date}/video/${video.id}`}>
                    <ThumbnailContainer>
                      {thumbnailLoading[video.id] && !thumbnailErrors[video.id] && (
                        <ThumbnailPlaceholder>載入中...</ThumbnailPlaceholder>
                      )}
                      {!thumbnailErrors[video.id] ? (
                        <Thumbnail 
                          src={getThumbnailUrl(video)}
                          alt={`${video.name} 縮略圖`}
                          onLoad={() => handleThumbnailLoading(video.id, false)}
                          onLoadStart={() => handleThumbnailLoading(video.id, true)}
                          onError={() => {
                            handleThumbnailError(video.id);
                            handleThumbnailLoading(video.id, false);
                          }}
                          style={{ display: thumbnailLoading[video.id] ? 'none' : 'block' }}
                          loading="lazy"
                        />
                      ) : (
                        <Thumbnail src="/placeholder-thumbnail.svg" alt="無縮略圖" />
                      )}
                      <PlayIcon>▶</PlayIcon>
                    </ThumbnailContainer>
                  </Link>
                  <VideoInfo>
                    <VideoTitle>
                      {isMobile ? `${video.startTime}` : `${video.name}`}
                    </VideoTitle>
                    <VideoMeta>
                      <span>開始: {video.startTime}</span>
                      <span>時長: {video.duration === '載入中' ? <LoadingText>載入中</LoadingText> : video.duration}</span>
                    </VideoMeta>
                  </VideoInfo>
                </VideoCard>
              ))}
            </VideoGrid>
          ) : (
            <VideoTable>
              <TableHeader>
                <tr>
                  <TableHeaderCell>縮略圖</TableHeaderCell>
                  {!isMobile && <TableHeaderCell className="hide-mobile">檔案名稱</TableHeaderCell>}
                  {!isMobile && <TableHeaderCell className="hide-mobile">時間戳</TableHeaderCell>}
                  <TableHeaderCell>開始時間</TableHeaderCell>
                  <TableHeaderCell>時長</TableHeaderCell>
                  <TableHeaderCell>操作</TableHeaderCell>
                </tr>
              </TableHeader>
              <tbody>
                {videos.map(video => (
                  <TableRow key={video.id}>
                    <ThumbnailCell>
                      <Link to={`/camera/${cameraId}/date/${date}/video/${video.id}`}>
                        <TableThumbnail>
                          {thumbnailLoading[video.id] && !thumbnailErrors[video.id] && (
                            <ThumbnailPlaceholder>載入中...</ThumbnailPlaceholder>
                          )}
                          {!thumbnailErrors[video.id] ? (
                            <TableThumbnailImg 
                              src={getThumbnailUrl(video)}
                              alt={`${video.name} 縮略圖`}
                              onLoad={() => handleThumbnailLoading(video.id, false)}
                              onLoadStart={() => handleThumbnailLoading(video.id, true)}
                              onError={() => {
                                handleThumbnailError(video.id);
                                handleThumbnailLoading(video.id, false);
                              }}
                              style={{ display: thumbnailLoading[video.id] ? 'none' : 'block' }}
                              loading="lazy"
                            />
                          ) : (
                            <TableThumbnailImg src="/placeholder-thumbnail.svg" alt="無縮略圖" />
                          )}
                        </TableThumbnail>
                      </Link>
                    </ThumbnailCell>
                    {!isMobile && <TableCell className="hide-mobile">{video.name}</TableCell>}
                    {!isMobile && <TableCell className="hide-mobile">{formatTimestamp(video.timestamp)}</TableCell>}
                    <TableCell>{video.startTime}</TableCell>
                    <TableCell>{video.duration === '載入中' ? <LoadingText>載入中</LoadingText> : video.duration}</TableCell>
                    <TableCell>
                      <VideoLink to={`/camera/${cameraId}/date/${date}/video/${video.id}`}>
                        觀看影片
                      </VideoLink>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </VideoTable>
          )}
          
          {/* Processing status display at the bottom, hidden 3 seconds after reaching 100% */}
          {videos.length > 0 && loadingProgress < 101 && (
            <ProcessingStatus>
              <StatusTitle>處理進度</StatusTitle>
              <ConnectionStatus>
                <StatusDetail>
                  <StatusLabel>伺服器狀態:</StatusLabel>
                  <ConnectionStatusItem connected={socketConnected}>
                    {socketConnected ? '已連接' : `連接中斷 ${socketRetries > 0 ? `(重試 ${socketRetries}/10)` : ''}`}
                  </ConnectionStatusItem>
                </StatusDetail>
                <StatusDetail>
                  <StatusLabel>處理狀態:</StatusLabel>
                  <span>
                    {loadingProgress === 100 ? 
                      '全部完成' : 
                      loadingProgress === 0 ? 
                        '等待處理' :
                        `已處理 ${Math.ceil(videos.length * loadingProgress / 100)}/${videos.length} 個影片`
                    }
                  </span>
                </StatusDetail>
              </ConnectionStatus>
              <ProgressContainer>
                <ProgressBar>
                  <ProgressBarInner width={loadingProgress > 100 ? 100 : loadingProgress} />
                </ProgressBar>
                <ProgressText>{loadingProgress > 100 ? 100 : loadingProgress}% 已處理</ProgressText>
              </ProgressContainer>
              {loadingProgress < 100 && (
                <ProcessingInfo>
                  系統正在按順序處理影片資訊，若影片數量較多，可能需要較長時間...
                </ProcessingInfo>
              )}
              <CompleteOverlay show={loadingProgress === 100}>
                <CompleteText>處理完成!</CompleteText>
              </CompleteOverlay>
            </ProcessingStatus>
          )}
        </>
      )}
    </div>
  );
};

// processing status area style
const ProcessingStatus = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: ${theme.background.paper};
  border-radius: 8px;
  box-shadow: ${theme.shadow.sm};
  position: relative;
  overflow: hidden;
`;

const StatusTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 1rem;
  color: ${theme.text.primary};
  font-size: 1.1rem;
`;

const StatusDetail = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const StatusLabel = styled.span`
  color: ${theme.text.secondary};
  margin-right: 0.5rem;
  font-size: 0.9rem;
`;

const ConnectionStatus = styled.div`
  margin-bottom: 1rem;
`;

const ConnectionStatusItem = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  background-color: ${props => props.connected ? '#10b981' : '#ef4444'};
  color: white;
  display: inline-block;
  transition: background-color 0.3s ease;
`;

const ProgressContainer = styled.div`
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
`;

const ProgressBar = styled.div`
  height: 10px;
  flex: 1;
  background-color: ${theme.border.light};
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  margin-right: 1rem;
`;

const ProgressBarInner = styled.div`
  height: 100%;
  width: ${props => props.width}%;
  background-color: ${props => 
    props.width < 30 ? theme.primary.light : 
    props.width < 70 ? theme.primary.main : 
    theme.primary.dark};
  border-radius: 5px;
  transition: width 0.5s ease, background-color 0.5s ease;
`;

const ProgressText = styled.div`
  font-size: 0.9rem;
  color: ${theme.text.primary};
  font-weight: 500;
  white-space: nowrap;
`;

const ProcessingInfo = styled.div`
  color: ${theme.text.secondary};
  font-size: 0.9rem;
  font-style: italic;
`;

// complete animation when progress is 100%
const CompleteOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(16, 185, 129, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${props => props.show ? 1 : 0};
  transition: opacity 0.5s ease;
  pointer-events: none;
`;

const CompleteText = styled.div`
  color: #10b981;
  font-size: 1.1rem;
  font-weight: 600;
`;

export default VideoList; 