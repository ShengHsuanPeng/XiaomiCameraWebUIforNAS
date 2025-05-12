import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { getDateVideos, getVideoPath, formatTimestamp, getVideoDuration, getApiBaseUrl, getCameraName } from '../utils/dataUtils';
import theme from '../utils/theme';

const PageTitle = styled.h1`
  color: ${theme.text.primary};
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  
  @media (min-width: 768px) {
    font-size: 2rem;
  }
`;

const SubTitle = styled.h2`
  color: ${theme.text.muted};
  font-size: 1rem;
  margin-bottom: 1rem;
  word-break: break-all;
  
  @media (min-width: 768px) {
    font-size: 1.2rem;
  }
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

const NavigationBar = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const NavigationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const NavButton = styled(Link)`
  padding: 0.5rem;
  flex: 1;
  text-align: center;
  background-color: ${props => props.disabled ? theme.background.disabled : theme.background.paper};
  color: ${props => props.disabled ? theme.text.disabled : theme.text.muted};
  text-decoration: none;
  border-radius: 4px;
  box-shadow: ${props => props.disabled ? 'none' : theme.shadow.sm};
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};
  font-size: 0.9rem;
  white-space: nowrap;
  
  &:first-child {
    margin-right: 0.5rem;
  }
  
  &:hover {
    color: ${props => props.disabled ? theme.text.disabled : theme.primary.main};
    background-color: ${props => props.disabled ? theme.background.disabled : theme.background.hover};
  }
  
  @media (min-width: 768px) {
    padding: 0.5rem 0.75rem;
    flex: none;
    font-size: 1rem;
  }
`;

const PlayerContainer = styled.div`
  background-color: ${theme.background.paper};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: ${theme.shadow.md};
  margin-bottom: 1.5rem;
`;

const VideoElement = styled.video`
  width: 100%;
  max-height: 70vh;
  background-color: black;
`;

const ThumbnailContainer = styled.div`
  width: 100%;
  height: 0;
  padding-top: 56.25%; /* 16:9 寬高比 */
  position: relative;
  background-color: black;
`;

const ThumbnailImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const PlayOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

const PlayButton = styled.div`
  width: 80px;
  height: 80px;
  background-color: rgba(59, 130, 246, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  transition: transform 0.2s;
  
  ${PlayOverlay}:hover & {
    transform: scale(1.1);
  }
`;

const VideoInfo = styled.div`
  padding: 1rem;
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const VideoDetail = styled.div`
  margin-bottom: 0.5rem;
  display: flex;
  
  &.hide-mobile {
    @media (max-width: 767px) {
      display: none;
    }
  }
  
  &.mobile-friendly {
    @media (max-width: 767px) {
      flex-direction: column;
    }
  }
`;

const DetailLabel = styled.span`
  font-weight: 500;
  width: 100px;
  color: ${theme.text.muted};
  
  @media (min-width: 768px) {
    width: 120px;
  }
`;

const DetailValue = styled.span`
  color: ${theme.text.secondary};
  word-break: break-all;
`;

const SlideContainer = styled.div`
  position: relative;
  width: 100%;
  touch-action: pan-y;
`;

// 時間軸容器樣式
const TimelineContainer = styled.div`
  margin-bottom: 1.5rem;
  background-color: ${theme.background.paper};
  border-radius: 8px;
  padding: 1rem;
  box-shadow: ${theme.shadow.md};
`;

const TimelineTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: ${theme.text.primary};
  font-size: 1.1rem;
`;

const Timeline = styled.div`
  position: relative;
  height: 60px;
  width: 100%;
  background-color: ${theme.background.default};
  border-radius: 4px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${theme.primary.main};
    border-radius: 4px;
  }
`;

const TimeSlot = styled.div`
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 5px;
  min-width: 120px;
  height: 60px;
  text-align: center;
  background-color: ${props => props.isActive ? theme.primary.main : props.hasVideo ? theme.background.paper : theme.background.disabled};
  color: ${props => props.isActive ? 'white' : props.hasVideo ? theme.text.secondary : theme.text.disabled};
  border-right: 1px solid ${theme.border.light};
  cursor: ${props => props.hasVideo ? 'pointer' : 'default'};
  position: relative;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.hasVideo && !props.isActive ? theme.background.hover : props.isActive ? theme.primary.main : theme.background.disabled};
  }
