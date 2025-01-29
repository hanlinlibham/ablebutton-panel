import { DEFAULT_API_CONFIG } from './utils/api.js';

// 显示默认值
async function showDefaultValues() {
    try {
        // 等待所有需要显示默认值的元素加载
        const elements = {
            defaultApiEndpoint: await waitForElement('defaultApiEndpoint'),
            defaultTemperature: await waitForElement('defaultTemperature'),
            defaultMaxTokens: await waitForElement('defaultMaxTokens')
        };

        // 更新显示
        elements.defaultApiEndpoint.textContent = DEFAULT_API_CONFIG.online.apiEndpoint;
        elements.defaultTemperature.textContent = DEFAULT_API_CONFIG.online.modelSettings.temperature;
        elements.defaultMaxTokens.textContent = DEFAULT_API_CONFIG.online.modelSettings.maxTokens;

        console.log('默认值显示更新完成');
    } catch (error) {
        console.warn('更新默认值显示失败:', error);
        // 不抛出错误，让程序继续执行
    }
}

// 切换服务类型
function switchServiceType(type) {
    const onlineTab = document.getElementById('onlineServiceTab');
    const localTab = document.getElementById('localServiceTab');
    const intranetTab = document.getElementById('intranetServiceTab');
    const onlineSettings = document.getElementById('onlineServiceSettings');
    const localSettings = document.getElementById('localServiceSettings');
    const intranetSettings = document.getElementById('intranetServiceSettings');

    if (type === 'online') {
        onlineTab.classList.add('active');
        localTab.classList.remove('active');
        intranetTab.classList.remove('active');
        onlineSettings.classList.add('active');
        localSettings.classList.remove('active');
        intranetSettings.classList.remove('active');
    } else if (type === 'local') {
        onlineTab.classList.remove('active');
        localTab.classList.add('active');
        intranetTab.classList.remove('active');
        onlineSettings.classList.remove('active');
        localSettings.classList.add('active');
        intranetSettings.classList.remove('active');
    } else if (type === 'intranet') {
        onlineTab.classList.remove('active');
        localTab.classList.remove('active');
        intranetTab.classList.add('active');
        onlineSettings.classList.remove('active');
        localSettings.classList.remove('active');
        intranetSettings.classList.add('active');
    }
}

// 恢复默认设置
async function resetToDefaults() {
    try {
        if (!confirm('确定要恢复默认设置吗？')) {
            return;
        }

        // 更新模型选择下拉框
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.value = DEFAULT_API_CONFIG.online.modelSettings.modelName;
        
        // 触发 change 事件以更新自定义模型输入框的显示状态
        handleModelSelectChange();

        document.getElementById('apiEndpoint').value = DEFAULT_API_CONFIG.online.apiEndpoint;
        document.getElementById('temperature').value = DEFAULT_API_CONFIG.online.modelSettings.temperature;
        document.getElementById('maxTokens').value = DEFAULT_API_CONFIG.online.modelSettings.maxTokens;

        await saveSettings();
        await showStatus('已恢复默认设置', true);
    } catch (error) {
        await showStatus('恢复默认设置失败: ' + error.message, false);
    }
}

// 处理模型选择变化
function handleModelSelectChange() {
    const modelSelect = document.getElementById('modelSelect');
    const customModelGroup = document.getElementById('customModelGroup');
    const modelNameInput = document.getElementById('modelName');

    if (modelSelect.value === 'custom') {
        customModelGroup.style.display = 'block';
        modelNameInput.value = '';
    } else {
        customModelGroup.style.display = 'none';
        modelNameInput.value = modelSelect.value;
    }
}

// 添加等待元素加载的辅助函数
function waitForElement(elementId, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const element = document.getElementById(elementId);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.getElementById(elementId);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 设置超时
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`等待元素 ${elementId} 超时`));
        }, timeout);
    });
}

// 修改 showStatus 函数
async function showStatus(message, success = true) {
    try {
        const statusElement = await waitForElement('apiStatus');
        statusElement.textContent = message;
        statusElement.className = `status ${success ? 'success' : 'error'}`;
        
        if (message !== '正在测试连接...') {
            setTimeout(() => {
                if (statusElement) {
                    statusElement.className = 'status';
                }
            }, 3000);
        }
    } catch (error) {
        console.warn('显示状态消息失败:', error);
    }
}

