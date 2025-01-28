import { parseMarkdown } from './markdown.js';

// 更新消息添加函数
export async function addMessage(content, isUser = false, appendToPrevious = false, messagesDiv, messageHistory, MAX_MESSAGE_HISTORY, isSearch = false) {
    if (!messagesDiv) {
        console.error('找不到消息容器');
        return null;
    }

    let messageDiv;
    if (appendToPrevious) {
        messageDiv = messagesDiv.lastElementChild;
        if (!messageDiv || messageDiv.classList.contains('user-message')) {
            // 如果最后一条消息不存在或是用户消息，创建新消息
            messageDiv = document.createElement('div');
            messageDiv.className = 'message ai-message';
            messagesDiv.appendChild(messageDiv);
        }
    } else {
        messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        if (isSearch) {
            messageDiv.classList.add('search-message');
        }
        messagesDiv.appendChild(messageDiv);
    }
    
    // 创建或获取 markdown 容器
    let markdownContainer = messageDiv.querySelector('.markdown-body');
    if (!markdownContainer) {
        markdownContainer = document.createElement('div');
        markdownContainer.className = 'markdown-body';
        messageDiv.appendChild(markdownContainer);
    }
    
    // 处理内容
    if (!content) {
        markdownContainer.innerHTML = '&nbsp;';
    } else if (isUser) {
        // 用户消息直接显示，不使用 markdown 渲染
        messageDiv.innerHTML = `<div class="user-content">${content}</div>`;
    } else {
        // AI 消息使用 markdown 渲染
        // 如果是思考状态的消息，添加动画效果
        if (content.includes('🤔') || content.includes('💭')) {
            markdownContainer.innerHTML = parseMarkdown(content);
            markdownContainer.classList.add('thinking');
            // 添加动画点
            let dots = markdownContainer.querySelector('.dots');
            if (!dots) {
                dots = document.createElement('span');
                dots.className = 'dots';
                dots.textContent = '...';
                markdownContainer.appendChild(dots);
            }
        } else {
            const existingContent = appendToPrevious ? markdownContainer.innerHTML : '';
            // 如果现有内容包含思考状态，则替换掉
            if (existingContent.includes('🤔') || existingContent.includes('💭')) {
                markdownContainer.classList.remove('thinking');
                const dots = markdownContainer.querySelector('.dots');
                if (dots) dots.remove();
                markdownContainer.innerHTML = parseMarkdown(content);
            } else {
                markdownContainer.innerHTML = existingContent ? 
                    existingContent + '\n\n' + parseMarkdown(content) :
                    parseMarkdown(content);
            }
        }
    }

    // 添加状态样式
    if (content.includes('🤔')) {
        messageDiv.classList.add('thinking-message');
    } else if (content.includes('✨')) {
        messageDiv.classList.add('processing-message');
    } else if (content.includes('✅')) {
        messageDiv.classList.add('success-message');
    } else if (content.includes('❌')) {
        messageDiv.classList.add('error-message');
    }

    messageDiv.scrollIntoView({ behavior: 'smooth' });
    
    // 限制消息历史记录长度
    if (content.trim() && !appendToPrevious && !content.includes('🤔') && !content.includes('💭')) {
        messageHistory.push({
            role: isUser ? 'user' : 'assistant',
            content: content,
            isSearch
        });
        
        if (messageHistory.length > MAX_MESSAGE_HISTORY) {
            messageHistory.shift();
        }
    }
    
    // 清理过多的消息DOM元素
    while (messagesDiv.children.length > MAX_MESSAGE_HISTORY) {
        messagesDiv.removeChild(messagesDiv.firstChild);
    }

    return messageDiv;
} 