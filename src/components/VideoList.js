import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { getDateVideos, formatTimestamp, parseDateString } from '../utils/dataUtils';
import theme from '../utils/theme';

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
  
  useEffect(() => {
    const loadVideos = async () => {
      try {
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
                      {video.thumbnail ? (
                        <Thumbnail src={video.thumbnail} alt={`${video.name} 縮略圖`} />
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
                      <span>時長: {video.duration}</span>
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
                          {video.thumbnail ? (
                            <TableThumbnailImg src={video.thumbnail} alt={`${video.name} 縮略圖`} />
                          ) : (
                            <TableThumbnailImg src="/placeholder-thumbnail.svg" alt="無縮略圖" />
                          )}
                        </TableThumbnail>
                      </Link>
                    </ThumbnailCell>
                    {!isMobile && <TableCell className="hide-mobile">{video.name}</TableCell>}
                    {!isMobile && <TableCell className="hide-mobile">{formatTimestamp(video.timestamp)}</TableCell>}
                    <TableCell>{video.startTime}</TableCell>
                    <TableCell>{video.duration}</TableCell>
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
        </>
      )}
    </div>
  );
};

export default VideoList; 