// 修改 updateStats 函数，添加更多的日志和错误处理
async function updateStats(stats) {
    if (!stats) {
        console.warn('未提供统计数据');
        return;
    }

    console.log('正在更新统计显示，原始数据:', stats);

    try {
        // 等待所有统计元素加载
        const elements = {
            uploadTokens: await waitForElement('uploadTokens'),
            downloadTokens: await waitForElement('downloadTokens'),
            totalChats: await waitForElement('totalChats'),
            totalTokens: await waitForElement('totalTokens')
        };

        console.log('所有统计元素已加载:', Object.keys(elements));

        // 更新显示前检查数据
        const displayData = {
            uploadTokens: parseInt(stats.uploadTokens || 0),
            downloadTokens: parseInt(stats.downloadTokens || 0),
            totalChats: parseInt(stats.totalChats || 0),
            totalTokens: parseInt(stats.totalTokens || 0)
        };

        console.log('准备显示的数据:', displayData);

        // 更新显示
        elements.uploadTokens.textContent = displayData.uploadTokens.toLocaleString();
        elements.downloadTokens.textContent = displayData.downloadTokens.toLocaleString();
        elements.totalChats.textContent = displayData.totalChats.toLocaleString();
        elements.totalTokens.textContent = displayData.totalTokens.toLocaleString();

        console.log('统计显示更新完成');
    } catch (error) {
        console.error('更新统计显示失败:', error);
    }
}

// 修改 loadSettings 函数，将统计数据加载分离出来
async function loadSettings() {
    try {
        console.log('开始加载设置...');
        
        // 获取设置数据
        const settingsResult = await chrome.storage.sync.get({
            serviceType: DEFAULT_API_CONFIG.serviceType,
            online: DEFAULT_API_CONFIG.online
        });

        console.log('加载的设置:', settingsResult);

        // 等待并获取所有必要的元素
        const elements = {
            apiEndpoint: await waitForElement('apiEndpoint'),
            apiKey: await waitForElement('apiKey'),
            modelSelect: await waitForElement('modelSelect'),
            temperature: await waitForElement('temperature'),
            maxTokens: await waitForElement('maxTokens')
        };

        // 填充表单数据
        if (settingsResult.online) {
            elements.apiEndpoint.value = settingsResult.online.apiEndpoint || DEFAULT_API_CONFIG.online.apiEndpoint;
            elements.apiKey.value = settingsResult.online.apiKey || '';
        }

        // 设置模型选择
        const customModelGroup = document.getElementById('customModelGroup');
        const modelNameInput = document.getElementById('modelName');
        
        if (customModelGroup && settingsResult.online?.modelSettings) {
            const modelName = settingsResult.online.modelSettings.modelName || DEFAULT_API_CONFIG.online.modelSettings.modelName;
            
            if (DEFAULT_API_CONFIG.online.modelSettings.availableModels.includes(modelName)) {
                elements.modelSelect.value = modelName;
                customModelGroup.style.display = 'none';
            } else {
                elements.modelSelect.value = 'custom';
                if (modelNameInput) {
                    modelNameInput.value = modelName;
                }
                customModelGroup.style.display = 'block';
            }
        }

        // 设置其他参数
        if (settingsResult.online?.modelSettings) {
            elements.temperature.value = settingsResult.online.modelSettings.temperature || DEFAULT_API_CONFIG.online.modelSettings.temperature;
            elements.maxTokens.value = settingsResult.online.modelSettings.maxTokens || DEFAULT_API_CONFIG.online.modelSettings.maxTokens;
        }

        // 尝试显示默认值，但不让它阻止其他设置的加载
        try {
            await showDefaultValues();
        } catch (error) {
            console.warn('显示默认值失败:', error);
        }

        return settingsResult;
    } catch (error) {
        console.error('加载设置失败:', error);
        // 不在这里显示错误状态，让调用者处理
        throw error;
    }
}

// 添加初始化统计数据的函数
async function initializeStats() {
    try {
        const statsResult = await chrome.storage.sync.get({
            tokenStats: {
                uploadTokens: 0,
                downloadTokens: 0,
                totalChats: 0,
                totalTokens: 0
            }
        });

        console.log('初始化统计数据:', statsResult.tokenStats);
        await updateStats(statsResult.tokenStats);
        return statsResult.tokenStats;
    } catch (error) {
        console.error('初始化统计数据失败:', error);
        throw error;
    }
}

// 保存设置
async function saveSettings() {
    try {
        const modelSelect = document.getElementById('modelSelect');
        const modelName = modelSelect.value === 'custom' 
            ? document.getElementById('modelName').value.trim()
            : modelSelect.value;

        if (!modelName) {
            await showStatus('请选择或输入模型名称', false);
            return;
        }

        console.log('正在保存模型设置:', { modelName }); // 添加日志

        const config = {
            serviceType: 'online',
            online: {
                apiEndpoint: document.getElementById('apiEndpoint').value.trim(),
                apiKey: document.getElementById('apiKey').value.trim(),
                modelSettings: {
                    modelName: modelName,
                    temperature: parseFloat(document.getElementById('temperature').value) || DEFAULT_API_CONFIG.online.modelSettings.temperature,
                    maxTokens: parseInt(document.getElementById('maxTokens').value) || DEFAULT_API_CONFIG.online.modelSettings.maxTokens,
                    stream: false
                }
            }
        };

        // 验证设置
        if (!config.online.apiEndpoint) {
            await showStatus('请填写 API 地址', false);
            return;
        }

        await chrome.storage.sync.set(config);
        console.log('设置已保存:', config); // 添加日志
        await showStatus('设置已保存', true);
    } catch (error) {
        console.error('保存设置失败:', error);
        await showStatus('保存设置失败: ' + error.message, false);
    }
}

