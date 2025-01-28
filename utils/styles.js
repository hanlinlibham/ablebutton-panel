// UI 样式定义
export const styles = `
    :root {
        --dark-blue: #1a237e;
        --dark-red: #b71c1c;
        --hover-blue: #283593;
        --hover-red: #c62828;
        --light-blue: #e8eaf6;
        --border-color: #dee2e6;
    }

    body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        background: #f5f5f5;
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
    }

    #chatContainer {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #fff;
        position: relative;
    }

    #chatMessages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        padding-bottom: 120px;
        scroll-behavior: smooth;
    }

    .message {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 8px;
        max-width: 85%;
        word-wrap: break-word;
    }

    .user-message {
        background: white;
        border: 1px solid var(--border-color);
        margin-left: auto;
        border-radius: 15px 15px 0 15px;
    }

    .ai-message {
        background: var(--light-blue);
        border: 1px solid var(--dark-blue);
        margin-right: auto;
        border-radius: 15px 15px 15px 0;
    }

    .progress-message {
        font-style: italic;
        color: #6c757d;
        margin: 8px 0;
        text-align: center;
    }

    .error-message {
        background: #ffebee;
        border: 1px solid var(--dark-red);
        color: var(--dark-red);
        margin: 8px auto;
        text-align: center;
        border-radius: 15px;
    }

    .bottom-container {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: #fff;
        border-top: 1px solid var(--border-color);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 100;
    }

    .toolbar {
        display: flex;
        gap: 8px;
        padding: 5px 0;
    }

    .input-container {
        display: flex;
        gap: 10px;
        align-items: flex-start;
    }

    #messageInput {
        flex: 1;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        resize: none;
        min-height: 40px;
        max-height: 120px;
        font-size: 14px;
        line-height: 1.5;
    }

    #messageInput:focus {
        outline: none;
        border-color: var(--dark-blue);
    }

    button {
        padding: 8px 15px;
        border: none;
        border-radius: 4px;
        background: var(--dark-blue);
        color: white;
        cursor: pointer;
        transition: background 0.3s;
        white-space: nowrap;
    }

    button:hover {
        background: var(--hover-blue);
    }

    button:disabled {
        background: #bdbdbd;
        cursor: not-allowed;
    }

    button.active {
        background: #4caf50;
    }

    pre {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
    }

    code {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 14px;
    }

    .markdown-body {
        font-size: 14px;
        line-height: 1.6;
    }

    .markdown-body pre {
        background: #f6f8fa;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
    }

    .markdown-body code {
        background: #f6f8fa;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
    }

    .markdown-body p {
        margin: 8px 0;
    }

    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

// 基础样式
export const baseStyles = `
.error-message {
    background-color: #fee;
    border-left: 4px solid #f66;
    padding: 8px;
    margin: 4px 0;
    font-size: 14px;
}

.warning-message {
    background-color: #ffd;
    border-left: 4px solid #fb3;
    padding: 8px;
    margin: 4px 0;
    font-size: 14px;
}

.progress-message {
    background-color: #f8f9fa;
    border-left: 4px solid #007bff;
    padding: 8px;
    margin: 4px 0;
    font-size: 14px;
}

.cancel-button {
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 8px;
    font-size: 12px;
}

.cancel-button:hover {
    background-color: #c82333;
}`;

// 工具栏样式
export const toolbarStyles = `
.toolbar {
    display: flex;
    gap: 8px;
    padding: 8px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
}

.tool-button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.tool-button:hover {
    background-color: #0056b3;
}

.tool-button.active {
    background-color: #28a745;
}

.tool-button i {
    font-size: 16px;
}`;

// 状态指示器样式
export const statusStyles = `
.status-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #007bff;
    transform-origin: 0 50%;
    transition: transform .3s ease-in-out;
    z-index: 1000;
}

.status-indicator.processing {
    animation: progress 2s infinite linear;
}

@keyframes progress {
    0% { transform: scaleX(0); }
    50% { transform: scaleX(.5); }
    100% { transform: scaleX(1); }
}

#operationStatus {
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 4px;
    z-index: 1000;
    display: none;
}`;

// 注入样式函数
export function injectStyles() {
    const style = document.createElement('style');
    style.textContent = styles + baseStyles + toolbarStyles + statusStyles;
    document.head.appendChild(style);
} 