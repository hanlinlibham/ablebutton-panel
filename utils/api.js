// API 相关功能

// 默认 API 配置
export const DEFAULT_API_CONFIG = {
    serviceType: 'online',  // 默认使用在线服务
    online: {
        apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
        apiKey: '',  // 用户需要自己配置 API Key
        modelSettings: {
            modelName: 'deepseek-chat',
            temperature: 0.7,
            maxTokens: 2000,
            stream: false,
            availableModels: ['deepseek-chat', 'deepseek-reasoner']  // 添加可用模型列表
        }
    }
    /* 暂时隐藏本地和局域网配置
    local: {
        apiEndpoint: 'http://127.0.0.1:11434',
        modelSettings: {
            modelName: 'llama2',
            temperature: 0.7,
            stream: false,
            options: {
                num_predict: 2000
            }
        }
    },
    intranet: {
        apiEndpoint: 'http://localhost:1000/v1/chat/completions',
        apiKey: '',
        modelSettings: {
            modelName: 'FundGPT',
            temperature: 0.7,
            maxTokens: 2000,
            stream: false,
            topP: 0.8,
            repetitionPenalty: 1.05
        }
    }
    */
};

// API 配置
let serviceType = DEFAULT_API_CONFIG.serviceType;
let apiEndpoint = DEFAULT_API_CONFIG[serviceType].apiEndpoint;
let apiKey = DEFAULT_API_CONFIG.online.apiKey;
let modelSettings = { ...DEFAULT_API_CONFIG.online.modelSettings };

// 初始化 API 配置
export async function initializeApiConfig() {
    try {
        const result = await chrome.storage.sync.get(['serviceType', 'online']);
        const config = {
            serviceType: 'online', // 强制使用在线服务
            apiEndpoint: '',
            apiKey: '',
            modelSettings: { ...DEFAULT_API_CONFIG.online.modelSettings }
        };

        // 设置在线服务配置
        if (result.online) {
            config.apiEndpoint = result.online.apiEndpoint || DEFAULT_API_CONFIG.online.apiEndpoint;
            config.apiKey = result.online.apiKey || DEFAULT_API_CONFIG.online.apiKey;
            if (result.online.modelSettings) {
                config.modelSettings = {
                    ...config.modelSettings,
                    ...result.online.modelSettings
                };
            }
        }

        // 更新全局变量
        serviceType = config.serviceType;
        apiEndpoint = config.apiEndpoint;
        apiKey = config.apiKey;
        modelSettings = { ...config.modelSettings };  // 创建一个副本

        console.log('初始化配置完成:', {
            endpoint: config.apiEndpoint,
            modelName: config.modelSettings.modelName,
            temperature: config.modelSettings.temperature,
            maxTokens: config.modelSettings.maxTokens
        });

        return config;
    } catch (error) {
        console.error('初始化 API 配置失败:', error);
        return DEFAULT_API_CONFIG;
    }
}

// 获取 API 配置
export function getApiConfig() {
    return { 
        serviceType,
        apiEndpoint,
        apiKey,
        modelSettings: { ...modelSettings },  // 确保返回一个副本
        localSettings: DEFAULT_API_CONFIG.local,
        intranetSettings: DEFAULT_API_CONFIG.intranet
    };
}

// 更新 API 配置
export async function updateApiConfig(config) {
    try {
        serviceType = config.serviceType;
        
        if (serviceType === 'online') {
            apiEndpoint = config.online.apiEndpoint;
            apiKey = config.online.apiKey;
            modelSettings = { ...config.online.modelSettings };  // 创建一个副本
            
            console.log('API配置已更新:', {
                endpoint: apiEndpoint,
                modelName: modelSettings.modelName,
                temperature: modelSettings.temperature,
                maxTokens: modelSettings.maxTokens
            });
        }
        
        await chrome.storage.sync.set(config);
    } catch (error) {
        console.error('更新API配置失败:', error);
        throw error;
    }
}

// 常量定义
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// 带重试的网络请求函数
export async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    let lastError;
    let delay = INITIAL_RETRY_DELAY;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            lastError = error;
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // 指数退避
            }
        }
    }
    throw lastError;
}

