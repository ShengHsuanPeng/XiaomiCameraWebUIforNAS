#!/bin/bash

# 顯示本機 IP 地址
echo "獲取本機 IP 地址..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  IP=$(hostname -I | awk '{print $1}')
else
  # 其他系統
  IP="localhost"
fi

echo "本機 IP 地址: $IP"
echo "您可以使用以下地址訪問應用:"
echo "- 本機訪問: http://localhost:3000"
echo "- 區網訪問: http://$IP:3000"
echo ""

# 確保縮略圖目錄存在
echo "確保縮略圖目錄存在..."
mkdir -p public/thumbnails

# 檢查是否已安裝依賴
if [ ! -d "node_modules" ]; then
  echo "安裝依賴..."
  npm install
fi

# 啟動應用
echo "啟動應用..."
npm run dev 