import { DEFAULT_API_CONFIG } from './utils/api.js';

// Initialize default settings if not set
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const result = await chrome.storage.sync.get(['serviceType', 'online', 'local', 'intranet']);
    
    // 只在完全没有配置的情况下设置默认值
    if (!result.serviceType && !result.online && !result.local && !result.intranet) {
      await chrome.storage.sync.set(DEFAULT_API_CONFIG);
    }

    // 启用 sidePanel
    if (chrome.sidePanel) {
      await chrome.sidePanel.setOptions({
        enabled: true,
        path: 'sidepanel.html'
      });
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

// 存储连接的端口
let sidepanelPorts = new Map();

// 监听来自 sidepanel 的连接
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    // 使用默认值，因为 sidepanel 的 sender.tab 是 undefined
    const tabId = 'default';
    console.log('Sidepanel connected');
    sidepanelPorts.set(tabId, port);

    // 监听断开连接
    port.onDisconnect.addListener(() => {
      console.log('Sidepanel disconnected');
      sidepanelPorts.delete(tabId);
    });

    // 监听来自 sidepanel 的消息
    port.onMessage.addListener(async (message) => {
      try {
        switch (message.type) {
          case 'GET_CURRENT_TAB':
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            port.postMessage({
              type: 'CURRENT_TAB',
              data: tab
            });
            break;

          case 'EXECUTE_SCRIPT':
            const result = await chrome.scripting.executeScript({
              target: { tabId: message.data.tabId },
              function: message.data.function,
              args: message.data.args || []
            });
            port.postMessage({
              type: 'SCRIPT_RESULT',
              data: result
            });
            break;

          case 'START_SELECTION':
            await chrome.scripting.executeScript({
              target: { tabId: message.data.tabId },
              function: () => {
                // 创建选择覆盖层
                const overlay = document.createElement('div');
                overlay.className = 'selection-overlay';
                overlay.style.cssText = `
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(0, 0, 0, 0.3);
                  z-index: 999999;
                  cursor: crosshair;
                `;
                document.body.appendChild(overlay);

                // 处理选择操作
                let isSelecting = false;
                let startX, startY;
                let selectionBox = null;

                overlay.addEventListener('mousedown', (e) => {
                  isSelecting = true;
                  startX = e.clientX;
                  startY = e.clientY;

                  selectionBox = document.createElement('div');
                  selectionBox.style.cssText = `
                    position: fixed;
                    border: 2px solid #1a237e;
                    background: rgba(26, 35, 126, 0.1);
                    pointer-events: none;
                  `;
                  overlay.appendChild(selectionBox);
                });

                overlay.addEventListener('mousemove', (e) => {
                  if (!isSelecting) return;

                  const currentX = e.clientX;
                  const currentY = e.clientY;

                  const left = Math.min(startX, currentX);
                  const top = Math.min(startY, currentY);
                  const width = Math.abs(currentX - startX);
                  const height = Math.abs(currentY - startY);

                  selectionBox.style.left = left + 'px';
                  selectionBox.style.top = top + 'px';
                  selectionBox.style.width = width + 'px';
                  selectionBox.style.height = height + 'px';
                });

                overlay.addEventListener('mouseup', (e) => {
                  if (!isSelecting) return;
                  isSelecting = false;

                  const rect = selectionBox.getBoundingClientRect();
                  const elements = document.elementsFromPoint(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2
                  );

                  // 发送选区信息给 background script
                  const port = chrome.runtime.connect({ name: 'content-script' });
                  port.postMessage({
                    type: 'AREA_SELECTED',
                    data: {
                      rect: {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                      },
                      elements: elements.length
                    }
                  });

                  // 清理选择界面
                  overlay.remove();
                });
              }
            });
            break;
        }
      } catch (error) {
        console.error('处理 sidepanel 消息失败:', error);
        port.postMessage({
          type: 'ERROR',
          error: error.message
        });
      }
    });
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const port = sidepanelPorts.get('default');
    if (port) {
      port.postMessage({
        type: 'PAGE_UPDATED',
        data: {
          tabId,
          url: tab.url,
          title: tab.title
        }
      });
    }
  }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const port = sidepanelPorts.get('default');
    if (port) {
      port.postMessage({
        type: 'TAB_ACTIVATED',
        data: {
          tabId: activeInfo.tabId,
          url: tab.url,
          title: tab.title
        }
      });
    }
  } catch (error) {
    console.error('获取标签页信息失败:', error);
  }
});

