import { DEFAULT_API_CONFIG } from './utils/api.js';

// 显示默认值
function showDefaultValues() {
    // 在线服务默认值
    const onlineDefaults = document.querySelectorAll('#onlineServiceSettings .default-value');
    onlineDefaults[0].textContent = `默认: ${DEFAULT_API_CONFIG.online.apiEndpoint}`;
    onlineDefaults[1].textContent = `默认: ${DEFAULT_API_CONFIG.online.modelSettings.modelName}`;
    onlineDefaults[2].textContent = `默认: ${DEFAULT_API_CONFIG.online.modelSettings.temperature}`;
    onlineDefaults[3].textContent = `默认: ${DEFAULT_API_CONFIG.online.modelSettings.maxTokens}`;

    // 本地服务默认值
    const localDefaults = document.querySelectorAll('#localServiceSettings .default-value');
    localDefaults[0].textContent = `默认: ${DEFAULT_API_CONFIG.local.apiEndpoint}`;
    localDefaults[1].textContent = `默认: ${DEFAULT_API_CONFIG.local.modelName}`;

    // 局域网服务默认值
    const intranetDefaults = document.querySelectorAll('#intranetServiceSettings .default-value');
    intranetDefaults[0].textContent = `默认: ${DEFAULT_API_CONFIG.intranet.apiEndpoint}`;
    intranetDefaults[1].textContent = `默认: ${DEFAULT_API_CONFIG.intranet.apiKey}`;
    intranetDefaults[2].textContent = `默认: ${DEFAULT_API_CONFIG.intranet.modelSettings.modelName}`;
    intranetDefaults[3].textContent = `默认: ${DEFAULT_API_CONFIG.intranet.modelSettings.temperature}`;
    intranetDefaults[4].textContent = `默认: ${DEFAULT_API_CONFIG.intranet.modelSettings.topP}`;
    intranetDefaults[5].textContent = `默认: ${DEFAULT_API_CONFIG.intranet.modelSettings.repetitionPenalty}`;
    intranetDefaults[6].textContent = `默认: ${DEFAULT_API_CONFIG.intranet.modelSettings.maxTokens}`;
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
        showStatus('已恢复默认设置', true);
    } catch (error) {
        showStatus('恢复默认设置失败: ' + error.message, false);
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

// 加载设置
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get({
            ...DEFAULT_API_CONFIG,
            tokenStats: {
                uploadTokens: 0,
                downloadTokens: 0,
                totalChats: 0,
                totalTokens: 0
            }
        });

        // 填充在线服务表单
        document.getElementById('apiEndpoint').value = result.online.apiEndpoint;
        document.getElementById('apiKey').value = result.online.apiKey;
        
        // 设置模型选择
        const modelSelect = document.getElementById('modelSelect');
        const modelName = result.online.modelSettings.modelName;
        const customModelGroup = document.getElementById('customModelGroup');
        
        if (DEFAULT_API_CONFIG.online.modelSettings.availableModels.includes(modelName)) {
            modelSelect.value = modelName;
            customModelGroup.style.display = 'none';
        } else {
            modelSelect.value = 'custom';
            document.getElementById('modelName').value = modelName;
            customModelGroup.style.display = 'block';
        }
        
        document.getElementById('temperature').value = result.online.modelSettings.temperature;
        document.getElementById('maxTokens').value = result.online.modelSettings.maxTokens;

        // 显示默认值
        showDefaultValues();

        // 更新统计数据
        updateStats(result.tokenStats);

        return result;
    } catch (error) {
        showStatus('加载设置失败: ' + error.message, false);
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
            showStatus('请选择或输入模型名称', false);
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
            showStatus('请填写 API 地址', false);
            return;
        }

        await chrome.storage.sync.set(config);
        console.log('设置已保存:', config); // 添加日志
        showStatus('设置已保存', true);
    } catch (error) {
        console.error('保存设置失败:', error);
        showStatus('保存设置失败: ' + error.message, false);
    }
}

// 测试 API 连接
async function testApiConnection() {
    try {
        showStatus('正在保存配置...', true);
        // 先保存当前设置
        await saveSettings();
        
        showStatus('正在测试连接...', true);
        // 导入 API 函数
        const { checkApiStatus } = await import('./utils/api.js');
        
        // 测试连接
        const success = await checkApiStatus();
        if (success) {
            showStatus('API 连接测试成功', true);
        }
    } catch (error) {
        showStatus('API 连接测试失败: ' + error.message, false);
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
        updateStats(defaultStats);
        showStatus('统计数据已重置', true);
    } catch (error) {
        showStatus('重置统计失败: ' + error.message, false);
    }
}

// 更新统计显示
function updateStats(stats) {
    document.getElementById('uploadTokens').textContent = stats.uploadTokens.toLocaleString();
    document.getElementById('downloadTokens').textContent = stats.downloadTokens.toLocaleString();
    document.getElementById('totalChats').textContent = stats.totalChats.toLocaleString();
    document.getElementById('totalTokens').textContent = stats.totalTokens.toLocaleString();
}

// 显示状态消息
function showStatus(message, success = true) {
    const statusElement = document.getElementById('apiStatus');
    statusElement.textContent = message;
    statusElement.className = `status ${success ? 'success' : 'error'}`;
    
    // 如果消息不是"正在测试连接..."，则设置自动隐藏
    if (message !== '正在测试连接...') {
        setTimeout(() => {
            statusElement.className = 'status';
        }, 3000);
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

// 设置按钮事件监听
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 加载设置
        await loadSettings();
        
        // 获取所有需要的元素
        const elements = {
            modelSelect: document.getElementById('modelSelect'),
            saveSettings: document.getElementById('saveSettings'),
            resetDefaults: document.getElementById('resetDefaults'),
            testApi: document.getElementById('testApi'),
            resetStats: document.getElementById('resetStats'),
            onlineServiceTab: document.getElementById('onlineServiceTab'),
            localServiceTab: document.getElementById('localServiceTab'),
            intranetServiceTab: document.getElementById('intranetServiceTab')
        };

        // 检查必需的元素是否存在
        if (elements.modelSelect) {
            elements.modelSelect.addEventListener('change', handleModelSelectChange);
        }

        if (elements.saveSettings) {
            elements.saveSettings.addEventListener('click', saveSettings);
        }

        if (elements.resetDefaults) {
            elements.resetDefaults.addEventListener('click', resetToDefaults);
        }

        if (elements.testApi) {
            elements.testApi.addEventListener('click', testApiConnection);
        }

        if (elements.resetStats) {
            elements.resetStats.addEventListener('click', resetStats);
        }

        // 设置服务类型切换事件
        if (elements.onlineServiceTab) {
            elements.onlineServiceTab.addEventListener('click', () => switchServiceType('online'));
        }

        if (elements.localServiceTab) {
            elements.localServiceTab.addEventListener('click', () => switchServiceType('local'));
        }

        if (elements.intranetServiceTab) {
            elements.intranetServiceTab.addEventListener('click', () => switchServiceType('intranet'));
        }

        // 设置输入监听
        setupInputListeners();
        
        console.log('所有事件监听器已设置完成');
    } catch (error) {
        console.error('初始化设置页面失败:', error);
    }
}); 