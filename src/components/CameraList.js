import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { getCameras } from '../utils/dataUtils';
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
  
  @media (min-width: 768px) {
    height: 160px;
    font-size: 3rem;
  }
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
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const cameraList = await getCameras();
        setCameras(cameraList);
      } catch (error) {
        console.error('載入相機列表失敗:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCameras();
  }, []);
  
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
                <span>📹</span>
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