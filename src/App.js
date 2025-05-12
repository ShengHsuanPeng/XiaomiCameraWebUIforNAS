import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';

// Import page components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CameraList from './components/CameraList';
import DateList from './components/DateList';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';
import NotFound from './components/NotFound';

// Styles
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const MainContent = styled.main`
  display: flex;
  flex-direction: column;
  flex: 1;
  
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px;
`;

function App() {
  // Detect screen width for responsive design
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

  return (
    <Router>
      <AppContainer>
        <Header />
        <MainContent>
          {/* Only show sidebar on desktop version */}
          {!isMobile && <Sidebar isMobile={false} />}
          <ContentArea>
            <Routes>
              <Route path="/" element={<CameraList />} />
              <Route path="/camera/:cameraId" element={<DateList />} />
              <Route path="/camera/:cameraId/date/:date" element={<VideoList />} />
              <Route path="/camera/:cameraId/date/:date/video/:videoId" element={<VideoPlayer />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ContentArea>
        </MainContent>
      </AppContainer>
    </Router>
  );
}

export default App; 