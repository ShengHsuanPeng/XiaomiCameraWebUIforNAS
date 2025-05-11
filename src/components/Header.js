import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import theme from '../utils/theme';
import { getCameras } from '../utils/dataUtils';

const HeaderContainer = styled.header`
  background-color: ${theme.primary.dark};
  color: ${theme.primary.contrastText};
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: ${theme.shadow.md};
  position: relative;
  
  @media (min-width: 768px) {
    padding: 1rem 2rem;
  }
`;

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: ${theme.primary.light};
  
  &:hover {
    color: ${theme.primary.contrastText};
  }
  
  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;

const LogoImage = styled.img`
  height: 32px;
  margin-right: 8px;
  
  @media (min-width: 768px) {
    height: 40px;
  }
`;

const Navigation = styled.nav`
  display: flex;
  gap: 1rem;
  
  @media (min-width: 768px) {
    gap: 1.5rem;
  }
`;

const NavLink = styled(Link)`
  color: ${theme.text.light};
  font-weight: 500;
  font-size: 0.9rem;
  
  &:hover {
    color: ${theme.primary.light};
  }
  
  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

const MobileNavButton = styled.button`
  background: none;
  border: none;
  color: ${theme.primary.contrastText};
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileNavDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background-color: ${theme.background.paper};
  border: 1px solid ${theme.border.light};
  border-radius: 4px;
  box-shadow: ${theme.shadow.md};
  width: 200px;
  z-index: 1000;
  display: ${props => props.isOpen ? 'block' : 'none'};
`;

const DropdownList = styled.ul`
  list-style: none;
  padding: 0.5rem 0;
  margin: 0;
`;

const DropdownItem = styled.li`
  margin: 0;
`;

const DropdownLink = styled(Link)`
  display: block;
  padding: 0.75rem 1rem;
  color: ${theme.text.primary};
  text-decoration: none;
  
  &:hover {
    background-color: ${theme.background.default};
  }
`;

const Header = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [navOpen, setNavOpen] = useState(false);
  const [cameras, setCameras] = useState([]);

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
    const loadCameras = async () => {
      const cameraList = await getCameras();
      setCameras(cameraList);
    };
    
    if (isMobile) {
      loadCameras();
    }
  }, [isMobile]);
  
  // 點擊外部區域關閉導航
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navOpen && !event.target.closest('.mobile-nav')) {
        setNavOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [navOpen]);
  
  const toggleNav = (e) => {
    e.stopPropagation();
    setNavOpen(!navOpen);
  };
  
  return (
    <HeaderContainer>
      <Logo to="/">
        <LogoImage src="/logo.png" alt="監視器標誌" />
        監視器系統
      </Logo>
      
      {isMobile && (
        <div className="mobile-nav">
          <MobileNavButton onClick={toggleNav}>
            {navOpen ? '✕' : '☰'}
          </MobileNavButton>
          
          <MobileNavDropdown isOpen={navOpen}>
            <DropdownList>
              <DropdownItem>
                <DropdownLink to="/" onClick={() => setNavOpen(false)}>
                  相機列表
                </DropdownLink>
              </DropdownItem>
              {cameras.map(camera => (
                <DropdownItem key={camera.id}>
                  <DropdownLink 
                    to={`/camera/${camera.id}`}
                    onClick={() => setNavOpen(false)}
                  >
                    {camera.name}
                  </DropdownLink>
                </DropdownItem>
              ))}
            </DropdownList>
          </MobileNavDropdown>
        </div>
      )}
    </HeaderContainer>
  );
};

export default Header; 