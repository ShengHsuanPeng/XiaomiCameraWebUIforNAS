#!/bin/bash

# 檢查FFmpeg是否已安裝
echo "檢查FFmpeg是否已安裝..."
if command -v ffmpeg >/dev/null 2>&1; then
  echo "✅ FFmpeg已安裝: $(ffmpeg -version | head -n 1)"
else
  echo "❌ 未找到FFmpeg！縮略圖生成功能將無法正常工作。"
  echo "請按照README.md中的說明安裝FFmpeg。"
  
  # 根據系統類型顯示安裝指令
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS: brew install ffmpeg"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux: sudo apt update && sudo apt install ffmpeg"
  else
    echo "Windows: 請訪問 https://ffmpeg.org/download.html 下載，或使用Chocolatey: choco install ffmpeg"
  fi
  
  echo ""
  echo "是否繼續啟動應用？(y/n)"
  read -r answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "已取消啟動。"
    exit 1
  fi
  
  echo "繼續啟動，但縮略圖功能可能無法正常工作。"
fi

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