// 通过 background script 代理请求
async function proxyFetch(url, options) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url,
            method: options.method,
            headers: options.headers,
            body: options.body ? JSON.parse(options.body) : undefined
        }, response => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            
            if (response && response.success) {
                resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(response.data),
                    text: () => Promise.resolve(
                        typeof response.data === 'string' 
                            ? response.data 
                            : JSON.stringify(response.data)
                    )
                });
            } else {
                reject(new Error(response ? response.error : 'Request failed'));
            }
        });
    });
}

// API 状态检查函数
export async function checkApiStatus() {
    try {
        // 确保配置已经初始化
        const config = await initializeApiConfig();
        
        if (!config.apiEndpoint) {
            throw new Error('未配置模型地址');
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        // 使用当前配置构建测试请求
        const testBody = buildAIRequest([{
            role: 'user',
            content: 'Hi'
        }]);

        console.log('正在测试 API 配置:', {
            serviceType: config.serviceType,
            apiEndpoint: config.apiEndpoint,
            modelName: config.modelSettings.modelName,
            headers: { ...headers, Authorization: headers.Authorization ? '(已隐藏)' : undefined },
            testBody
        });

        // 使用代理请求
        const response = await proxyFetch(config.apiEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(testBody)
        });

        const data = await response.json();
        console.log('API 响应:', data);

        if (data.error) {
            throw new Error(data.error.message || 'API 返回错误');
        }

        if (!data.choices || !data.choices.length) {
            throw new Error('API 响应格式错误');
        }

        return true;
    } catch (error) {
        console.error('API 测试失败:', error);
        throw error;
    }
}

// 更新状态显示
function updateStatusDisplay(status, success) {
    const statusElement = document.getElementById('apiStatus');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.style.color = success ? '#28a745' : '#dc3545';
    }
}

// 构建 AI 消息请求
export function buildAIRequest(messages, options = {}) {
    const config = getApiConfig();
    const settings = { ...config.modelSettings };  // 首先复制当前配置
    
    // 只覆盖提供的选项
    if (options) {
        Object.assign(settings, options);
    }
    
    const requestConfig = {
        messages: messages.map(msg => ({
            role: msg.role || 'user',
            content: msg.content
        })),
        model: settings.modelName,
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: settings.stream
    };

    console.log('构建请求使用的完整配置:', {
        modelName: settings.modelName,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens
    });
    
    return requestConfig;
}

