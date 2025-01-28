// 控制台测试函数
async function testOllama() {
    console.log('开始测试 Ollama...');
    const baseUrl = 'http://127.0.0.1:11434';

    try {
        // 1. 测试版本接口
        console.log('1. 测试版本接口...');
        const versionResponse = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: `${baseUrl}/api/version`,
            method: 'GET'
        });
        console.log('版本检查结果:', versionResponse);

        if (versionResponse.success) {
            console.log('✅ 版本检查通过');
            console.log('Ollama 版本:', versionResponse.data.version);
        } else {
            throw new Error('版本检查失败: ' + versionResponse.error);
        }

        // 2. 检查可用模型
        console.log('\n2. 检查可用模型...');
        const modelsResponse = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: `${baseUrl}/api/tags`,
            method: 'GET'
        });
        console.log('模型列表:', modelsResponse);

        if (!modelsResponse.success) {
            throw new Error('获取模型列表失败: ' + modelsResponse.error);
        }

        const modelName = "llama2";
        // 检查模型名称，考虑带版本号的情况
        const modelExists = modelsResponse.data.models.some(m => {
            const name = m.name || m.model || '';
            return name.toLowerCase().startsWith(modelName.toLowerCase()) ||
                   name.toLowerCase().includes(`/${modelName.toLowerCase()}`) ||
                   name.toLowerCase() === `${modelName.toLowerCase()}:latest`;
        });

        if (!modelExists) {
            console.log('可用模型列表:', modelsResponse.data.models.map(m => m.name || m.model));
            throw new Error(`模型 ${modelName} 未安装，请先运行 'ollama pull ${modelName}'`);
        }

        console.log(`✅ 模型 ${modelName} 已安装`);

        // 3. 测试生成能力
        console.log('\n3. 测试生成能力...');
        
        // 使用与 curl 相同的最小请求格式
        const generateRequest = {
            model: modelName,
            prompt: "Say Hello",
            stream: false
        };

        console.log('发送生成请求:', generateRequest);
        
        const generateResponse = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: `${baseUrl}/api/generate`,
            method: 'POST',
            body: generateRequest
        });
        
        console.log('生成测试结果:', generateResponse);

        if (generateResponse.success) {
            console.log('✅ 生成测试通过');
            console.log('生成的内容:', generateResponse.data.response);
        } else {
            console.error('生成测试失败:', generateResponse.error);
            throw new Error('生成测试失败: ' + generateResponse.error);
        }

        console.log('\n✅ 所有测试通过！');
        return true;

    } catch (error) {
        console.error('❌ 测试失败:', error);
        if (error.message.includes('未安装')) {
            console.log('\n请运行以下命令安装模型：');
            console.log('ollama pull llama2');
        }
        return false;
    }
}

// 导出测试函数到全局作用域，这样可以在控制台直接调用
window.testOllama = testOllama;

// 快速检查 Ollama 服务状态
window.checkOllamaStatus = async function() {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/version');
        const data = await response.json();
        console.log('Ollama 服务状态:', {
            running: true,
            version: data.version,
            status: response.status
        });
        return true;
    } catch (error) {
        console.error('Ollama 服务未运行或无法访问:', error);
        console.log('请确保已经运行了 ollama serve');
        return false;
    }
}; 