// 本地模型测试工具
import { testApiConfig } from '../utils/api.js';

// 测试本地模型连接
export async function testLocalModel() {
    console.log('开始测试本地模型...');

    try {
        // 1. 测试版本接口
        console.log('1. 测试版本接口...');
        const versionResponse = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: 'http://127.0.0.1:11434/api/version',
            method: 'GET'
        });

        console.log('版本检查结果:', versionResponse);

        if (!versionResponse.success) {
            throw new Error('版本检查失败: ' + versionResponse.error);
        }

        // 2. 测试模型列表
        console.log('2. 测试模型列表...');
        const modelsResponse = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: 'http://127.0.0.1:11434/api/tags',
            method: 'GET'
        });

        console.log('可用模型:', modelsResponse);

        if (!modelsResponse.success) {
            throw new Error('获取模型列表失败: ' + modelsResponse.error);
        }

        // 3. 测试生成能力
        console.log('3. 测试生成能力...');
        const generateResponse = await chrome.runtime.sendMessage({
            type: 'proxyRequest',
            url: 'http://127.0.0.1:11434/api/generate',
            method: 'POST',
            body: {
                model: "llama2",
                prompt: "Say 'Hello, this is a test.'",
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 100
                }
            }
        });

        console.log('生成测试结果:', generateResponse);

        if (!generateResponse.success) {
            throw new Error('生成测试失败: ' + generateResponse.error);
        }

        console.log('所有测试完成！');
        return true;

    } catch (error) {
        console.error('测试失败:', error);
        throw error;
    }
}

// 快速测试函数
export async function quickTest() {
    try {
        const config = {
            serviceType: 'local',
            apiEndpoint: 'http://127.0.0.1:11434/api/generate',
            modelSettings: {
                modelName: 'llama2',
                temperature: 0.7,
                options: {
                    num_predict: 100
                }
            }
        };

        const result = await testApiConfig(config);
        console.log('快速测试结果:', result);
        return result;
    } catch (error) {
        console.error('快速测试失败:', error);
        throw error;
    }
} 