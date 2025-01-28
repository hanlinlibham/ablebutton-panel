// 错误处理模块
import { addMessage } from './messages.js';

// 错误处理函数
export async function handleError(error, defaultMessage = '操作失败', messageHistory, MAX_MESSAGE_HISTORY) {
    console.error('错误详情:', error);
    
    let errorMessage = defaultMessage;
    
    // 检查是否是 API 相关错误
    if (error.message.includes('API')) {
        const { serviceType } = await chrome.storage.sync.get(['serviceType']);
        
        // 根据服务类型提供不同的错误提示
        switch(serviceType) {
            case 'online':
                errorMessage = '在线服务连接失败，请检查 API 设置和网络连接';
                break;
            case 'local':
                errorMessage = '本地服务连接失败，请确保 Ollama 服务正在运行';
                break;
            case 'intranet':
                errorMessage = '局域网服务连接失败，请检查服务地址和密钥设置';
                break;
            default:
                errorMessage = 'API 连接失败，请检查设置';
        }
    }
    
    // 添加错误消息到聊天界面
    const chatMessages = document.getElementById('chatMessages');
    await addMessage(`❌ ${errorMessage}${error.message ? `: ${error.message}` : ''}`, false, false, chatMessages, messageHistory, MAX_MESSAGE_HISTORY);
} 