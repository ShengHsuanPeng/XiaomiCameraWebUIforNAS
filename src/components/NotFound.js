import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import theme from '../utils/theme';

const Container = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: ${theme.text.primary};
  margin-bottom: 1rem;
`;

const Message = styled.p`
  font-size: 1.2rem;
  color: ${theme.text.muted};
  margin-bottom: 2rem;
`;

const HomeLink = styled(Link)`
  display: inline-block;
  background-color: ${theme.primary.main};
  color: ${theme.primary.contrastText};
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${theme.primary.dark};
  }
`;

const NotFound = () => {
  return (
    <Container>
      <Title>404 - 頁面未找到</Title>
      <Message>您嘗試訪問的頁面不存在或已被移除。</Message>
      <HomeLink to="/">返回首頁</HomeLink>
    </Container>
  );
};

export default NotFound; 