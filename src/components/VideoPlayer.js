import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { getDateVideos, getVideoPath, formatTimestamp, getVideoDuration, getApiBaseUrl } from '../utils/dataUtils';
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

const VideoPlayer = () => {
  const { cameraId, date, videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showVideo, setShowVideo] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  useEffect(() => {
    const loadVideo = async () => {
      try {
        const videoList = await getDateVideos(cameraId, date);
        let foundVideo = videoList.find(v => v.id === videoId);
        
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
    }
  }, [cameraId, date, videoId]);
  
  const handlePlayClick = () => {
    setShowVideo(true);
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
  
  return (
    <div>
      <BackLink to={`/camera/${cameraId}/date/${date}`}>← 返回影片列表</BackLink>
      <PageTitle>觀看錄影</PageTitle>
      {!isMobile && <SubTitle>{video.name}</SubTitle>}
      
      <PlayerContainer>
        {showVideo ? (
          <VideoElement controls autoPlay crossOrigin="anonymous">
            <source src={videoPath} type="video/mp4" />
            您的瀏覽器不支援影片播放。
          </VideoElement>
        ) : (
          <ThumbnailContainer>
            <ThumbnailImage 
              src={thumbnailUrl} 
              alt={`${video.name} 縮略圖`}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/placeholder-thumbnail.svg";
                console.warn(`影片 ${videoId} 縮略圖載入失敗，使用佔位圖`);
              }}
            />
            <PlayOverlay onClick={handlePlayClick}>
              <PlayButton>▶</PlayButton>
            </PlayOverlay>
          </ThumbnailContainer>
        )}
        
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
          <VideoDetail className="hide-mobile">
            <DetailLabel>相機 ID:</DetailLabel>
            <DetailValue>{cameraId}</DetailValue>
          </VideoDetail>
        </VideoInfo>
      </PlayerContainer>
    </div>
  );
};

export default VideoPlayer; 