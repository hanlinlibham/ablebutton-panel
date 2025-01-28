// 主文件
import { injectStyles } from './utils/styles.js';
import { parseMarkdown } from './utils/markdown.js';
import { 
    checkApiStatus, 
    sendAIRequest, 
    estimateTokenCount, 
    updateTokenStats, 
    fetchWithRetry,
    initializeApiConfig 
} from './utils/api.js';
import { executeMultiSearch, getSearchPlan, analyzeSearchResults } from './utils/search.js';
import { addMessage } from './utils/messages.js';
import { analyzeWebStructure, matchPagePattern } from './utils/pageAnalyzer.js';
import { initializePageInfo, refreshPageInfo, getCurrentPageInfo, isSpecialPage } from './utils/pageContent.js';
import { sendMessage, buildContextMessage } from './utils/messaging.js';
import { handleSearchOperation, handleChatOperation } from './utils/operations.js';
import { handleError } from './utils/error.js';
import { 
    initializeUI, 
    toggleSearchMode, 
    adjustTextareaHeight, 
    addStyles, 
    updateOperationStatus
} from './utils/ui.js';
import { createSelectionTool, activateSelectionTool } from './utils/selection.js';
import { findAndDownloadFiles, downloadFilesFromAllPages, downloadFilesFromAllDetails, downloadWithProgress } from './utils/download.js';

// 全局变量
let apiEndpoint = '';
let apiKey = '';
let messageHistory = [];
let currentPageInfo = null;
let currentTabId = null;
let port = null;
let isProcessing = false;
let lastErrorTime = 0;
let errorCount = 0;
const MAX_MESSAGE_HISTORY = 50;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// 添加选择区域功能
let selectionMode = false;
let selectedArea = null;

// 添加操作状态指示器
let currentOperation = null;

// 添加搜索模式变量
let isSearchMode = false;

// 连接到 background script
function connectToBackground() {
    port = chrome.runtime.connect({ name: 'sidepanel' });
    port.onMessage.addListener((message) => {
        console.log('收到后台消息:', message);
        // 处理来自后台的消息
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('开始初始化...');
        
        // 注入样式
        injectStyles();
        console.log('样式注入完成');
        
        // 初始化 API 配置
        const apiConfig = await initializeApiConfig();
        console.log('API 配置初始化完成:', apiConfig);
        
        // 连接到 background script
        connectToBackground();
        console.log('连接到后台完成');
        
        // 初始化页面信息
        await initializePageInfo();
        console.log('页面信息初始化完成');

        // 检查 API 状态
        const statusElement = document.getElementById('apiStatus');
        if (statusElement) {
            try {
                console.log('开始检查 API 状态...');
                const isConnected = await checkApiStatus();
                statusElement.textContent = isConnected ? '已连接' : '未连接';
                statusElement.style.color = isConnected ? '#4caf50' : '#dc3545';
                console.log('API状态检查完成:', isConnected ? '已连接' : '未连接');
            } catch (error) {
                console.error('API状态检查失败:', error);
                statusElement.textContent = '连接失败';
                statusElement.style.color = '#dc3545';
            }
        }

        // 初始化 UI
        initializeUI();
        addStyles();

        // 初始化按钮事件监听
        setupEventListeners();
        
    } catch (error) {
        console.error('初始化失败:', error);
        const apiStatus = document.getElementById('apiStatus');
        if (apiStatus) {
            apiStatus.textContent = '连接失败';
            apiStatus.style.color = '#dc3545';
        }
    }
});

// 设置事件监听器
function setupEventListeners() {
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');
        const searchToggle = document.getElementById('searchToggle');
        const downloadButton = document.getElementById('downloadButton');
        
        if (sendButton) {
        sendButton.addEventListener('click', async () => {
            if (isProcessing) return;
            
            isProcessing = true;
            try {
                const message = messageInput.value.trim();
                const chatMessages = document.getElementById('chatMessages');
                
                await sendMessage(
                    message,
                    isSearchMode,
                    messageInput,
                    chatMessages,
                    messageHistory,
                    MAX_MESSAGE_HISTORY,
                    handleSearchOperation,
                    handleChatOperation
                );
            } catch (error) {
                console.error('发送消息失败:', error);
                await handleError(error, '发送消息失败', messageHistory, MAX_MESSAGE_HISTORY);
            } finally {
                isProcessing = false;
            }
        });
        }
        
        if (messageInput) {
        messageInput.addEventListener('input', () => adjustTextareaHeight(messageInput));
        messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                sendButton?.click();
                }
            });
            messageInput.placeholder = '输入消息...';
        }

        if (searchToggle) {
            searchToggle.addEventListener('click', () => {
                isSearchMode = !isSearchMode;
            toggleSearchMode(searchToggle, isSearchMode);
        });
    }

        if (downloadButton) {
            downloadButton.addEventListener('click', async () => {
            if (isProcessing) return;
                
                isProcessing = true;
                try {
                const chatMessages = document.getElementById('chatMessages');
                const progressMessage = await addMessage('正在分析下载内容...', false, false, chatMessages);
                    
                    // 分析页面结构
                    const structure = await analyzeWebStructure(selectedArea);
                    const matches = matchPagePattern(structure);
                    
                    let result = '';
                    if (matches.length > 0) {
                        const bestMatch = matches[0];
                        console.log('最佳匹配模式:', bestMatch.pattern.name);
                        
                        switch (bestMatch.pattern.downloadMethod) {
                            case 'downloadFilesFromAllPages':
                                result = await downloadFilesFromAllPages(progressMessage);
                                break;
                            case 'downloadFilesFromAllDetails':
                                result = await downloadFilesFromAllDetails(progressMessage);
                                break;
                            default:
                                result = await findAndDownloadFiles(progressMessage);
                                break;
                        }
                    } else {
                        result = await findAndDownloadFiles(progressMessage);
                    }
                    
                    // 更新进度消息
                    if (progressMessage) {
                        const markdownContainer = progressMessage.querySelector('.markdown-body');
                        if (markdownContainer) {
                        markdownContainer.innerHTML = result;
                        }
                    }
                } catch (error) {
                    console.error('下载操作失败:', error);
                await handleError(error, '下载失败', messageHistory, MAX_MESSAGE_HISTORY);
                } finally {
                    isProcessing = false;
                }
            });
        }
}

// 清理消息历史
function cleanupMessageHistory() {
    const messages = document.querySelectorAll('.message');
    if (messages.length > MAX_MESSAGE_HISTORY) {
        const toRemove = messages.length - MAX_MESSAGE_HISTORY;
        for (let i = 0; i < toRemove; i++) {
            messages[i].remove();
        }
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 