import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import theme from '../utils/theme';

const HeaderContainer = styled.header`
  background-color: ${theme.primary.dark};
  color: ${theme.primary.contrastText};
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: ${theme.shadow.md};
  
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

const Header = () => {
  return (
    <HeaderContainer>
      <Logo to="/">
        <LogoImage src="/logo.png" alt="監視器標誌" />
        監視器系統
      </Logo>
      <Navigation>
        <NavLink to="/">相機列表</NavLink>
      </Navigation>
    </HeaderContainer>
  );
};

export default Header; 