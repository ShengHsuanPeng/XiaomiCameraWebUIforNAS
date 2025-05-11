import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { getDateVideos, formatTimestamp, parseDateString } from '../utils/dataUtils';
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
  padding-top: 56.25%; /* 16:9 寬高比 */
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
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  background-color: rgba(59, 130, 246, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  opacity: 0.8;
  transition: opacity 0.2s, transform 0.2s;
  
  ${VideoCard}:hover & {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

const VideoInfo = styled.div`
  padding: 1rem;
`;

const VideoTitle = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: ${theme.text.primary};
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${theme.text.muted};
  font-size: 0.9rem;
`;

// 添加一個加載中的縮略圖占位
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

// 添加一個加載中的动态效果
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

// 根據螢幕寬度決定顯示哪些欄位
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
  const [loadingProgress, setLoadingProgress] = useState(0); // 用於顯示處理進度
  
  // 使用 ref 追蹤已處理的影片數量和其他持久性狀態
  const processedCount = useRef(0);
  const socketRef = useRef(null);
  const completionTimeoutRef = useRef(null);
  
  // 獲取API基礎URL
  const getApiBaseUrl = useCallback(() => {
    // 如果在生產環境，使用相對路徑
    if (process.env.NODE_ENV === 'production') {
      return '';
    }
    
    // 嘗試從環境變數獲取
    if (process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }
    
    // 使用固定的後端 IP 地址
    return 'http://192.168.68.69:5001';
  }, []);
  
  // 處理縮略圖載入錯誤
  const handleThumbnailError = (videoId) => {
    setThumbnailErrors(prev => ({
      ...prev,
      [videoId]: true
    }));
  };
  
  // 處理縮略圖載入狀態
  const handleThumbnailLoading = (videoId, isLoading) => {
    setThumbnailLoading(prev => ({
      ...prev,
      [videoId]: isLoading
    }));
  };
  
  // 更新特定影片的時長
  const updateVideoDuration = useCallback((videoId, duration) => {
    // 只有實際更新了有效時長才增加計數
    const isValidDuration = duration && duration !== '載入中';
    
    setVideos(prevVideos => {
      const updatedVideo = { ...prevVideos.find(v => v.id === videoId) };
      if (updatedVideo.duration === '載入中' && isValidDuration) {
        // 只有從「載入中」變為實際時長時才增加計數
        processedCount.current += 1;
      }
      
      // 返回更新後的影片列表
      return prevVideos.map(video => 
        video.id === videoId ? { ...video, duration } : video
      );
    });
  }, []);
  
  // 更新特定影片的縮略圖
  const updateVideoThumbnail = useCallback((videoId, thumbnail) => {
    setVideos(prevVideos => prevVideos.map(video => 
      video.id === videoId ? { ...video, thumbnail } : video
    ));
  }, []);
  
  // 設置 WebSocket 連接
  useEffect(() => {
    if (!cameraId || !date) return;
    
    let socketInstance = null;
    
    // 初始化 WebSocket
    const initSocket = () => {
      const socket = io(getApiBaseUrl(), {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
      
      socketRef.current = socket;
      
      // 連接成功後加入指定房間
      socket.on('connect', () => {
        console.log('WebSocket 連接成功');
        setSocketConnected(true);
        socket.emit('joinRoom', { cameraId, date });
      });
      
      // 連接斷開
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket 連接斷開，原因: ${reason}`);
        setSocketConnected(false);
      });
      
      // 嘗試重新連接
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`嘗試重新連接 (${attemptNumber}/5)`);
      });
      
      // 重新連接成功
      socket.on('reconnect', () => {
        console.log('WebSocket 重新連接成功');
        setSocketConnected(true);
        socket.emit('joinRoom', { cameraId, date });
      });
      
      // 重新連接失敗
      socket.on('reconnect_failed', () => {
        console.error('重新連接失敗，不再嘗試');
        
        // 如果重連失敗，將所有「載入中」的時長更新為「未知」
        setVideos(prevVideos => prevVideos.map(video => 
          video.duration === '載入中' ? { ...video, duration: '連接失敗' } : video
        ));
      });
      
      // 接收縮略圖生成完成的通知
      socket.on('thumbnailGenerated', data => {
        if (data.videoId && data.thumbnail) {
          console.log(`收到影片 ${data.videoId} 的縮略圖更新`);
          updateVideoThumbnail(data.videoId, data.thumbnail);
        }
      });
      
      // 接收時長更新的通知
      socket.on('durationUpdated', data => {
        console.log(`收到影片 ${data.videoId} 的時長更新：`, data);
        
        if (!data || !data.videoId) {
          console.error('收到無效的時長更新數據:', data);
          return;
        }
        
        // 更新處理進度（基於伺服器發送的索引）
        if (data.index !== undefined && data.total) {
          // 計算進度時加 1，因為索引從 0 開始但我們顯示的是已處理的數量
          const progress = Math.min(100, Math.round(((data.index + 1) / data.total) * 100));
          setLoadingProgress(progress);
          console.log(`更新進度：${progress}% (${data.index + 1}/${data.total})`);
        }
        
        if (data.duration) {
          console.log(`✅ 更新影片 ${data.videoId} 的時長為：${data.duration}`);
          updateVideoDuration(data.videoId, data.duration);
        } else {
          console.warn(`⚠️ 影片 ${data.videoId} 的時長更新為空值`);
          updateVideoDuration(data.videoId, '未知');
        }
      });
      
      // 接收處理完成的通知
      socket.on('processingComplete', data => {
        console.log(`所有影片處理完成 (共 ${data.totalVideos} 個影片)`, data);
        
        // 強制設置進度為 100%
        setLoadingProgress(100);
        
        // 清除完成超時計時器
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
        
        // 檢查是否所有影片都已處理完成
        setVideos(prevVideos => {
          const pendingVideos = prevVideos.filter(v => v.duration === '載入中');
          
          if (pendingVideos.length > 0) {
            console.warn(`仍有 ${pendingVideos.length} 個影片未完成處理，標記為「未知」`);
            
            // 將所有未處理的影片標記為「未知」
            return prevVideos.map(video => 
              video.duration === '載入中' ? { ...video, duration: '未知' } : video
            );
          }
          
          return prevVideos;
        });
      });
      
      // 連接錯誤處理
      socket.on('error', error => {
        console.error('WebSocket 連接錯誤:', error);
      });
      
      return socket;
    };
    
    // 初始化 WebSocket
    socketInstance = initSocket();
    
    // 添加時長更新超時處理
    const durationTimeout = setTimeout(() => {
      console.log('時長獲取超時，將所有「載入中」的時長更新為「未知」');
      setVideos(prevVideos => prevVideos.map(video => 
        video.duration === '載入中' ? { ...video, duration: '未知' } : video
      ));
    }, 60000); // 60秒後如果還是顯示「載入中」，則更新為「未知」
    
    // 添加整體完成超時處理，確保即使 processingComplete 事件丟失也能完成
    completionTimeoutRef.current = setTimeout(() => {
      console.log('處理完成通知超時，強制設定為完成狀態');
      setLoadingProgress(100);
      setVideos(prevVideos => prevVideos.map(video => 
        video.duration === '載入中' ? { ...video, duration: '未知 (超時)' } : video
      ));
    }, 120000); // 2分鐘後強制完成
    
    // 組件卸載時清理
    return () => {
      console.log('離開頁面，關閉 WebSocket 連接');
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
  }, [cameraId, date, getApiBaseUrl, updateVideoDuration, updateVideoThumbnail]);
  
  // 載入影片列表
  useEffect(() => {
    const loadVideos = async () => {
      try {
        // 重置已處理計數
        processedCount.current = 0;
        setLoadingProgress(0);
        
        const videoList = await getDateVideos(cameraId, date);
        setVideos(videoList);
      } catch (error) {
        console.error('載入影片列表失敗:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (cameraId && date) {
      loadVideos();
    }
  }, [cameraId, date]);

  if (loading) {
    return <div>載入中...</div>;
  }
  
  return (
    <div>
      <BackLink to={`/camera/${cameraId}`}>← 返回日期列表</BackLink>
      <PageTitle>{dateInfo.formatted} 錄影列表</PageTitle>
      <SubTitle>相機 ID: {cameraId}</SubTitle>
      
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
                      {thumbnailLoading[video.id] && (
                        <ThumbnailPlaceholder>載入中...</ThumbnailPlaceholder>
                      )}
                      {!thumbnailErrors[video.id] ? (
                        <Thumbnail 
                          src={video.thumbnail ? `${getApiBaseUrl()}${video.thumbnail}` : `${getApiBaseUrl()}/thumbnails/${cameraId}/${date}/${cameraId}_${date}_${video.id}.jpg`}
                          alt={`${video.name} 縮略圖`}
                          onLoad={() => handleThumbnailLoading(video.id, false)}
                          onLoadStart={() => handleThumbnailLoading(video.id, true)}
                          onError={() => {
                            handleThumbnailError(video.id);
                            handleThumbnailLoading(video.id, false);
                          }}
                          style={{ display: thumbnailLoading[video.id] ? 'none' : 'block' }}
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
                          {thumbnailLoading[video.id] && (
                            <ThumbnailPlaceholder>載入中...</ThumbnailPlaceholder>
                          )}
                          {!thumbnailErrors[video.id] ? (
                            <TableThumbnailImg 
                              src={video.thumbnail ? `${getApiBaseUrl()}${video.thumbnail}` : `${getApiBaseUrl()}/thumbnails/${cameraId}/${date}/${cameraId}_${date}_${video.id}.jpg`}
                              alt={`${video.name} 縮略圖`}
                              onLoad={() => handleThumbnailLoading(video.id, false)}
                              onLoadStart={() => handleThumbnailLoading(video.id, true)}
                              onError={() => {
                                handleThumbnailError(video.id);
                                handleThumbnailLoading(video.id, false);
                              }}
                              style={{ display: thumbnailLoading[video.id] ? 'none' : 'block' }}
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
          
          {/* 處理狀態顯示移到底部 */}
          {videos.length > 0 && (
            <ProcessingStatus>
              <StatusTitle>處理進度</StatusTitle>
              <ConnectionStatus>
                <StatusDetail>
                  <StatusLabel>伺服器狀態:</StatusLabel>
                  <ConnectionStatusItem connected={socketConnected}>
                    {socketConnected ? '已連接' : '連接中斷'}
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
                  <ProgressBarInner width={loadingProgress} />
                </ProgressBar>
                <ProgressText>{loadingProgress}% 已處理</ProgressText>
              </ProgressContainer>
              <ProcessingInfo>
                {loadingProgress < 100 ? 
                  '系統正在按順序處理影片資訊，若影片數量較多，可能需要較長時間...' : 
                  '✅ 所有影片處理完成'}
              </ProcessingInfo>
            </ProcessingStatus>
          )}
        </>
      )}
    </div>
  );
};

// 處理狀態區域樣式
const ProcessingStatus = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: ${theme.background.paper};
  border-radius: 8px;
  box-shadow: ${theme.shadow.sm};
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
  background-color: ${theme.primary.main};
  border-radius: 5px;
  transition: width 0.3s ease;
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

export default VideoList; 