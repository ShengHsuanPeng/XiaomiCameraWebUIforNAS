import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { getCameraDates, getCameraName, getCameraNameSync } from '../utils/dataUtils';
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
  padding-top: 56.25%; /* 16:9 aspect ratio */
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

// pagination controller style
const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 2rem 0;
  gap: 0.5rem;
`;

const PageButton = styled.button`
  background-color: ${props => props.isActive ? theme.primary.main : theme.background.paper};
  color: ${props => props.isActive ? theme.primary.contrastText : theme.text.primary};
  border: 1px solid ${props => props.isActive ? theme.primary.main : theme.border.light};
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover {
    background-color: ${props => props.disabled ? null : props.isActive ? theme.primary.dark : theme.background.sidebar};
  }
`;

const PageInfo = styled.div`
  color: ${theme.text.secondary};
  padding: 0.5rem;
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

// format date label based on screen width
const formatDateLabel = (label, isMobile) => {
  if (isMobile) {
    // on mobile only show month day and hour, e.g. 05-11 14:00
    const parts = label.split(' ');
    if (parts.length === 2) {
      const dateParts = parts[0].split('-');
      if (dateParts.length === 3) {
        return `${dateParts[1]}-${dateParts[2]} ${parts[1]}`;
      }
    }
  }
  return label; // on desktop show full date
};


const DateList = () => {
  const { cameraId } = useParams();
  const [dates, setDates] = useState([]);
  const [filteredDates, setFilteredDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [thumbnailErrors, setThumbnailErrors] = useState({});
  const [cameraName, setCameraName] = useState(cameraId); // default use ID, update later

  // filter status
  const [dateFilter, setDateFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState({});
  
  // pagination status
  const [currentPage, setCurrentPage] = useState(1);
  const daysPerPage = 7;
  
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
        // get date list
        const dateList = await getCameraDates(cameraId);
        console.log('get date list:', dateList);
        
        setDates(dateList);
        setFilteredDates(dateList);
        
        // build available date map, to show in calendar
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
        
        // set initial date to today or nearest date
        const today = new Date();
        setCalendarDate(today);
      } catch (error) {
        console.error('load date list failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (cameraId) {
      loadDates();
    }
  }, [cameraId]);
  
  // load camera name
  useEffect(() => {
    if (!cameraId) return;
    
    const loadCameraName = async () => {
      const name = await getCameraName(cameraId);
      setCameraName(name);
    };
    
    loadCameraName();
  }, [cameraId]);
  
  // filter date based on selected date and time
  useEffect(() => {
    if (dates.length === 0) return;
    
    let filtered = [...dates];
    
    // filter date based on selected date
    if (dateFilter !== 'all' && selectedDate) {
      const year = selectedDate.getFullYear().toString().padStart(4, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;
      
      filtered = filtered.filter(date => date.date.startsWith(datePrefix));
    }
    
    // filter date based on time
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
  
  // generate calendar data
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    // get first day and last day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // get first day of the week (0 is Sunday, 6 is Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // get total days of the month
    const daysInMonth = lastDay.getDate();
    
    // create date array
    const days = [];
    
    // add previous month's date to fill the first row
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
    
    // check if date has video
    const hasVideos = (year, month, day) => {
      const formattedYear = year.toString().padStart(4, '0');
      const formattedMonth = (month + 1).toString().padStart(2, '0');
      const formattedDay = day.toString().padStart(2, '0');
      const key = `${formattedYear}-${formattedMonth}-${formattedDay}`;
      return availableDates[key] && availableDates[key].length > 0;
    };
    
    // add current month's date
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
    
    // if total days is less than 42, add next month's date to fill
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
  
  // select date
  const handleSelectDate = (day) => {
    if (!day.isSelectable || !day.hasVideos) return;
    
    const newDate = new Date(day.year, day.month, day.day);
    setSelectedDate(newDate);
    
    // set filter to selected date
    setDateFilter('selected');
    setShowCalendar(false);
    
    // apply filter
    const year = day.year.toString().padStart(4, '0');
    const month = (day.month + 1).toString().padStart(2, '0');
    const dayStr = day.day.toString().padStart(2, '0');
    const datePrefix = `${year}${month}${dayStr}`;
    
    const filtered = dates.filter(date => date.date.startsWith(datePrefix));
    setFilteredDates(filtered);
  };
  
  // clear date filter
  const handleClearDateFilter = () => {
    setDateFilter('all');
    setSelectedDate(null);
    
    // apply other filters
    let filtered = [...dates];
    
    // filter date based on time
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
  
  // next month
  const handleNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
  };
  
  // previous month
  const handlePrevMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
  };
  
  // weekdays list
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  
  // get month name
  const getMonthName = (month) => {
    const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return months[month];
  };
  
  // format selected date
  const formatSelectedDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // modify groupDatesByDay function to handle thumbnail error
  const groupDatesByDay = (dates) => {
    const groups = {};
    
    dates.forEach(date => {
      // extract year, month, day from date
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
      
      // extract hour from date
      const hour = date.date.substring(8, 10);
      
      groups[dayKey].times.push({
        ...date,
        displayTime: `${hour}:00`
      });
    });
    
    // convert groups to array and sort (by date descending)
    return Object.entries(groups)
      .map(([key, group]) => ({ key, ...group }))
      .sort((a, b) => b.key.localeCompare(a.key));
  };
  
  // handle thumbnail error
  const handleThumbnailError = (dateId) => {
    console.warn(`date ${dateId} thumbnail loading failed, use placeholder image`);
    setThumbnailErrors(prev => ({
      ...prev,
      [dateId]: true
    }));
    // do not retry loading, use placeholder image directly
  };
  
  // get API base URL
  const getApiBaseUrl = () => {
    // if in production environment, use relative path
    if (process.env.NODE_ENV === 'production') {
      return '';
    }
    
    // try to get from environment variable
    if (process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }
    
    // use environment variable IP and port, if not set, use default value
    const apiHost = process.env.REACT_APP_API_HOST || '192.168.68.69';
    const apiPort = process.env.REACT_APP_API_PORT || '5001';
    
    return `http://${apiHost}:${apiPort}`;
  };
  
  if (loading) {
    return <div>載入中...</div>;
  }
  
  // calculate grouped dates data
  const groupedDates = groupDatesByDay(filteredDates);
  const totalPages = Math.ceil(groupedDates.length / daysPerPage);
  
  // get current page's date group
  const currentDates = groupedDates.slice(
    (currentPage - 1) * daysPerPage,
    currentPage * daysPerPage
  );
  
  // handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    
    // scroll to top of the page
    window.scrollTo(0, 0);
  };
  
  return (
    <div>
      <BackLink to="/">← 返回相機列表</BackLink>
      <PageTitle>監視錄影日期</PageTitle>
      <SubTitle>{cameraName}</SubTitle>
      
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
          
          {/* date group display - only show current page's date group */}
          {currentDates.map(dateGroup => (
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
          
          {/* pagination controller */}
          {totalPages > 1 && (
            <PaginationContainer>
              <PageButton 
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                &laquo;
              </PageButton>
              <PageButton 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lt;
              </PageButton>
              
              <PageInfo>
                {currentPage} / {totalPages} 頁
              </PageInfo>
              
              <PageButton 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                &gt;
              </PageButton>
              <PageButton 
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                &raquo;
              </PageButton>
            </PaginationContainer>
          )}
          
          {/* calendar popup */}
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
                    {/* weekdays list */}
                    {weekdays.map(day => (
                      <CalendarDayHeader key={day}>{day}</CalendarDayHeader>
                    ))}
                    
                    {/* date grid */}
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