// 藍色現代風格主題
const theme = {
  // 主要顏色
  primary: {
    main: '#3b82f6',     // 主要藍色
    light: '#60a5fa',    // 淺藍色
    dark: '#0a2540',     // 深藍色
    contrastText: '#ffffff', // 對比文字色（白色）
  },
  
  // 背景顏色
  background: {
    default: '#f8fafc',  // 頁面背景
    paper: '#ffffff',    // 元件背景
    sidebar: '#f1f5f9',  // 側邊欄背景
    hover: '#f1f5f9',    // 懸停背景
    disabled: '#e2e8f0', // 禁用狀態背景
  },
  
  // 文字顏色
  text: {
    primary: '#0f172a',   // 主要文字
    secondary: '#334155', // 次要文字
    muted: '#64748b',     // 淡化文字
    light: '#e0e0e0',     // 淺色文字（用於深色背景）
    disabled: '#94a3b8',  // 禁用狀態文字
  },
  
  // 邊框顏色
  border: {
    light: '#e2e8f0',     // 淺色邊框
    default: '#cbd5e1',   // 默認邊框
  },
  
  // 狀態顏色
  status: {
    success: '#10b981',   // 成功
    warning: '#f59e0b',   // 警告
    error: '#ef4444',     // 錯誤
    info: '#0ea5e9',      // 信息
  },
  
  // 陰影
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  }
};

export default theme; 