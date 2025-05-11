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

const DateHeader = styled.div`
  background-color: ${theme.background.sidebar};
  padding: 0.75rem 1rem;
  border-radius: 8px 8px 0 0;
  margin-top: 1.5rem;
  font-weight: 600;
  color: ${theme.text.primary};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DateSection = styled.div`
  margin-bottom: 2rem;
`;

const TimeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background-color: ${theme.background.paper};
  border-radius: 0 0 8px 8px;
  box-shadow: ${theme.shadow.sm};
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }
`;

const TimeCard = styled(Link)`
  background-color: ${theme.background.default};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: ${theme.shadow.sm};
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.shadow.md};
  }
`;

const TimeThumbContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 寬高比 */
  background-color: ${theme.background.sidebar};
  overflow: hidden;
`;

const TimeThumb = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const TimeThumbFallback = styled.div`
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
  font-size: 1.2rem;
`;

const TimeInfo = styled.div`
  padding: 0.75rem;
  text-align: center;
`;

const TimeLabel = styled.div`
  font-weight: 500;
  color: ${theme.text.primary};
  font-size: 1.1rem;
`;

const PlayIcon = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 32px;
  height: 32px;
  background-color: rgba(59, 130, 246, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  opacity: 0.8;
  transition: opacity 0.2s, transform 0.2s;
  
  ${TimeCard}:hover & {
    opacity: 1;
    transform: scale(1.1);
  }
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
`;

const FilterLabel = styled.div`
  color: ${theme.text.muted};
  font-size: 0.9rem;
  margin-right: 0.5rem;
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid ${theme.border.light};
  background-color: ${theme.background.paper};
  color: ${theme.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${theme.primary.main};
  }
`;

const CalendarButton = styled.button`
  background-color: ${theme.background.paper};
  border: 1px solid ${theme.border.light};
  border-radius: 4px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
  color: ${theme.text.primary};
  font-weight: 500;
  
  &:hover {
    background-color: ${theme.background.sidebar};
  }
  
  svg {
    width: 20px;
    height: 20px;
    margin-right: ${props => props.hasText ? '0.5rem' : '0'};
    color: ${theme.primary.main};
  }
`;

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CalendarOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const CalendarContainer = styled.div`
  background-color: ${theme.background.paper};
  border-radius: 8px;
  box-shadow: ${theme.shadow.lg};
  overflow: hidden;
  max-width: 90%;
  width: 360px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;

const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid ${theme.border.light};
`;

const CalendarTitle = styled.h3`
  margin: 0;
  color: ${theme.text.primary};
`;

const CalendarControls = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const CalendarButton2 = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${theme.text.secondary};
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background-color: ${theme.background.sidebar};
    color: ${theme.text.primary};
  }
`;

const CalendarBody = styled.div`
  padding: 1rem;
  overflow-y: auto;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
`;

const CalendarDay = styled.div`
  text-align: center;
  padding: 0.5rem;
  cursor: ${props => (props.isSelectable && props.hasVideos) ? 'pointer' : 'default'};
  border-radius: 4px;
  color: ${props => {
    if (!props.isCurrentMonth) return theme.text.muted;
    if (!props.hasVideos) return theme.text.disabled || '#aaa';
    if (props.isToday) return theme.primary.main;
    return theme.text.primary;
  }};
  font-weight: ${props => props.isToday ? 'bold' : 'normal'};
  background-color: ${props => props.isSelected ? theme.primary.light : 
    props.hasVideos ? `rgba(59, 130, 246, 0.15)` : 'transparent'};
  border: ${props => props.isSelected ? `1px solid ${theme.primary.main}` : 
    props.hasVideos ? `1px solid rgba(59, 130, 246, 0.3)` : 'none'};
  position: relative;
  opacity: ${props => (!props.isCurrentMonth || !props.hasVideos) ? 0.5 : 1};
  
  &:hover {
    background-color: ${props => (props.isSelectable && props.hasVideos) ? theme.background.sidebar : 'transparent'};
  }
  
  &::after {
    content: '';
    display: ${props => props.hasVideos ? 'block' : 'none'};
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: ${theme.primary.main};
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
  }
