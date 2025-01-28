// Ollama 测试函数
async function testOllama() {
    console.log('开始测试 Ollama...');
    
    try {
        // 1. 测试版本接口
        console.log('1. 测试版本接口...');
        const versionResult = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: 'http://127.0.0.1:11434/api/version',
            method: 'GET'
        });
        console.log('版本测试结果:', versionResult);
        
        if (!versionResult.success) {
            throw new Error('版本检查失败: ' + versionResult.error);
        }
        console.log('✅ 版本检查通过');
        console.log('Ollama 版本:', versionResult.data.version);
        
        // 2. 检查可用模型
        console.log('\n2. 检查可用模型...');
        const modelsResult = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: 'http://127.0.0.1:11434/api/tags',
            method: 'GET'
        });
        console.log('模型列表:', modelsResult);
        
        if (!modelsResult.success) {
            throw new Error('模型列表获取失败: ' + modelsResult.error);
        }

        const models = modelsResult.data.models;
        const hasLlama2 = models.some(model => model.name === 'llama2');
        
        if (hasLlama2) {
            console.log('✅ 模型 llama2 已安装');
        } else {
            throw new Error('未找到 llama2 模型');
        }
        
        // 3. 测试生成能力
        console.log('\n3. 测试生成能力...');
        const testPrompt = {
            model: 'llama2',
            prompt: 'Say Hello',
            stream: false
        };
        console.log('发送生成请求:', testPrompt);
        
        const generateResult = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: 'http://127.0.0.1:11434/api/generate',
            method: 'POST',
            body: testPrompt
        });
        console.log('生成测试结果:', generateResult);
        
        if (!generateResult.success) {
            throw new Error('生成测试失败: ' + generateResult.error);
        }
        
        console.log('✅ 生成测试通过');
        console.log('生成的内容:', generateResult.data.response);
        
        return {
            success: true,
            version: versionResult.data,
            models: modelsResult.data,
            generation: generateResult.data
        };
    } catch (error) {
        console.error('❌ 测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 测试特定模型
async function testModel(modelName) {
    console.log(`开始测试模型: ${modelName}`);
    
    try {
        const testPrompt = {
            model: modelName,
            prompt: "Say Hello",
            stream: false
        };
        
        console.log('发送测试请求:', testPrompt);
        const result = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: 'http://127.0.0.1:11434/api/generate',
            method: 'POST',
            body: testPrompt
        });
        
        if (!result.success) {
            throw new Error(`模型测试失败: ${result.error}`);
        }
        
        console.log(`✅ 模型 ${modelName} 测试成功`);
        console.log('生成的内容:', result.data.response);
        
        return {
            success: true,
            model: modelName,
            response: result.data
        };
    } catch (error) {
        console.error(`❌ 模型 ${modelName} 测试失败:`, error);
        return {
            success: false,
            model: modelName,
            error: error.message
        };
    }
}

// 将测试函数暴露到全局作用域
window.testOllama = testOllama;
window.testModel = testModel; 