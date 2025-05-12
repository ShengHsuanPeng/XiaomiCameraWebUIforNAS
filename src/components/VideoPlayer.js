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
  padding-top: 56.25%; /* 16:9 aspect ratio */
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

// Timeline container styles
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
  const [timelineVideos, setTimelineVideos] = useState([]); // videos on timeline
  const [currentVideoTime, setCurrentVideoTime] = useState(0); // current video progress
  const [isPlaylistMode, setIsPlaylistMode] = useState(true); // default to seamless playback mode
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const swipeThreshold = 80; // swipe threshold
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Add touch swipe event handling
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
      
      // If swipe distance is greater than threshold
      if (Math.abs(swipeDistance) > swipeThreshold) {
        if (swipeDistance > 0 && prevVideo) {
          // Swipe right, show previous
          navigate(`/camera/${cameraId}/date/${date}/video/${prevVideo.id}`);
        } else if (swipeDistance < 0 && nextVideo) {
          // Swipe left, show next
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
  
  // Keyboard navigation handling
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
  
  // Set up timeline and current video progress updates
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
  
  // Organize video timeline
  useEffect(() => {
    if (!videoList.length || !video) return;

    // Sort video list by timestamp
    const sortedVideos = [...videoList].sort((a, b) => a.timestamp - b.timestamp);
    
    // Find current video's index in the full list
    const currentIndex = sortedVideos.findIndex(v => v.id === video.id);
    if (currentIndex === -1) return;
    
    // Get current video's timestamp
    const currentTimestamp = sortedVideos[currentIndex].timestamp;
    
    // Calculate 2-hour range before and after (7200 seconds)
    const startRange = currentTimestamp - 7200;
    const endRange = currentTimestamp + 7200;
    
    // Filter videos within 2 hours before and after
    const filteredVideos = sortedVideos.filter(v => 
      v.timestamp >= startRange && v.timestamp <= endRange
    );
    
    setTimelineVideos(filteredVideos);
    
    // If timeline is rendered, scroll to current video position
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
        
        // Find current video's index
        const currentIndex = videos.findIndex(v => v.id === videoId);
        let foundVideo = currentIndex >= 0 ? videos[currentIndex] : null;
        
        // Set previous and next videos
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
        
        // if found video but duration is "Loading..." or "Unknown", try to get from cache
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
            console.error('Failed to get video duration:', err);
          }
        }
        
        setVideo(foundVideo || null);
      } catch (error) {
        console.error('Load video info failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (cameraId && date && videoId) {
      loadVideo();
      // Reset video playback state
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
      // Auto play video
      videoRef.current.load();
      videoRef.current.play().catch(err => console.error('Failed to auto-play video:', err));
      
      // Preload next video (if exists)
      if (nextVideo) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'video';
        preloadLink.href = getVideoPath(cameraId, date, nextVideo.name);
        document.head.appendChild(preloadLink);
      }
    }
  }, [isPlaylistMode, nextVideo, cameraId, date, videoRef.current]);
  
  // handle video playback ended
  useEffect(() => {
    const handleVideoEnded = () => {
      if (nextVideo) {
        // Seamless playback mode: Load next video without navigating
        const nextVideoPath = getVideoPath(cameraId, date, nextVideo.name);
        if (videoRef.current) {
          // Store current playing element
          const videoElement = videoRef.current;
          
          // Set transition effect
          videoElement.style.transition = 'opacity 0.5s';
          videoElement.style.opacity = '0.5';
          
          // Update video source
          videoElement.src = nextVideoPath;
          
          // Load and play new video
          videoElement.load();
          
          const playPromise = videoElement.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              // After playback, restore opacity
              videoElement.style.opacity = '1';
              
              // Update current video state
              setVideo(nextVideo);
              
              // Update URL without reloading page
              window.history.replaceState(null, '', `/camera/${cameraId}/date/${date}/video/${nextVideo.id}`);
              
              // Update previous and next videos
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
              
              // Preload next video (if exists)
              if (currentIndex < videoList.length - 2) {
                const nextNextVideo = videoList[currentIndex + 1];
                const preloadLink = document.createElement('link');
                preloadLink.rel = 'preload';
                preloadLink.as = 'video';
                preloadLink.href = getVideoPath(cameraId, date, nextNextVideo.name);
                document.head.appendChild(preloadLink);
              }
            }).catch(err => {
              console.error('auto play next video failed:', err);
              videoElement.style.opacity = '1';
            });
          }
        }
      }
    };
    
    const videoElement = videoRef.current;
    if (videoElement && showVideo) {
      videoElement.addEventListener('ended', handleVideoEnded);
      
      // Add error handling
      const handleError = (e) => {
        console.error('Video playback error:', e);
        // Try loading next video
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
      videoRef.current.play().catch(err => console.error('play video failed:', err));
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
  // Get the full path for the thumbnail
  const thumbnailUrl = video.thumbnail 
    ? `${getApiBaseUrl()}${video.thumbnail}` 
    : `${getApiBaseUrl()}/thumbnails/${cameraId}/${date}/${cameraId}_${date}_${videoId}.jpg`;
  
  // Click on video item in timeline
  const handleTimelineClick = (clickedVideo) => {
    if (videoRef.current) {
      // Seamless playback mode: Directly switch video source
      const clickedVideoPath = getVideoPath(cameraId, date, clickedVideo.name);
      
      // Store current playing element
      const videoElement = videoRef.current;
      
      // Set transition effect
      videoElement.style.transition = 'opacity 0.5s';
      videoElement.style.opacity = '0.5';
      
      // Update video source
      videoElement.src = clickedVideoPath;
      
      // Load and play new video
      videoElement.load();
      
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // After playback, restore opacity
          videoElement.style.opacity = '1';
          
          // Update current video state
          setVideo(clickedVideo);
          
          // Update URL without reloading page
          window.history.replaceState(null, '', `/camera/${cameraId}/date/${date}/video/${clickedVideo.id}`);
          
          // Update previous and next videos
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
          console.error('play selected video failed:', err);
          videoElement.style.opacity = '1';
        });
      }
    } else {
      // Navigate to selected video page (this should rarely execute, as we directly display the video)
      navigate(`/camera/${cameraId}/date/${date}/video/${clickedVideo.id}`);
    }
  };
  
  // Format time to show only hours:minutes
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
      
      {/* Timeline section */}
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