// 发送 AI 请求
export async function sendAIRequest(messages, options = {}) {
    // 确保配置已经初始化
    const config = await initializeApiConfig();
    
    if (!config.apiEndpoint) {
        throw new Error('请先配置模型服务地址');
    }

    console.log('当前使用的模型配置:', {
        endpoint: config.apiEndpoint,
        modelName: config.modelSettings.modelName,
        temperature: config.modelSettings.temperature,
        maxTokens: config.modelSettings.maxTokens
    });

    const requestBody = buildAIRequest(messages, options);
    
    const headers = {
        'Content-Type': 'application/json'
    };

    // 根据服务类型设置认证头
    if (config.serviceType === 'online' && config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    console.log('发送请求详情:', {
        endpoint: config.apiEndpoint,
        model: requestBody.model,
        messageCount: messages.length,
        temperature: requestBody.temperature,
        maxTokens: requestBody.max_tokens,
        firstMessagePreview: messages[0]?.content.substring(0, 50) + '...',
        headers: { ...headers, Authorization: headers.Authorization ? '(已隐藏)' : undefined }
    });

    // 使用代理请求
    const response = await proxyFetch(config.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (data.error) {
        console.error('API 请求失败:', data.error);
        throw new Error(data.error.message || '请求失败');
    }
    if (!data.choices || !data.choices.length) {
        console.error('API 响应格式错误:', data);
        throw new Error('响应格式错误');
    }

    // 使用 API 返回的实际 token 统计
    if (data.usage) {
        const stats = {
            uploadTokens: data.usage.prompt_tokens || 0,
            downloadTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0
        };

        console.log('Token 统计:', stats);

        try {
            await updateTokenStats(stats.uploadTokens, stats.downloadTokens);
            console.log('统计数据已更新:', stats);
        } catch (error) {
            console.error('更新统计数据失败:', error);
        }
    }

    return data.choices[0].message.content;
}

// 计算文本的大致 token 数量
export function estimateTokenCount(text) {
    // 一个粗略的估算：中文字符算1个token，英文单词算1个token
    const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const englishCount = englishWords.length;
    const otherChars = text.length - chineseCount - englishWords.join('').length;
    
    return chineseCount + englishCount + Math.ceil(otherChars / 4);
}

// 更新 token 统计
export async function updateTokenStats(uploadTokens, downloadTokens) {
    try {
        // 获取当前统计数据
        const result = await chrome.storage.sync.get({
            tokenStats: {
                uploadTokens: 0,
                downloadTokens: 0,
                totalChats: 0,
                totalTokens: 0
            }
        });

        const stats = result.tokenStats;
        
        // 更新统计数据
        stats.uploadTokens += uploadTokens;
        stats.downloadTokens += downloadTokens;
        stats.totalChats += 1;
        stats.totalTokens += (uploadTokens + downloadTokens);

        // 保存更新后的统计数据
        await chrome.storage.sync.set({ tokenStats: stats });
        
        // 触发统计显示更新
        const event = new CustomEvent('tokenStatsUpdated', { detail: stats });
        window.dispatchEvent(event);

        return stats;
    } catch (error) {
        console.error('更新统计数据失败:', error);
        throw error;
    }
}

// 测试 API 配置
export async function testApiConfig(config) {
    console.log('Testing API with config:', {
        serviceType: config.serviceType,
        apiEndpoint: config.apiEndpoint,
        modelSettings: config.modelSettings
    });
    
    try {
        if (config.serviceType === 'local') {
            // 测试本地模型
            const versionResponse = await chrome.runtime.sendMessage({
                type: 'proxyRequest',
                url: `${config.apiEndpoint}/api/version`,
                method: 'GET'
            });

            console.log('Version check response:', versionResponse);

            if (!versionResponse.success) {
                throw new Error('无法连接到本地模型服务');
            }

            // 检查模型是否已安装
            const listResponse = await chrome.runtime.sendMessage({
                type: 'proxyRequest',
                url: `${config.apiEndpoint}/api/tags`,
                method: 'GET'
            });

            console.log('Model list response:', listResponse);

            if (!listResponse.success) {
                throw new Error('无法获取模型列表');
            }

            const modelName = config.modelSettings?.modelName || "llama2";
            const modelExists = listResponse.data.models.some(m => m.name === modelName);

            if (!modelExists) {
                throw new Error(`模型 ${modelName} 未安装，请先运行 'ollama pull ${modelName}'`);
            }

            // 测试模型生成
            const testResponse = await chrome.runtime.sendMessage({
                type: 'proxyRequest',
                url: `${config.apiEndpoint}/api/generate`,
                method: 'POST',
                body: {
                    model: modelName,
                    prompt: "Hello, this is a test.",
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 100
                    }
                }
            });

            console.log('Generation test response:', testResponse);

            if (!testResponse.success) {
                throw new Error(`模型生成测试失败: ${testResponse.error}`);
            }

            return true;
        } else {
            // ... 现有的远程 API 测试代码 ...
        }
    } catch (error) {
        console.error('API状态检查失败:', error);
        throw error;
    }
}

// 发送到本地模型的请求
async function sendLocalModelRequest(messages, config) {
    if (config.serviceType !== 'local') {
        throw new Error('本地模型未启用');
    }

    const prompt = messages.map(msg => 
        `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n\n') + '\n\nAssistant:';

    const response = await chrome.runtime.sendMessage({
        type: 'proxyRequest',
        url: `${config.apiEndpoint}/api/generate`,
        method: 'POST',
        body: {
            model: config.modelSettings?.modelName || "llama2",
            prompt: prompt,
            stream: false,
            options: {
                temperature: config.modelSettings?.temperature || 0.7,
                num_predict: config.modelSettings?.options?.num_predict || 2000
            }
        }
    });

    if (!response.success) {
        throw new Error(response.error || '请求失败');
    }

    return response.data.response;
} 