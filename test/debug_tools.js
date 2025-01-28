// 调试工具函数
export async function debugOllamaRequests() {
    const baseUrl = 'http://127.0.0.1:11434';
    console.log('开始 Ollama 请求调试...\n');

    // 1. 直接使用 fetch 测试
    console.log('1. 直接 fetch 测试:');
    try {
        const directResponse = await fetch(`${baseUrl}/api/version`);
        console.log('直接 fetch 结果:', {
            ok: directResponse.ok,
            status: directResponse.status,
            type: directResponse.type,
            headers: Object.fromEntries(directResponse.headers)
        });
    } catch (error) {
        console.error('直接 fetch 失败:', error);
    }

    // 2. XMLHttpRequest 测试
    console.log('\n2. XMLHttpRequest 测试:');
    await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${baseUrl}/api/version`);
        xhr.onload = () => {
            console.log('XHR 结果:', {
                status: xhr.status,
                response: xhr.responseText,
                headers: xhr.getAllResponseHeaders()
            });
            resolve();
        };
        xhr.onerror = (error) => {
            console.error('XHR 失败:', error);
            resolve();
        };
        xhr.send();
    });

    // 3. 测试不同的请求配置
    console.log('\n3. 测试不同的请求配置:');
    const testConfigs = [
        {
            name: '基本配置',
            options: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }
        },
        {
            name: 'no-cors 模式',
            options: {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' }
            }
        },
        {
            name: '完整配置',
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Host': '127.0.0.1:11434'
                },
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-cache'
            }
        }
    ];

    for (const config of testConfigs) {
        console.log(`\n测试配置: ${config.name}`);
        try {
            const response = await fetch(`${baseUrl}/api/generate`, {
                ...config.options,
                body: JSON.stringify({
                    model: 'llama2',
                    prompt: 'test',
                    stream: false
                })
            });
            console.log('响应:', {
                ok: response.ok,
                status: response.status,
                type: response.type,
                headers: Object.fromEntries(response.headers)
            });
            if (response.ok) {
                const data = await response.json();
                console.log('响应数据:', data);
            }
        } catch (error) {
            console.error('请求失败:', error);
        }
    }

    // 4. 测试 background 代理
    console.log('\n4. 测试 background 代理:');
    try {
        const proxyResponse = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: `${baseUrl}/api/generate`,
            method: 'POST',
            body: {
                model: 'llama2',
                prompt: 'test',
                stream: false
            }
        });
        console.log('代理响应:', proxyResponse);
    } catch (error) {
        console.error('代理请求失败:', error);
    }

    // 5. CORS 预检测试
    console.log('\n5. CORS 预检测试:');
    try {
        const preflightResponse = await fetch(`${baseUrl}/api/generate`, {
            method: 'OPTIONS'
        });
        console.log('预检响应:', {
            ok: preflightResponse.ok,
            status: preflightResponse.status,
            type: preflightResponse.type,
            headers: Object.fromEntries(preflightResponse.headers)
        });
    } catch (error) {
        console.error('预检请求失败:', error);
    }
}

// 导出到全局作用域
window.debugOllamaRequests = debugOllamaRequests; 