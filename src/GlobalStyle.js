import { createGlobalStyle } from 'styled-components';
import theme from './utils/theme';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${theme.background.default};
    color: ${theme.text.secondary};
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  * {
    box-sizing: border-box;
  }

  a {
    text-decoration: none;
    color: inherit;
    transition: color 0.2s ease;
  }

  button {
    cursor: pointer;
    background-color: ${theme.primary.main};
    color: ${theme.primary.contrastText};
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  button:hover {
    background-color: ${theme.primary.dark};
  }

  h1, h2, h3, h4, h5, h6 {
    color: ${theme.text.primary};
  }
`;

export default GlobalStyle; 