// 监听下载进度
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state) {
    // 向所有连接的 sidepanel 发送下载状态
    for (const port of sidepanelPorts.values()) {
      port.postMessage({
        type: 'DOWNLOAD_STATUS',
        data: {
          id: delta.id,
          state: delta.state.current
        }
      });
    }
  }
});

// 处理扩展图标点击
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 打开侧边栏
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_API_CONFIG') {
        chrome.storage.sync.get(['serviceType', 'online', 'local', 'intranet'], (result) => {
            const config = {
                serviceType: result.serviceType || DEFAULT_API_CONFIG.serviceType,
                apiEndpoint: '',
                apiKey: '',
                modelSettings: {}
            };

            // 根据服务类型获取完整配置
            switch (config.serviceType) {
                case 'online':
                    if (result.online) {
                        Object.assign(config, result.online);
                    } else {
                        Object.assign(config, DEFAULT_API_CONFIG.online);
                    }
                    break;
                case 'local':
                    if (result.local) {
                        Object.assign(config, result.local);
                    } else {
                        Object.assign(config, DEFAULT_API_CONFIG.local);
                    }
                    break;
                case 'intranet':
                    if (result.intranet) {
                        Object.assign(config, result.intranet);
                    } else {
                        Object.assign(config, DEFAULT_API_CONFIG.intranet);
                    }
                    break;
            }

            sendResponse(config);
        });
        return true;
    }

    if (request.type === 'proxyRequest') {
        handleProxyRequest(request).then(response => {
            sendResponse(response);
        });
        return true; // 保持消息通道开放
    }
});

// 处理代理请求
async function handleProxyRequest(request) {
    console.log('Proxying request to:', request.url, 'Method:', request.method);
    
    try {
        // 检查 URL 是否有效
        if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
            throw new Error('Invalid URL protocol');
        }

        // 检查是否是 Ollama 请求
        const isOllamaRequest = request.url.includes('127.0.0.1:11434') || request.url.includes('localhost:11434');
        
        // 构建请求选项
        const requestOptions = {
            method: request.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...request.headers // 保留原始请求的头信息
            }
        };

        if (isOllamaRequest) {
            // Ollama 请求的特殊处理
            requestOptions.headers = {
                ...requestOptions.headers,
                'Accept': '*/*'
            };
        }

        // 如果有请求体，添加它
        if (request.body) {
            requestOptions.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
        }

        console.log('Sending request with options:', {
            url: request.url,
            method: requestOptions.method,
            headers: Object.keys(requestOptions.headers), // 只打印头信息的键，避免泄露敏感信息
            bodyPreview: requestOptions.body ? '(request body)' : 'none'
        });

        const response = await fetch(request.url, requestOptions);
        
        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorJson.message || `HTTP error! status: ${response.status}`;
            } catch {
                errorMessage = `HTTP error! status: ${response.status}`;
            }
            throw new Error(errorMessage);
        }
        
        // 获取响应文本
        const responseText = await response.text();
        
        // 尝试解析 JSON
        let responseData;
        try {
            responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
            console.warn('Failed to parse response as JSON:', error);
            responseData = { response: responseText };
        }

        return {
            success: true,
            data: responseData,
            status: response.status,
            statusText: response.statusText
        };
    } catch (error) {
        console.error('Request failed:', error);
        return {
            success: false,
            error: error.message,
            details: error.stack
        };
    }
} 