`;

const CalendarDayHeader = styled.div`
  text-align: center;
  padding: 0.5rem;
  color: ${theme.text.secondary};
  font-weight: 500;
`;

const CalendarFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid ${theme.border.light};
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background-color: ${theme.background.sidebar};
  color: ${theme.text.primary};
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 0.5rem;
  white-space: nowrap;
  
  &:hover {
    background-color: ${theme.border.light};
  }
`;

const ApplyButton = styled.button`
  background-color: ${theme.primary.main};
  color: ${theme.primary.contrastText};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: ${theme.primary.dark};
  }
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
  const [filteredDates, setFilteredDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [thumbnailErrors, setThumbnailErrors] = useState({});

  // 篩選狀態
  const [dateFilter, setDateFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState({});
  
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
        // 獲取日期列表
        const dateList = await getCameraDates(cameraId);
        console.log('獲取到的日期列表:', dateList);
        
        setDates(dateList);
        setFilteredDates(dateList);
        
        // 構建可用日期映射，以便在日曆中顯示
        const dateMap = {};
        dateList.forEach(date => {
          const year = date.date.substring(0, 4);
          const month = date.date.substring(4, 6);
          const day = date.date.substring(6, 8);
          const key = `${year}-${month}-${day}`;
          
          if (!dateMap[key]) {
            dateMap[key] = [];
          }
          dateMap[key].push(date);
        });
        setAvailableDates(dateMap);
        
        // 設置初始日期為今天或最近的日期
        const today = new Date();
        setCalendarDate(today);
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
  
  // 根據選擇的日期和時間篩選日期
  useEffect(() => {
    if (dates.length === 0) return;
    
    let filtered = [...dates];
    
    // 根據選定的日期篩選
    if (dateFilter !== 'all' && selectedDate) {
      const year = selectedDate.getFullYear().toString().padStart(4, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;
      
      filtered = filtered.filter(date => date.date.startsWith(datePrefix));
    }
    
    // 根據時段篩選
    if (timeFilter !== 'all') {
      filtered = filtered.filter(date => {
        const hour = parseInt(date.date.substring(8, 10), 10);
        
        switch (timeFilter) {
          case 'morning':
            return hour >= 6 && hour < 12;
          case 'afternoon':
            return hour >= 12 && hour < 18;
          case 'evening':
            return hour >= 18 && hour < 22;
          case 'night':
            return hour >= 22 || hour < 6;
          default:
            return true;
        }
      });
    }
    
    setFilteredDates(filtered);
  }, [dates, dateFilter, timeFilter, selectedDate]);
  
  // 生成行事曆數據
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    // 獲取該月的第一天和最後一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 獲取該月第一天是星期幾（0是星期日，6是星期六）
    const firstDayOfWeek = firstDay.getDay();
    
    // 獲取該月的總天數
    const daysInMonth = lastDay.getDate();
    
    // 創建日期數組
    const days = [];
    
    // 添加上個月的日期來填充第一行
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
        isToday: false,
        isSelectable: false
      });
    }
    
    // 檢查日期是否有錄影
    const hasVideos = (year, month, day) => {
      const formattedYear = year.toString().padStart(4, '0');
      const formattedMonth = (month + 1).toString().padStart(2, '0');
      const formattedDay = day.toString().padStart(2, '0');
      const key = `${formattedYear}-${formattedMonth}-${formattedDay}`;
      return availableDates[key] && availableDates[key].length > 0;
    };
    
    // 添加本月的日期
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = (
        year === today.getFullYear() &&
        month === today.getMonth() &&
        i === today.getDate()
      );
      
      const isSelected = (
        selectedDate &&
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === i
      );
      
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isSelectable: true,
        hasVideos: hasVideos(year, month, i)
      });
    }
    
    // 如果總數小於42，添加下個月的日期來填充
    const totalDays = days.length;
    const daysToAdd = Math.ceil((42 - totalDays) / 7) * 7;
    
    for (let i = 1; i <= daysToAdd; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
        isToday: false,
        isSelectable: false
      });
    }
    
    return days;
  };
  
  // 選擇日期
  const handleSelectDate = (day) => {
    if (!day.isSelectable || !day.hasVideos) return;
    
    const newDate = new Date(day.year, day.month, day.day);
    setSelectedDate(newDate);
    
    // 設置篩選器為選擇的日期
    setDateFilter('selected');
    setShowCalendar(false);
    
    // 應用篩選
    const year = day.year.toString().padStart(4, '0');
    const month = (day.month + 1).toString().padStart(2, '0');
    const dayStr = day.day.toString().padStart(2, '0');
    const datePrefix = `${year}${month}${dayStr}`;
    
    const filtered = dates.filter(date => date.date.startsWith(datePrefix));
    setFilteredDates(filtered);
  };
  
  // 清除日期篩選
  const handleClearDateFilter = () => {
    setDateFilter('all');
    setSelectedDate(null);
    
    // 應用其他篩選條件
    let filtered = [...dates];
    
    // 根據時段篩選
    if (timeFilter !== 'all') {
      filtered = filtered.filter(date => {
        const hour = parseInt(date.date.substring(8, 10), 10);
        
        switch (timeFilter) {
          case 'morning':
            return hour >= 6 && hour < 12;
          case 'afternoon':
            return hour >= 12 && hour < 18;
          case 'evening':
            return hour >= 18 && hour < 22;
          case 'night':
            return hour >= 22 || hour < 6;
          default:
            return true;
        }
      });
    }
    
    setFilteredDates(filtered);
  };
  
  // 下一個月
  const handleNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
  };
  
  // 上一個月
  const handlePrevMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
  };
  
  // 星期列表
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  
  // 獲取月份名稱
  const getMonthName = (month) => {
    const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return months[month];
  };
  
  // 格式化選中的日期顯示
  const formatSelectedDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // 修改 groupDatesByDay 函數中的縮略圖處理
  const groupDatesByDay = (dates) => {
    const groups = {};
    
    dates.forEach(date => {
      // 從日期中提取年月日
      const year = date.date.substring(0, 4);
      const month = date.date.substring(4, 6);
      const day = date.date.substring(6, 8);
      const dayKey = `${year}-${month}-${day}`;
      
      if (!groups[dayKey]) {
        groups[dayKey] = {
          displayDate: `${year}年${month}月${day}日`,
          times: []
        };
      }
      
      // 從日期中提取小時
      const hour = date.date.substring(8, 10);
      
      groups[dayKey].times.push({
        ...date,
        displayTime: `${hour}:00`
      });
    });
    
    // 將分組轉換為陣列並排序（按日期降序）
    return Object.entries(groups)
      .map(([key, group]) => ({ key, ...group }))
      .sort((a, b) => b.key.localeCompare(a.key));
  };
  
  // 處理縮略圖錯誤
  const handleThumbnailError = (dateId) => {
    setThumbnailErrors(prev => ({
      ...prev,
      [dateId]: true
    }));
  };
  
  // 獲取API基礎URL
  const getApiBaseUrl = () => {
    // 如果在生產環境，使用相對路徑
    if (process.env.NODE_ENV === 'production') {
      return '';
    }
    
    // 嘗試從環境變數獲取
    if (process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }
    
    // 使用與dataUtils.js相同的邏輯
    return 'http://192.168.68.69:5001';
  };
  
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
          <FilterContainer>
            <FilterGroup>
              <FilterLabel>日期篩選</FilterLabel>
              <CalendarButton onClick={() => setShowCalendar(true)}>
                <CalendarIcon />
                <span>{dateFilter === 'selected' && selectedDate ? formatSelectedDate(selectedDate) : '選擇日期'}</span>
              </CalendarButton>
              {dateFilter === 'selected' && (
                <CloseButton onClick={handleClearDateFilter}>
                  清除
                </CloseButton>
              )}
            </FilterGroup>
            
            <FilterGroup>
              <FilterLabel>時間篩選</FilterLabel>
              <FilterSelect 
                value={timeFilter} 
                onChange={e => setTimeFilter(e.target.value)}
              >
                <option value="all">全部時段</option>
                <option value="morning">上午 (6-12點)</option>
                <option value="afternoon">下午 (12-18點)</option>
                <option value="evening">傍晚 (18-22點)</option>
                <option value="night">深夜 (22-6點)</option>
              </FilterSelect>
            </FilterGroup>
          </FilterContainer>
          
          <OrderInfo>按時間順序顯示（從早到晚）| 共 {filteredDates.length} 個時段</OrderInfo>
          
          {/* 日期分組顯示 */}
          {groupDatesByDay(filteredDates).map(dateGroup => (
            <DateSection key={dateGroup.key}>
              <DateHeader>
                <span>{dateGroup.displayDate}</span>
                <span>{dateGroup.times.length} 個時段</span>
              </DateHeader>
              <TimeGrid>
                {dateGroup.times.map((time, timeIndex) => (
                  <TimeCard key={time.date} to={`/camera/${cameraId}/date/${time.date}`}>
                    <TimeThumbContainer>
                      {!thumbnailErrors[time.date] ? (
                        <TimeThumb 
                          src={`${getApiBaseUrl()}/api/thumbnails/${cameraId}/${time.date}`}
                          alt={`${time.displayTime} 預覽圖`} 
                          onError={() => handleThumbnailError(time.date)}
                        />
                      ) : (
                        <TimeThumbFallback>
                          <span>{time.displayTime}</span>
                        </TimeThumbFallback>
                      )}
                      <PlayIcon>▶</PlayIcon>
                    </TimeThumbContainer>
                    <TimeInfo>
                      <TimeLabel>{time.displayTime}</TimeLabel>
                    </TimeInfo>
                  </TimeCard>
                ))}
              </TimeGrid>
            </DateSection>
          ))}
          
          {/* 行事曆彈窗 */}
          {showCalendar && (
            <CalendarOverlay onClick={() => setShowCalendar(false)}>
              <CalendarContainer onClick={e => e.stopPropagation()}>
                <CalendarHeader>
                  <CalendarTitle>
                    {getMonthName(calendarDate.getMonth())} {calendarDate.getFullYear()}
                  </CalendarTitle>
                  <CalendarControls>
                    <CalendarButton2 onClick={handlePrevMonth}>
                      &lt;
                    </CalendarButton2>
                    <CalendarButton2 onClick={handleNextMonth}>
                      &gt;
                    </CalendarButton2>
                  </CalendarControls>
                </CalendarHeader>
                
                <CalendarBody>
                  <CalendarGrid>
                    {/* 星期列表 */}
                    {weekdays.map(day => (
                      <CalendarDayHeader key={day}>{day}</CalendarDayHeader>
                    ))}
                    
                    {/* 日期方格 */}
                    {generateCalendarDays().map((day, index) => (
                      <CalendarDay 
                        key={index} 
                        isCurrentMonth={day.isCurrentMonth}
                        isToday={day.isToday}
                        isSelected={day.isSelected}
                        isSelectable={day.isSelectable}
                        hasVideos={day.hasVideos}
                        onClick={() => handleSelectDate(day)}
                      >
                        {day.day}
                      </CalendarDay>
                    ))}
                  </CalendarGrid>
                </CalendarBody>
                
                <CalendarFooter>
                  <CloseButton onClick={() => setShowCalendar(false)} style={{marginLeft: 0}}>
                    取消
                  </CloseButton>
                </CalendarFooter>
              </CalendarContainer>
            </CalendarOverlay>
          )}
        </>
      )}
    </div>
  );
};

export default DateList; 