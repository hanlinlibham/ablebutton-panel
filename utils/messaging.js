// 消息处理模块
import { parseMarkdown } from './markdown.js';

// 构建上下文消息
export function buildContextMessage(userMessage, pageInfo) {
    console.log('构建上下文消息:', { userMessage, pageInfo });
    
    let contextMessage = userMessage;
    
    // 如果有页面信息，添加到上下文
    if (pageInfo && Object.keys(pageInfo).length > 0) {
        contextMessage = `当前页面信息：
URL: ${pageInfo.url}
标题: ${pageInfo.title}
${pageInfo.metaDescription ? '描述: ' + pageInfo.metaDescription + '\n' : ''}
${pageInfo.h1Text ? '主标题: ' + pageInfo.h1Text + '\n' : ''}
页面内容:
${pageInfo.textContent}

用户问题：${userMessage}`;
    }
    
    console.log('生成的上下文消息:', contextMessage);
    return contextMessage;
}

// 添加消息到聊天界面
export async function addMessage(content, isUser, isAI, container, history, maxHistory, isSearchMode = false) {
    if (!container) {
        console.error('消息容器不存在');
        return null;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'} ${isSearchMode ? 'search-message' : ''}`;

    const markdownContainer = document.createElement('div');
    markdownContainer.className = 'markdown-body';
    
    if (isUser) {
        markdownContainer.className = 'user-content';
        markdownContainer.textContent = content;
    } else {
        markdownContainer.innerHTML = parseMarkdown(content);
    }

    messageDiv.appendChild(markdownContainer);
    container.appendChild(messageDiv);
    
    // 保存到历史记录
    if (history && maxHistory) {
        history.push({
            content,
            isUser,
            isAI,
            timestamp: Date.now()
        });
        
        // 保持历史记录在限制范围内
        while (history.length > maxHistory) {
            history.shift();
        }
    }

    // 滚动到最新消息
    messageDiv.scrollIntoView({ behavior: 'smooth' });
    
    return messageDiv;
}

// 处理错误消息
export function handleError(error, prefix = '操作失败') {
    console.error(prefix + ':', error);
    const errorMessage = error.message || error.toString();
    return `❌ ${prefix}:\n\n错误信息: ${errorMessage}\n\n如果问题持续存在，请尝试刷新页面或检查网络连接。`;
}

// 发送消息
export async function sendMessage(message, isSearchMode, messageInput, chatMessages, messageHistory, maxMessageHistory, handleSearchOperation, handleChatOperation) {
    if (!message.trim()) {
        console.log('消息为空');
        return;
    }

    try {
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // 添加用户消息
        await addMessage(message, true, false, chatMessages, messageHistory, maxMessageHistory, isSearchMode);

        if (isSearchMode) {
            // 处理搜索请求
            await handleSearchOperation(message, chatMessages, messageHistory, maxMessageHistory);
        } else {
            // 处理普通对话
            await handleChatOperation(message, chatMessages, messageHistory, maxMessageHistory);
        }

    } catch (error) {
        console.error('发送消息失败:', error);
        const errorMessage = handleError(error);
        await addMessage(errorMessage, false, false, chatMessages, messageHistory, maxMessageHistory, isSearchMode);
    }
} 