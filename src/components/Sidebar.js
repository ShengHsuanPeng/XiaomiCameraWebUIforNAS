import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { getCameras } from '../utils/dataUtils';
import theme from '../utils/theme';

// Responsive sidebar container
const SidebarContainer = styled.aside`
  background-color: ${theme.background.sidebar};
  padding: ${props => props.isMobile ? '0.75rem 1rem' : '1.5rem 1rem'};
  border-bottom: ${props => props.isMobile ? `1px solid ${theme.border.light}` : 'none'};
  border-right: ${props => !props.isMobile ? `1px solid ${theme.border.light}` : 'none'};
  
  ${props => !props.isMobile && `
    width: 250px;
  `}
  
  // Hide title on mobile
  ${props => props.isMobile && props.collapsed && `
    padding: 0.5rem;
  `}
`;

// Collapsible header area
const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.isMobile ? '0.5rem' : '1.5rem'};
  cursor: ${props => props.isMobile ? 'pointer' : 'default'};
`;

const SidebarTitle = styled.h3`
  margin: 0;
  color: ${theme.text.primary};
  font-size: 1.2rem;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  color: ${theme.text.muted};
  cursor: pointer;
  display: ${props => props.isMobile ? 'block' : 'none'};
  padding: 0;
`;

// Camera list styles
const CameraList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: ${props => props.isMobile && props.collapsed ? 'none' : 'flex'};
  flex-direction: ${props => props.isMobile ? 'row' : 'column'};
  flex-wrap: ${props => props.isMobile ? 'wrap' : 'nowrap'};
  gap: ${props => props.isMobile ? '0.5rem' : '0'};
`;

const CameraItem = styled.li`
  margin-bottom: ${props => props.isMobile ? '0' : '0.75rem'};
`;

const CameraLink = styled(Link)`
  display: block;
  padding: ${props => props.isMobile ? '0.4rem 0.6rem' : '0.5rem 0.75rem'};
  border-radius: 4px;
  color: ${theme.text.secondary};
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  &:hover {
    background-color: ${theme.border.light};
  }
  
  ${props => props.active && `
    background-color: ${theme.primary.main};
    color: ${theme.primary.contrastText};
    
    &:hover {
      background-color: ${theme.primary.dark};
    }
  `}
`;

const Sidebar = ({ isMobile }) => {
  const [cameras, setCameras] = useState([]);
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    const loadCameras = async () => {
      const cameraList = await getCameras();
      setCameras(cameraList);
    };
    
    loadCameras();
  }, []);
  
  // Toggle collapsed state
  const toggleCollapsed = () => {
    if (isMobile) {
      setCollapsed(!collapsed);
    }
  };
  
  return (
    <SidebarContainer isMobile={isMobile} collapsed={collapsed}>
      <SidebarHeader isMobile={isMobile} onClick={toggleCollapsed}>
        <SidebarTitle>相機列表</SidebarTitle>
        {isMobile && (
          <ToggleButton isMobile={isMobile}>
            {collapsed ? '▼' : '▲'}
          </ToggleButton>
        )}
      </SidebarHeader>
      <CameraList isMobile={isMobile} collapsed={collapsed}>
        {cameras.map(camera => (
          <CameraItem key={camera.id} isMobile={isMobile}>
            <CameraLink 
              to={`/camera/${camera.id}`}
              active={location.pathname.includes(`/camera/${camera.id}`) ? 1 : 0}
              isMobile={isMobile}
            >
              {camera.name}
            </CameraLink>
          </CameraItem>
        ))}
      </CameraList>
    </SidebarContainer>
  );
};

export default Sidebar; 