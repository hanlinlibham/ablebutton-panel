// 操作处理模块
import { initializePageInfo, getCurrentPageInfo } from './pageContent.js';
import { addMessage, buildContextMessage } from './messaging.js';
import { createProgressBar, updateStatus, showCompletionStatus } from './ui.js';
import { sendAIRequest } from './api.js';
import { getSearchPlan, executeMultiSearch, analyzeSearchResults } from './search.js';
import { marked } from '../lib/marked.min.js';

// 处理搜索操作
export async function handleSearchOperation(message, chatMessages, messageHistory, maxMessageHistory) {
    try {
        // 显示思考状态和需求分析（合并页面信息获取）
        const [statusMessage, pageInfo] = await Promise.all([
            addMessage('🤔 正在分析搜索需求...\n\n需求内容：\n' + message, 
                false, false, chatMessages, messageHistory, maxMessageHistory, true),
            (async () => {
                await initializePageInfo();
                return getCurrentPageInfo();
            })()
        ]);
        
        // 添加进度条
        const { progressContainer, progressBar } = createProgressBar();
        statusMessage.appendChild(progressContainer);

        // 定义搜索步骤总数
        const totalSteps = 4;
        let currentStep = 0;
        
        // 生成搜索计划
        currentStep++;
        await updateStatus(statusMessage, '✨', '正在生成搜索计划', true, currentStep, totalSteps);
        const searchPlan = await getSearchPlan(message, pageInfo);
        
        // 显示搜索计划（保存消息引用以便后续删除）并同时开始执行搜索
        const [planMessage, searchResults] = await Promise.all([
            addMessage('📋 搜索计划：\n\n' + searchPlan, 
                false, false, chatMessages, messageHistory, maxMessageHistory, true),
            executeMultiSearch(searchPlan)
        ]);
        
        // 更新进度
        currentStep += 2;
        await updateStatus(statusMessage, '🧐', '正在深入分析搜索结果', true, currentStep, totalSteps);
        
        // 分析搜索结果
        const analysis = await analyzeSearchResults(message, searchResults.fullResults);
        
        // 更新为完成状态
        currentStep++;
        await updateStatus(statusMessage, '✨', '搜索完成', false, currentStep, totalSteps);
        await showCompletionStatus(statusMessage);
        
        // 删除搜索计划消息
        if (planMessage && planMessage.parentNode) {
            planMessage.remove();
        }
        
        // 添加最终分析结果
        await addMessage(analysis, false, false, chatMessages, messageHistory, maxMessageHistory, true);
        
    } catch (error) {
        console.error('搜索操作失败:', error);
        await addMessage(`❌ 搜索失败:\n\n错误类型: ${error.name}\n错误信息: ${error.message}\n\n如果问题持续存在，请尝试刷新页面或检查网络连接。`, 
            false, false, chatMessages, messageHistory, maxMessageHistory, true);
        throw error;
    }
}

// 处理聊天操作
export async function handleChatOperation(message, chatMessages, messageHistory, maxMessageHistory) {
    try {
        // 并行执行状态消息创建和页面信息获取
        const [statusMessage, pageInfo] = await Promise.all([
            addMessage('🤔 正在分析您的问题...', 
                false, false, chatMessages, messageHistory, maxMessageHistory, false),
            (async () => {
                await initializePageInfo();
                return getCurrentPageInfo();
            })()
        ]);
        
        // 构建上下文消息并更新状态
        const contextMessage = buildContextMessage(message, pageInfo);
        
        // 根据问题类型设置适当的状态
        const questionType = message.toLowerCase();
        let statusEmoji = '🔍';
        let statusText = '正在分析页面内容...';
        
        if (questionType.includes('总结') || questionType.includes('概括')) {
            statusEmoji = '📝';
            statusText = '正在生成内容摘要...';
        } else if (questionType.includes('分析') || questionType.includes('评估')) {
            statusEmoji = '🔎';
            statusText = '正在深入分析内容...';
        } else if (questionType.includes('对比') || questionType.includes('比较')) {
            statusEmoji = '⚖️';
            statusText = '正在进行对比分析...';
        }
        
        await updateStatus(statusMessage, statusEmoji, statusText);
        
        // 发送请求并获取响应
        const messages = [
            {
                role: 'system',
                content: `你是一个网页内容分析助手。我会为你提供网页的URL、标题、描述、主标题和正文内容。
请基于提供的实际页面内容来回答用户的问题。不要声明你无法访问页面，因为页面内容已经包含在上下文中。

请使用 Markdown 格式组织你的回复，遵循以下规则：
1. 使用适当的标题层级（#、##、###）组织内容
2. 使用列表（- 或 1.）展示要点
3. 使用 ** 加粗 ** 强调重要信息
4. 使用反引号包裹代码内容
5. 使用 > 展示引用内容
6. 确保标题前后有空行，保证格式正确

如果用户要求总结页面内容，请：
1. 提取文章的主要观点和关键信息
2. 保持客观准确，不要添加未在原文中出现的信息
3. 如果是新闻文章，注意总结事件发生的时间、地点、人物和影响
4. 如果遇到专业术语或数据，保持原文的准确性
5. 根据用户的具体问题，有针对性地组织和呈现相关信息

请尽可能简洁明了地回答，避免冗长的铺垫，直接切入重点。对于用户的问题，优先提供最相关的信息。`
            },
            {
                role: 'user',
                content: contextMessage
            }
        ];
        
        const response = await sendAIRequest(messages);
        
        // 移除状态消息并添加响应
        if (statusMessage) {
            statusMessage.remove();
        }
        
        // 使用 marked 解析 Markdown 并添加 AI 响应到聊天
        const parsedResponse = marked.parse(response);
        await addMessage(parsedResponse, false, true, chatMessages, messageHistory, maxMessageHistory, true);
        
    } catch (error) {
        console.error('聊天操作失败:', error);
        await addMessage(`❌ 操作失败: ${error.message}`, 
            false, false, chatMessages, messageHistory, maxMessageHistory, false);
        throw error;
    }
} 