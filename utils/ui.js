// UI 操作模块

// 创建进度条元素
export function createProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressContainer.appendChild(progressBar);
    return { progressContainer, progressBar };
}

// 更新状态消息
export async function updateStatus(statusMessage, emoji, text, isLoading = true, currentStep = 0, totalSteps = 4) {
    if (statusMessage && statusMessage.querySelector('.markdown-body')) {
        // 更新文本
        statusMessage.querySelector('.markdown-body').innerHTML = 
            `<span class="status-text">${emoji} ${text}${isLoading ? ' <span class="loading-dots">...</span>' : ''}</span>`;
        
        // 更新进度条
        const progressBar = statusMessage.querySelector('.progress-bar');
        if (progressBar) {
            const progress = (currentStep / totalSteps) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // 确保滚动到最新消息
        statusMessage.scrollIntoView({ behavior: 'smooth' });
        // 添加小延迟使状态更新看起来更自然
        await new Promise(resolve => setTimeout(resolve, 800));
    }
}

// 更新操作状态
export function updateOperationStatus(message) {
    const statusElement = document.getElementById('operationStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

// 切换搜索模式
export function toggleSearchMode(button, isSearchMode) {
    button.textContent = isSearchMode ? '切换到普通对话' : '切换到搜索模式';
    button.classList.toggle('active', isSearchMode);
    
    // 更新输入框提示
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.placeholder = isSearchMode ? '输入搜索内容...' : '输入问题...';
    }
}

// 自动调整输入框高度
export function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// 显示完成状态
export async function showCompletionStatus(statusMessage) {
    if (statusMessage) {
        statusMessage.classList.add('completed');
        await new Promise(resolve => setTimeout(resolve, 1500));
        statusMessage.remove();
    }
}

// 初始化UI状态
export function initializeUI() {
    // 设置API状态显示
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.textContent = '已连接';
        apiStatus.style.color = '#4caf50';
    }

    // 初始化输入框
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', () => adjustTextareaHeight(messageInput));
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('sendButton')?.click();
            }
        });
    }
}

// 添加样式
export function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .progress-container {
            width: 100%;
            height: 4px;
            background-color: rgba(200, 200, 200, 0.2);
            border-radius: 2px;
            margin-top: 10px;
            overflow: hidden;
        }
        .progress-bar {
            width: 0;
            height: 100%;
            background: linear-gradient(90deg, 
                var(--dark-blue) 0%,
                #4a90e2 25%,
                #ffffff 50%,
                #4a90e2 75%,
                var(--dark-blue) 100%
            );
            background-size: 200% 100%;
            transition: width 0.6s ease;
            animation: shimmer 2s infinite linear;
            position: relative;
            overflow: hidden;
        }
        .progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.3) 50%,
                transparent 100%
            );
            animation: flowLight 1.5s infinite ease-in-out;
        }
    `;
    document.head.appendChild(style);
} 