`;

const TimeSlotTime = styled.div`
  font-weight: 500;
  font-size: 1.2rem;
`;

const TimeIndicator = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  width: ${props => props.percentage}%;
  background-color: ${theme.status.success};
`;

const PlaylistControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
`;

const SeamlessButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${props => props.active ? theme.status.success : theme.primary.main};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.active ? theme.status.success : theme.primary.light};
  }
`;

const VideoPlayer = () => {
  const { cameraId, date, videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showVideo, setShowVideo] = useState(true);
  const [cameraName, setCameraName] = useState(cameraId);
  const [videoList, setVideoList] = useState([]);
  const [prevVideo, setPrevVideo] = useState(null);
  const [nextVideo, setNextVideo] = useState(null);
  const [timelineVideos, setTimelineVideos] = useState([]); // 時間軸上顯示的影片
  const [currentVideoTime, setCurrentVideoTime] = useState(0); // 當前播放進度
  const [isPlaylistMode, setIsPlaylistMode] = useState(true); // 預設啟用無縫播放模式
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const swipeThreshold = 80; // 滑動閾值
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // 添加觸控滑動事件處理
  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e) => {
      touchEndX.current = e.changedTouches[0].clientX;
      handleSwipe();
    };
    
    const handleSwipe = () => {
      const swipeDistance = touchEndX.current - touchStartX.current;
      
      // 如果滑動距離大於閾值
      if (Math.abs(swipeDistance) > swipeThreshold) {
        if (swipeDistance > 0 && prevVideo) {
          // 向右滑動，顯示上一個
          navigate(`/camera/${cameraId}/date/${date}/video/${prevVideo.id}`);
        } else if (swipeDistance < 0 && nextVideo) {
          // 向左滑動，顯示下一個
          navigate(`/camera/${cameraId}/date/${date}/video/${nextVideo.id}`);
        }
      }
    };
    
    const container = containerRef.current;
    if (container && isMobile) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [navigate, cameraId, date, prevVideo, nextVideo, isMobile]);
  
  // 鍵盤導航處理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === 'ArrowLeft' && prevVideo) {
        navigate(`/camera/${cameraId}/date/${date}/video/${prevVideo.id}`);
      } else if (e.key === 'ArrowRight' && nextVideo) {
        navigate(`/camera/${cameraId}/date/${date}/video/${nextVideo.id}`);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, cameraId, date, prevVideo, nextVideo]);
  
  // 設置時間軸和當前影片進度更新
  useEffect(() => {
    let progressInterval;
    
    if (showVideo && videoRef.current && isPlaylistMode) {
      progressInterval = setInterval(() => {
        if (videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          const duration = videoRef.current.duration;
          if (duration) {
            setCurrentVideoTime((currentTime / duration) * 100);
          }
        }
      }, 1000);
    }
    
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [showVideo, isPlaylistMode]);
  
  // 組織影片時間軸
  useEffect(() => {
    if (!videoList.length || !video) return;

    // 按時間戳排序影片列表
    const sortedVideos = [...videoList].sort((a, b) => a.timestamp - b.timestamp);
    
    // 找到當前影片在整個列表中的索引
    const currentIndex = sortedVideos.findIndex(v => v.id === video.id);
    if (currentIndex === -1) return;
    
    // 獲取當前影片的時間戳
    const currentTimestamp = sortedVideos[currentIndex].timestamp;
    
    // 計算前後2小時範圍（7200秒）
    const startRange = currentTimestamp - 7200;
    const endRange = currentTimestamp + 7200;
    
    // 篩選出前後2小時內的影片
    const filteredVideos = sortedVideos.filter(v => 
      v.timestamp >= startRange && v.timestamp <= endRange
    );
    
    setTimelineVideos(filteredVideos);
    
    // 如果時間軸已渲染，滾動到當前影片位置
    setTimeout(() => {
      if (timelineRef.current) {
        const activeElement = timelineRef.current.querySelector('[data-active="true"]');
        if (activeElement) {
          timelineRef.current.scrollLeft = activeElement.offsetLeft - (timelineRef.current.clientWidth / 2) + (activeElement.clientWidth / 2);
        }
      }
    }, 100);
  }, [videoList, video]);
  
  useEffect(() => {
    const loadVideo = async () => {
      try {
        const videos = await getDateVideos(cameraId, date);
        setVideoList(videos);
        
        // 查找當前影片的索引
        const currentIndex = videos.findIndex(v => v.id === videoId);
        let foundVideo = currentIndex >= 0 ? videos[currentIndex] : null;
        
        // 設置前後影片
        if (currentIndex > 0) {
          setPrevVideo(videos[currentIndex - 1]);
        } else {
          setPrevVideo(null);
        }
        
        if (currentIndex < videos.length - 1 && currentIndex >= 0) {
          setNextVideo(videos[currentIndex + 1]);
        } else {
          setNextVideo(null);
        }
        
        // 如果找到影片但時長是「載入中」或「未知」，嘗試使用緩存獲取
        if (foundVideo && (!foundVideo.duration || foundVideo.duration === '載入中' || foundVideo.duration === '未知')) {
          try {
            const duration = await getVideoDuration(cameraId, date, videoId);
            if (duration && duration !== '未知') {
              foundVideo = {
                ...foundVideo,
                duration
              };
            }
          } catch (err) {
            console.error('獲取影片時長失敗:', err);
          }
        }
        
        setVideo(foundVideo || null);
      } catch (error) {
        console.error('載入影片資訊失敗:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (cameraId && date && videoId) {
      loadVideo();
      // 重置影片播放狀態
      setShowVideo(false);
    }
  }, [cameraId, date, videoId]);
  
  useEffect(() => {
    if (!cameraId) return;
    
    const loadCameraName = async () => {
      const name = await getCameraName(cameraId);
      setCameraName(name);
    };
    
    loadCameraName();
  }, [cameraId]);
  
  useEffect(() => {
    if (videoRef.current && isPlaylistMode) {
      // 自動播放影片
      videoRef.current.load();
      videoRef.current.play().catch(err => console.error('自動播放影片失敗:', err));
      
      // 預加載下一個影片（如果有）
      if (nextVideo) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'video';
        preloadLink.href = getVideoPath(cameraId, date, nextVideo.name);
        document.head.appendChild(preloadLink);
      }
    }
  }, [isPlaylistMode, nextVideo, cameraId, date, videoRef.current]);
  
  // 處理影片播放結束時的行為
  useEffect(() => {
    const handleVideoEnded = () => {
      if (nextVideo) {
        // 無縫播放模式：直接加載下一個影片而不導航
        const nextVideoPath = getVideoPath(cameraId, date, nextVideo.name);
        if (videoRef.current) {
          // 儲存當前播放元素
          const videoElement = videoRef.current;
          
          // 設置過渡效果
          videoElement.style.transition = 'opacity 0.5s';
          videoElement.style.opacity = '0.5';
          
          // 更新影片源
          videoElement.src = nextVideoPath;
          
          // 加載並播放新影片
          videoElement.load();
          
          const playPromise = videoElement.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              // 播放成功後恢復透明度
              videoElement.style.opacity = '1';
              
              // 更新當前影片狀態
              setVideo(nextVideo);
              
              // 更新 URL 但不重新加載頁面
              window.history.replaceState(null, '', `/camera/${cameraId}/date/${date}/video/${nextVideo.id}`);
              
              // 更新前後影片
              const currentIndex = videoList.findIndex(v => v.id === nextVideo.id);
              if (currentIndex > 0) {
                setPrevVideo(videoList[currentIndex - 1]);
              } else {
                setPrevVideo(null);
              }
              
              if (currentIndex < videoList.length - 1) {
                setNextVideo(videoList[currentIndex + 1]);
              } else {
                setNextVideo(null);
              }
              
              // 預加載下一個影片（如果有）
              if (currentIndex < videoList.length - 2) {
                const nextNextVideo = videoList[currentIndex + 1];
                const preloadLink = document.createElement('link');
                preloadLink.rel = 'preload';
                preloadLink.as = 'video';
                preloadLink.href = getVideoPath(cameraId, date, nextNextVideo.name);
                document.head.appendChild(preloadLink);
              }
            }).catch(err => {
              console.error('自動播放下一個影片失敗:', err);
              videoElement.style.opacity = '1';
            });
          }
        }
      }
    };
    
    const videoElement = videoRef.current;
    if (videoElement && showVideo) {
      videoElement.addEventListener('ended', handleVideoEnded);
      
      // 添加錯誤處理
      const handleError = (e) => {
        console.error('影片播放錯誤:', e);
        // 嘗試載入下一個影片
        if (nextVideo) {
          handleVideoEnded();
        }
      };
      
      videoElement.addEventListener('error', handleError);
      
      return () => {
        videoElement.removeEventListener('ended', handleVideoEnded);
        videoElement.removeEventListener('error', handleError);
      };
    }
  }, [navigate, cameraId, date, nextVideo, showVideo, videoList]);
  
  const handlePlayClick = () => {
    setShowVideo(true);
    
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(err => console.error('播放影片失敗:', err));
    }
  };
  
  const goToPrevVideo = () => {
    if (prevVideo) {
      navigate(`/camera/${cameraId}/date/${date}/video/${prevVideo.id}`);
    }
  };
  
  const goToNextVideo = () => {
    if (nextVideo) {
      navigate(`/camera/${cameraId}/date/${date}/video/${nextVideo.id}`);
    }
  };
  
  if (loading) {
    return <div>載入中...</div>;
  }
  
  if (!video) {
    return (
      <div>
        <BackLink to={`/camera/${cameraId}/date/${date}`}>← 返回影片列表</BackLink>
        <h2>找不到影片</h2>
        <p>無法找到指定的影片，請返回列表重新選擇。</p>
      </div>
    );
  }
  
  const videoPath = getVideoPath(cameraId, date, video.name);
  // 獲取縮略圖的完整路徑
  const thumbnailUrl = video.thumbnail 
    ? `${getApiBaseUrl()}${video.thumbnail}` 
    : `${getApiBaseUrl()}/thumbnails/${cameraId}/${date}/${cameraId}_${date}_${videoId}.jpg`;
  
  // 點擊時間軸上的影片項目
  const handleTimelineClick = (clickedVideo) => {
    if (videoRef.current) {
      // 無縫播放模式：直接更換視頻源
      const clickedVideoPath = getVideoPath(cameraId, date, clickedVideo.name);
      
      // 儲存當前播放元素
      const videoElement = videoRef.current;
      
      // 設置過渡效果
      videoElement.style.transition = 'opacity 0.5s';
      videoElement.style.opacity = '0.5';
      
      // 更新影片源
      videoElement.src = clickedVideoPath;
      
      // 加載並播放新影片
      videoElement.load();
      
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // 播放成功後恢復透明度
          videoElement.style.opacity = '1';
          
          // 更新當前影片狀態
          setVideo(clickedVideo);
          
          // 更新 URL 但不重新加載頁面
          window.history.replaceState(null, '', `/camera/${cameraId}/date/${date}/video/${clickedVideo.id}`);
          
          // 更新前後影片
          const currentIndex = videoList.findIndex(v => v.id === clickedVideo.id);
          if (currentIndex > 0) {
            setPrevVideo(videoList[currentIndex - 1]);
          } else {
            setPrevVideo(null);
          }
          
          if (currentIndex < videoList.length - 1) {
            setNextVideo(videoList[currentIndex + 1]);
          } else {
            setNextVideo(null);
          }
        }).catch(err => {
          console.error('播放選擇的影片失敗:', err);
          videoElement.style.opacity = '1';
        });
      }
    } else {
      // 導航到所選影片頁面 (這裡基本不會執行到，因為我們直接顯示影片)
      navigate(`/camera/${cameraId}/date/${date}/video/${clickedVideo.id}`);
    }
  };
  
  // 格式化時間，只顯示時:分
  const formatTimeShort = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div>
      <NavigationBar>
        <BackLink to={`/camera/${cameraId}/date/${date}`}>← 返回影片列表</BackLink>
        <NavigationButtons>
          <NavButton 
            to={prevVideo ? `/camera/${cameraId}/date/${date}/video/${prevVideo.id}` : '#'} 
            disabled={!prevVideo}
            onClick={(e) => { 
              e.preventDefault(); 
              if(prevVideo) {
                handleTimelineClick(prevVideo);
              }
            }}
          >
            ← 上一個
          </NavButton>
          <NavButton 
            to={nextVideo ? `/camera/${cameraId}/date/${date}/video/${nextVideo.id}` : '#'} 
            disabled={!nextVideo}
            onClick={(e) => { 
              e.preventDefault(); 
              if(nextVideo) {
                handleTimelineClick(nextVideo);
              }
            }}
          >
            下一個 →
          </NavButton>
        </NavigationButtons>
      </NavigationBar>
      <PageTitle>監視錄影播放</PageTitle>
      <SubTitle>
        {cameraName} - {date.substring(0, 4)}-{date.substring(4, 6)}-{date.substring(6, 8)}
        {!isMobile && ` - ${video.name}`}
      </SubTitle>
      
      {/* 時間軸部分 */}
      {timelineVideos.length > 0 && (
        <TimelineContainer>
          <Timeline ref={timelineRef}>
            {timelineVideos.map((vid) => (
              <TimeSlot 
                key={vid.id}
                isActive={vid.id === (video ? video.id : videoId)}
                hasVideo={true}
                onClick={() => handleTimelineClick(vid)}
                data-active={vid.id === (video ? video.id : videoId)}
              >
                <TimeSlotTime>{formatTimeShort(vid.timestamp)}</TimeSlotTime>
                {vid.id === (video ? video.id : videoId) && isPlaylistMode && (
                  <TimeIndicator percentage={currentVideoTime} />
                )}
              </TimeSlot>
            ))}
          </Timeline>
        </TimelineContainer>
      )}
      
      <SlideContainer ref={containerRef}>
        <PlayerContainer>
          <VideoElement ref={videoRef} controls autoPlay crossOrigin="anonymous">
            <source src={videoPath} type="video/mp4" />
            您的瀏覽器不支援影片播放。
          </VideoElement>
          
          <VideoInfo>
            <VideoDetail className="hide-mobile">
              <DetailLabel>檔案名稱:</DetailLabel>
              <DetailValue>{video.name}</DetailValue>
            </VideoDetail>
            <VideoDetail className="hide-mobile">
              <DetailLabel>錄製時間戳:</DetailLabel>
              <DetailValue>{formatTimestamp(video.timestamp)}</DetailValue>
            </VideoDetail>
            <VideoDetail>
              <DetailLabel>開始時間:</DetailLabel>
              <DetailValue>{video.startTime}</DetailValue>
            </VideoDetail>
            <VideoDetail>
              <DetailLabel>時長:</DetailLabel>
              <DetailValue>{video.duration || '未知'}</DetailValue>
            </VideoDetail>
            <VideoDetail>
              <DetailLabel>相機:</DetailLabel>
              <DetailValue>{cameraName}</DetailValue>
            </VideoDetail>
            <VideoDetail className="mobile-friendly">
              <DetailLabel>導航提示:</DetailLabel>
              <DetailValue>
                {isMobile 
                  ? '左右滑動以切換影片' 
                  : '使用鍵盤左右箭頭鍵可以切換影片'}
              </DetailValue>
            </VideoDetail>
          </VideoInfo>
        </PlayerContainer>
      </SlideContainer>
    </div>
  );
};

export default VideoPlayer; 