// 测试 API 连接
async function testApiConnection() {
    try {
        await showStatus('正在保存配置...', true);
        // 先保存当前设置
        await saveSettings();
        
        await showStatus('正在测试连接...', true);
        // 导入 API 函数
        const { checkApiStatus } = await import('./utils/api.js');
        
        // 测试连接
        const success = await checkApiStatus();
        if (success) {
            await showStatus('API 连接测试成功', true);
        }
    } catch (error) {
        await showStatus('API 连接测试失败: ' + error.message, false);
    }
}

// 重置统计数据
async function resetStats() {
    try {
        if (!confirm('确定要重置所有统计数据吗？')) {
            return;
        }

        const defaultStats = {
            uploadTokens: 0,
            downloadTokens: 0,
            totalChats: 0,
            totalTokens: 0
        };

        await chrome.storage.sync.set({ tokenStats: defaultStats });
        await updateStats(defaultStats);
        await showStatus('统计数据已重置', true);
    } catch (error) {
        await showStatus('重置统计失败: ' + error.message, false);
    }
}

// 监听输入变化
function setupInputListeners() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const statusElement = document.getElementById('apiStatus');
            statusElement.className = 'status';
        });
    });
}

// 添加定期刷新统计数据的功能
async function refreshStats() {
    try {
        const result = await chrome.storage.sync.get('tokenStats');
        if (result.tokenStats) {
            console.log('刷新统计数据:', result.tokenStats);
            await updateStats(result.tokenStats);
        }
    } catch (error) {
        console.error('刷新统计数据失败:', error);
    }
}

// 修改初始化代码
document.addEventListener('DOMContentLoaded', async () => {
    let statusElement = null;
    
    try {
        console.log('页面加载完成，开始初始化...');
        
        // 首先等待状态元素加载
        try {
            statusElement = await waitForElement('apiStatus');
        } catch (statusError) {
            console.warn('状态元素未就绪，继续初始化其他部分');
        }
        
        // 加载设置和初始化统计数据
        const initPromises = [loadSettings()];
        
        // 如果统计相关元素存在，则初始化统计数据
        const statsElements = document.querySelectorAll('#uploadTokens, #downloadTokens, #totalChats, #totalTokens');
        if (statsElements.length === 4) {
            initPromises.push(initializeStats());
        }
        
        await Promise.all(initPromises);
        
        // 设置事件监听器
        const elements = {
            modelSelect: document.getElementById('modelSelect'),
            saveSettings: document.getElementById('saveSettings'),
            resetDefaults: document.getElementById('resetDefaults'),
            testApi: document.getElementById('testApi'),
            resetStats: document.getElementById('resetStats')
        };

        // 检查必要的设置元素是否存在
        const requiredElements = ['modelSelect', 'saveSettings', 'resetDefaults', 'testApi'];
        const missingElements = requiredElements
            .filter(key => !elements[key])
            .map(key => key);

        if (missingElements.length > 0) {
            throw new Error(`缺少必要元素: ${missingElements.join(', ')}`);
        }

        // 设置事件监听器
        elements.modelSelect.addEventListener('change', handleModelSelectChange);
        elements.saveSettings.addEventListener('click', saveSettings);
        elements.resetDefaults.addEventListener('click', resetToDefaults);
        elements.testApi.addEventListener('click', testApiConnection);
        
        // 如果重置统计按钮存在，添加事件监听器
        if (elements.resetStats) {
            elements.resetStats.addEventListener('click', resetStats);
        }

        // 设置统计更新监听器
        window.addEventListener('tokenStatsUpdated', async (event) => {
            console.log('收到统计更新事件:', event.detail);
            if (event.detail) {
                await updateStats(event.detail);
            }
        });

        // 监听存储变化
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.tokenStats) {
                console.log('检测到统计数据变化:', changes.tokenStats.newValue);
                updateStats(changes.tokenStats.newValue);
            }
        });

        // 设置定期刷新（延迟启动定时器）
        setTimeout(() => {
            setInterval(refreshStats, 5000);
            console.log('已启动定期刷新');
        }, 5000);

        // 清除任何错误状态
        if (statusElement) {
            statusElement.textContent = '';
            statusElement.className = 'status';
        }

        console.log('初始化完成');
    } catch (error) {
        console.error('初始化设置页面失败:', error);
        
        // 如果状态元素已经获取到，直接使用
        if (statusElement) {
            statusElement.textContent = '初始化失败: ' + error.message;
            statusElement.className = 'status error';
        } else {
            // 如果状态元素还没有获取到，尝试再次获取
            try {
                statusElement = await waitForElement('apiStatus', 1000); // 较短的超时时间
                if (statusElement) {
                    statusElement.textContent = '初始化失败: ' + error.message;
                    statusElement.className = 'status error';
                }
            } catch (statusError) {
                console.error('无法显示错误状态:', statusError);
            }
        }
    }
}); 