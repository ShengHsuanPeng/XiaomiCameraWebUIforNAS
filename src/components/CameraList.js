import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { getCameras, getApiBaseUrl } from '../utils/dataUtils';
import theme from '../utils/theme';

const PageTitle = styled.h1`
  color: ${theme.text.primary};
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  
  @media (min-width: 768px) {
    font-size: 2rem;
  }
`;

const CameraGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
`;

const CameraCard = styled(Link)`
  background-color: ${theme.background.paper};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: ${theme.shadow.sm};
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${theme.shadow.md};
  }
`;

const CameraImage = styled.div`
  height: 120px;
  background-color: ${theme.background.sidebar};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.text.muted};
  font-size: 2.5rem;
  position: relative;
  overflow: hidden;
  
  @media (min-width: 768px) {
    height: 160px;
    font-size: 3rem;
  }
`;

const CameraEmoji = styled.span`
  position: relative;
  z-index: 2;
  color: white;
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  
  @media (min-width: 768px) {
    font-size: 4rem;
  }
`;

const CameraThumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  opacity: 0.8;
`;

const PlaceholderThumbnail = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, ${theme.background.sidebar}, ${theme.background.default});
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
`;

const CameraInfo = styled.div`
  padding: 0.75rem;
  
  @media (min-width: 768px) {
    padding: 1rem;
  }
`;

const CameraName = styled.h3`
  margin: 0 0 0.5rem 0;
  color: ${theme.text.primary};
  font-size: 1rem;
  
  @media (min-width: 768px) {
    font-size: 1.2rem;
  }
`;

const CameraId = styled.p`
  margin: 0;
  color: ${theme.text.muted};
  font-size: 0.8rem;
  
  @media (min-width: 768px) {
    font-size: 0.9rem;
  }
`;

const CameraList = () => {
  const [cameras, setCameras] = useState([]);
  const [cameraDates, setCameraDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [thumbnailErrors, setThumbnailErrors] = useState({});
  
  // Load camera list
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const cameraList = await getCameras();
        setCameras(cameraList);
        
        // Load dates for each camera
        const datesPromises = cameraList.map(async (camera) => {
          try {
            const response = await fetch(`${getApiBaseUrl()}/api/cameras/${camera.id}/dates`);
            if (response.ok) {
              const dates = await response.json();
              if (dates && dates.length > 0) {
                return { cameraId: camera.id, dates };
              }
            }
          } catch (err) {
            console.error(`Unable to get dates for camera ${camera.id}:`, err);
          }
          return { cameraId: camera.id, dates: [] };
        });
        
        const results = await Promise.all(datesPromises);
        
        // Convert date information to object format
        const datesByCamera = {};
        results.forEach(result => {
          datesByCamera[result.cameraId] = result.dates;
        });
        
        setCameraDates(datesByCamera);
      } catch (error) {
        console.error('Failed to load camera list:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCameras();
  }, []);
  
  // Handle camera thumbnail loading errors
  const handleThumbnailError = (cameraId) => {
    console.warn(`Thumbnail loading failed for camera ${cameraId}, using placeholder image`);
    setThumbnailErrors(prev => ({
      ...prev,
      [cameraId]: true
    }));
    // Use placeholder image, don't retry loading
  };
  
  // Get the latest date for a camera
  const getLatestDate = (cameraId) => {
    if (cameraDates[cameraId] && cameraDates[cameraId].length > 0) {
      // Return the latest date
      return cameraDates[cameraId][cameraDates[cameraId].length - 1].date;
    }
    return null;
  };
  
  // Get thumbnail URL
  const getThumbnailUrl = (cameraId) => {
    // Get the last available date period for the camera
    const latestDate = getLatestDate(cameraId);
    if (latestDate) {
      // Use the same path format as DateList.js
      return `${getApiBaseUrl()}/api/thumbnails/${cameraId}/${latestDate}`;
    }
    
    // If no date records are available, use default path
    return `${getApiBaseUrl()}/api/camera-thumbnail/${cameraId}`;
  };
  
  if (loading) {
    return <div>載入中...</div>;
  }
  
  return (
    <div>
      <PageTitle>監視器相機列表</PageTitle>
      
      {cameras.length === 0 ? (
        <p>沒有找到相機。</p>
      ) : (
        <CameraGrid>
          {cameras.map(camera => (
            <CameraCard key={camera.id} to={`/camera/${camera.id}`}>
              <CameraImage>
                {!thumbnailErrors[camera.id] ? (
                  <CameraThumbnail 
                    src={getThumbnailUrl(camera.id)}
                    alt={`${camera.name} 縮略圖`}
                    onError={() => handleThumbnailError(camera.id)}
                  />
                ) : (
                  <PlaceholderThumbnail />
                )}
                <CameraEmoji>▶</CameraEmoji>
              </CameraImage>
              <CameraInfo>
                <CameraName>{camera.name}</CameraName>
                <CameraId>ID: {camera.id}</CameraId>
              </CameraInfo>
            </CameraCard>
          ))}
        </CameraGrid>
      )}
    </div>
  );
};

export default CameraList; 