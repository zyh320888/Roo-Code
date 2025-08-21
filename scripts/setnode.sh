#!/bin/bash

# 确保 /usr/local/bin 优先于 /node/bin
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc

# 保存并刷新配置
source ~/.bashrc

# 安装n版本管理器
npm i -g n

# 安装指定版本的Node.js
n 20.19.2


npm i -g pnpm