import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { getCameraDates } from '../utils/dataUtils';
import theme from '../utils/theme';

const PageTitle = styled.h1`
  color: ${theme.text.primary};
  margin-bottom: 1rem;
`;

const SubTitle = styled.h2`
  color: ${theme.text.muted};
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
`;

const DateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
`;

const DateCard = styled(Link)`
  background-color: ${theme.background.paper};
  border-radius: 8px;
  padding: 1rem;
  box-shadow: ${theme.shadow.sm};
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: center;
  
  @media (min-width: 768px) {
    padding: 1.25rem;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.shadow.md};
    background-color: ${theme.background.sidebar};
  }
`;

const DateIcon = styled.div`
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  color: ${theme.primary.main};
  
  @media (min-width: 768px) {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
`;

const DateLabel = styled.div`
  font-weight: 500;
  color: ${theme.text.primary};
  font-size: 0.9rem;
  
  @media (min-width: 768px) {
    font-size: 1.1rem;
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

const OrderInfo = styled.div`
  margin-bottom: 1rem;
  color: ${theme.text.muted};
  font-size: 0.9rem;
  font-style: italic;
`;

// 根據螢幕寬度格式化日期標籤
const formatDateLabel = (label, isMobile) => {
  if (isMobile) {
    // 在手機上只顯示月日和小時，例如：05-11 14:00
    const parts = label.split(' ');
    if (parts.length === 2) {
      const dateParts = parts[0].split('-');
      if (dateParts.length === 3) {
        return `${dateParts[1]}-${dateParts[2]} ${parts[1]}`;
      }
    }
  }
  return label; // 在桌面上顯示完整日期
};

const DateList = () => {
  const { cameraId } = useParams();
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
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
  
  useEffect(() => {
    const loadDates = async () => {
      try {
        const dateList = await getCameraDates(cameraId);
        setDates(dateList);
      } catch (error) {
        console.error('載入日期列表失敗:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (cameraId) {
      loadDates();
    }
  }, [cameraId]);
  
  if (loading) {
    return <div>載入中...</div>;
  }
  
  return (
    <div>
      <BackLink to="/">← 返回相機列表</BackLink>
      <PageTitle>錄影日期時間</PageTitle>
      <SubTitle>相機 ID: {cameraId}</SubTitle>
      
      {dates.length === 0 ? (
        <p>此相機沒有錄影資料。</p>
      ) : (
        <>
          <OrderInfo>按時間順序顯示（從早到晚）</OrderInfo>
          <DateGrid>
            {dates.map(date => (
              <DateCard key={date.date} to={`/camera/${cameraId}/date/${date.date}`}>
                <DateIcon>📅</DateIcon>
                <DateLabel>{formatDateLabel(date.label, isMobile)}</DateLabel>
              </DateCard>
            ))}
          </DateGrid>
        </>
      )}
    </div>
  );
};

export default DateList; 