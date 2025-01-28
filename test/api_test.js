// 本地模型 API 测试脚本
async function testLocalModelConnection() {
    console.log('开始测试本地模型连接...');

    // 测试 Ollama 服务是否在运行
    async function testOllamaService() {
        try {
            const response = await fetch('http://127.0.0.1:11434/api/version');
            const data = await response.json();
            console.log('Ollama 服务状态:', {
                status: response.status,
                version: data.version,
                headers: Object.fromEntries(response.headers)
            });
            return true;
        } catch (error) {
            console.error('Ollama 服务检查失败:', error);
            return false;
        }
    }

    // 测试模型生成能力
    async function testModelGenerate() {
        try {
            const response = await fetch('http://127.0.0.1:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "llama2",
                    prompt: "Hello, this is a test message.",
                    stream: false
                })
            });

            console.log('生成请求状态:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, message: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('生成响应:', data);
            return true;
        } catch (error) {
            console.error('模型生成测试失败:', error);
            return false;
        }
    }

    // 检查 CORS 配置
    function checkCORSHeaders(headers) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': headers.get('Access-Control-Allow-Headers')
        };
        console.log('CORS 配置:', corsHeaders);
    }

    // 运行所有测试
    console.log('1. 检查 Ollama 服务...');
    const serviceRunning = await testOllamaService();
    
    if (serviceRunning) {
        console.log('2. 测试模型生成...');
        await testModelGenerate();
    }

    console.log('测试完成');
}

// 执行测试
testLocalModelConnection().catch(console.error); 