// 导入工具函数
import { fetchWithRetry, getApiConfig, sendAIRequest, initializeApiConfig } from './api.js';
import { marked } from '../lib/marked.min.js';

// 搜索相关功能

// 执行多个搜索
export async function executeMultiSearch(searchPlan) {
    console.log('开始执行多个搜索，搜索计划:', searchPlan);
    
    // 解析搜索计划
    const lines = searchPlan.split('\n');
    const searchConfig = {
        keywords: [],
        timeRange: '',
        focusPoints: [],
        verificationPoints: []
    };
    
    let currentSection = '';
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.includes('关键词组合：')) {
            currentSection = 'keywords';
        } else if (trimmedLine.includes('时间范围：')) {
            currentSection = 'timeRange';
        } else if (trimmedLine.includes('重点关注：')) {
            currentSection = 'focus';
        } else if (trimmedLine.includes('交叉验证：')) {
            currentSection = 'verification';
        } else if (trimmedLine.match(/^\d+\./)) {
            // 提取编号后的实际内容
            const content = trimmedLine.replace(/^\d+\.\s*/, '').trim();
            if (content) {
                switch (currentSection) {
                    case 'keywords':
                        searchConfig.keywords.push(content);
                        break;
                    case 'timeRange':
                        if (!searchConfig.timeRange) {
                            searchConfig.timeRange = content;
                        }
                        break;
                    case 'focus':
                        searchConfig.focusPoints.push(content);
                        break;
                    case 'verification':
                        searchConfig.verificationPoints.push(content);
                        break;
                }
            }
        } else if (currentSection === 'timeRange' && !searchConfig.timeRange) {
            searchConfig.timeRange = trimmedLine;
        }
    }

    console.log('解析后的搜索配置:', searchConfig);
    
    // 转换时间范围为搜索参数
    const timeFilter = parseTimeRange(searchConfig.timeRange);
    console.log('时间过滤参数:', timeFilter);

    let allResults = [];

    // 并行执行所有搜索
    const searchPromises = searchConfig.keywords.map(async keyword => {
        console.log('正在搜索词组:', keyword);
        try {
            // 将时间范围添加到搜索词中
            const searchQuery = timeFilter ? `${keyword} ${timeFilter}` : keyword;
            console.log('完整搜索查询:', searchQuery);
            
            const results = await executeDirectSearch(searchQuery);
            console.log(`词组 "${keyword}" 的搜索结果:`, results);
            
            if (results && results.length > 0) {
                // 过滤结果，确保它们在指定的时间范围内
                const filteredResults = filterResultsByTimeRange(results, searchConfig.timeRange);
                if (filteredResults.length > 0) {
                    return {
                        success: true,
                        keyword,
                        results: filteredResults.slice(0, 5)
                    };
                }
            }
            return {
                success: true,
                keyword,
                results: []
            };
        } catch (error) {
            console.error(`搜索词组 "${keyword}" 失败:`, error);
            return {
                success: false,
                keyword,
                error: error.message
            };
        }
    });

    // 等待所有搜索完成
    const searchResults = await Promise.all(searchPromises);

    // 处理搜索结果
    searchResults.forEach(result => {
        if (result.success && result.results?.length > 0) {
            allResults.push({
                searchTerm: result.keyword,
                results: result.results
            });
        }
    });

    // 返回完整结果用于后续分析
    return {
        fullResults: {
            searchConfig,
            results: allResults
        }
    };
}

// 解析时间范围为搜索参数
function parseTimeRange(timeRange) {
    if (!timeRange) return '';

    const currentYear = new Date().getFullYear();
    const timeMatches = {
        '最近一年': `${currentYear-1}-${currentYear}`,
        '最近一个月': 'month',
        '最近一周': 'week',
        '最近24小时': 'day',
        '不限': ''
    };

    // 检查是否匹配预定义的时间范围
    for (const [key, value] of Object.entries(timeMatches)) {
        if (timeRange.includes(key)) {
            return value;
        }
    }

    // 处理具体年份范围
    const yearMatch = timeRange.match(/(\d{4}).*?(\d{4})/);
    if (yearMatch) {
        return `${yearMatch[1]}-${yearMatch[2]}`;
    }

    // 处理单个年份
    const singleYearMatch = timeRange.match(/(\d{4})/);
    if (singleYearMatch) {
        return singleYearMatch[1];
    }

    return '';
}

// 根据时间范围过滤搜索结果
function filterResultsByTimeRange(results, timeRange) {
    if (!timeRange || timeRange === '不限') {
        return results;
    }

    return results.filter(result => {
        // 从标题或摘要中提取时间信息
        const timeInfo = extractTimeInfo(result.title + ' ' + result.snippet);
        if (!timeInfo) return true; // 如果无法提取时间信息，保留结果

        // 检查时间是否在范围内
        return isTimeInRange(timeInfo, timeRange);
    });
}

// 从文本中提取时间信息
function extractTimeInfo(text) {
    // 匹配常见的时间格式
    const patterns = [
        /(\d{4})年(\d{1,2})月(\d{1,2})日/,
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        /(\d{4})年(\d{1,2})月/,
        /(\d{4})-(\d{1,2})/,
        /(\d{4})年/
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return new Date(match[1], (match[2] || 1) - 1, match[3] || 1);
        }
    }

    // 匹配相对时间描述
    const relativeTimePatterns = {
        '分钟前': 'minutes',
        '小时前': 'hours',
        '天前': 'days',
        '周前': 'weeks',
        '个月前': 'months',
        '年前': 'years'
    };

    for (const [key, unit] of Object.entries(relativeTimePatterns)) {
        const match = text.match(new RegExp(`(\\d+)\\s*${key}`));
        if (match) {
            const now = new Date();
            const amount = parseInt(match[1]);
            switch (unit) {
                case 'minutes': return new Date(now - amount * 60000);
                case 'hours': return new Date(now - amount * 3600000);
                case 'days': return new Date(now - amount * 86400000);
                case 'weeks': return new Date(now - amount * 604800000);
                case 'months': return new Date(now.setMonth(now.getMonth() - amount));
                case 'years': return new Date(now.setFullYear(now.getFullYear() - amount));
            }
        }
    }

    return null;
}

// 检查时间是否在范围内
function isTimeInRange(date, timeRange) {
    if (!date || !timeRange) return true;

    const now = new Date();
    const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
    const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    if (timeRange.includes('最近一年')) {
        return date >= oneYearAgo;
    } else if (timeRange.includes('最近一个月')) {
        return date >= oneMonthAgo;
    } else if (timeRange.includes('最近一周')) {
        return date >= oneWeekAgo;
    } else if (timeRange.includes('最近24小时')) {
        return date >= oneDayAgo;
    }

    // 处理具体年份范围
    const yearMatch = timeRange.match(/(\d{4}).*?(\d{4})/);
    if (yearMatch) {
        const startYear = parseInt(yearMatch[1]);
        const endYear = parseInt(yearMatch[2]);
        const year = date.getFullYear();
        return year >= startYear && year <= endYear;
    }

    // 处理单个年份
    const singleYearMatch = timeRange.match(/(\d{4})/);
    if (singleYearMatch) {
        return date.getFullYear() === parseInt(singleYearMatch[1]);
    }

    return true;
}

// 执行直接搜索
export async function executeDirectSearch(query) {
    try {
        console.log('开始执行直接搜索:', query);
        
        // 获取当前标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('无法获取当前标签页');
        }

        // 在新标签页中打开搜索
        const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
        console.log('搜索URL:', searchUrl);
        
        const searchTab = await chrome.tabs.create({ url: searchUrl, active: false });
        console.log('创建搜索标签页:', searchTab.id);

        // 等待页面加载完成
        console.log('等待页面加载...');
        await new Promise(resolve => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === searchTab.id && info.status === 'complete') {
                    console.log('页面加载完成');
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            });
        });

        // 提取搜索结果
        console.log('开始提取搜索结果...');
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: searchTab.id },
            function: () => {
                const results = [];
                const searchResults = document.querySelectorAll('#b_results .b_algo');
                console.log('找到搜索结果数量:', searchResults.length);
                
                searchResults.forEach((result, index) => {
                    const titleElement = result.querySelector('h2');
                    const linkElement = result.querySelector('a');
                    const snippetElement = result.querySelector('.b_caption p');

                    if (titleElement && linkElement) {
                        const resultItem = {
                            title: titleElement.textContent.trim(),
                            link: linkElement.href,
                            snippet: snippetElement ? snippetElement.textContent.trim() : ''
                        };
                        console.log(`结果 ${index + 1}:`, resultItem);
                        results.push(resultItem);
                    }
                });

                return results;
            }
        });

        // 关闭搜索标签页
        console.log('关闭搜索标签页:', searchTab.id);
        await chrome.tabs.remove(searchTab.id);

        console.log('搜索完成，返回结果数量:', result.length);
        return result;
    } catch (error) {
        console.error('直接搜索失败:', error);
        throw error;
    }
}

// 生成搜索计划
export async function getSearchPlan(query, pageInfo, messageHistory) {
    try {
        // 确保 API 配置已初始化
        const apiConfig = await initializeApiConfig();
        if (!apiConfig.apiEndpoint) {
            throw new Error('请先在选项页面配置 API 设置');
        }

        console.log('生成搜索计划，查询:', query, '页面信息:', pageInfo);

        const messages = [{
            role: 'system',
            content: `你是一个专业的搜索规划助手。请根据用户的问题和当前页面信息，生成一个结构化的搜索计划。
请按照以下格式输出搜索计划：

关键词组合：（请仅生成3个最相关的关键词组合）
1. [第一组搜索关键词]
2. [第二组搜索关键词]
3. [第三组搜索关键词]

时间范围：
[指定搜索的时间范围，如最近一年、不限等]

重点关注：
1. [需要重点关注的信息类型]
2. [其他需要关注的信息]
...

交叉验证：
1. [需要交叉验证的信息]
2. [其他需要验证的信息]
...

注意：
1. 每个关键词组合应该简洁有效，通常2-4个词最佳
2. 关键词组合数量固定为3个，按相关性从高到低排序
3. 确保关键词组合相互补充，覆盖不同角度`
        }, {
            role: 'user',
            content: `
当前页面信息：
${pageInfo ? `URL: ${pageInfo.url}\n标题: ${pageInfo.title}\n内容: ${pageInfo.textContent?.substring(0, 200)}...` : '无页面信息'}

用户问题：${query}

请根据以上信息，生成一个详细的搜索计划。`
        }];

        console.log('发送搜索计划请求，消息:', messages);

        const response = await sendAIRequest(messages);
        console.log('收到搜索计划响应:', response);

        return response;
    } catch (error) {
        console.error('生成搜索计划失败:', error);
        throw error;
    }
}

// 分析搜索结果
export async function analyzeSearchResults(query, results) {
    try {
        // 确保 API 配置已初始化
        const config = await initializeApiConfig();
        if (!config.apiEndpoint) {
            throw new Error('请先在选项页面配置 API 设置');
        }

        console.log('开始分析搜索结果，查询:', query);
        console.log('搜索结果:', results);

        // 格式化搜索结果为 Markdown 文本
        let formattedResults = '';
        
        // 汇总每个关键词的搜索结果
        if (results.results) {
            const lastIndex = results.results.length - 1;
            results.results.forEach((keywordResult, idx) => {
                formattedResults += `### ${keywordResult.searchTerm}\n\n`;
                
                // 对每个结果进行内容提取和汇总
                const summaries = keywordResult.results.map(result => {
                    // 提取标题中的关键信息（去除网站名称等）
                    const cleanTitle = result.title.split(' - ')[0].split(' | ')[0].trim();
                    
                    // 清理和优化摘要
                    let cleanSnippet = result.snippet
                        .replace(/\.\.\./g, '') // 移除省略号
                        .replace(/\s+/g, ' ') // 合并空白
                        .replace(/^[^a-zA-Z\u4e00-\u9fa5]+/, '') // 移除开头的非文字字符
                        .trim();
                    
                    // 如果摘要太长，截取合适长度
                    if (cleanSnippet.length > 200) {
                        cleanSnippet = cleanSnippet.substring(0, 200) + '...';
                    }
                    
                    return {
                        title: cleanTitle,
                        summary: cleanSnippet
                    };
                });
                
                // 合并相似内容，去除重复信息
                const uniqueSummaries = new Map();
                summaries.forEach(summary => {
                    const key = summary.title.toLowerCase();
                    if (!uniqueSummaries.has(key) || 
                        uniqueSummaries.get(key).summary.length < summary.summary.length) {
                        uniqueSummaries.set(key, summary);
                    }
                });
                
                // 格式化输出
                Array.from(uniqueSummaries.values()).forEach((summary, index) => {
                    formattedResults += `**${index + 1}. ${summary.title}**\n\n`;
                    formattedResults += `${summary.summary}\n\n`;
                });
                
                // 只在不是最后一个关键词的结果后添加分隔符
                if (idx < lastIndex) {
                    formattedResults += '---\n\n';
                }
            });
        }

        const messages = [{
            role: 'system',
            content: `你是一个专业的分析专家，请帮助用户分析和总结搜索结果。请使用 Markdown 格式按照以下结构输出：

# 分析总结

## 主要发现
[总结搜索结果中最重要的3-5个发现，按重要性排序]

## 详细分析
[对主要发现进行详细说明，重点关注最新、最相关的信息]

## 时间线
[如果有时间相关内容，请按时间顺序整理最重要的事件，使用列表格式]

## 可信度分析
[评估信息的可靠性，说明是否有矛盾或需要进一步验证的内容]

## 建议
[基于分析给出1-2条具体可行的建议或下一步行动]

注意事项：
1. 保持客观准确，只基于搜索结果中的信息
2. 重点关注用户的原始问题
3. 如果发现信息不足或矛盾，请明确指出
4. 使用 Markdown 格式保持内容结构清晰
5. 确保每个标题前后都有空行，以保证格式正确
6. 优先使用最新、最权威的信息源
7. 避免重复信息，保持分析简洁有力`
        }, {
            role: 'user',
            content: `请分析以下搜索结果，并给出一个全面的总结：

# 原始问题

${query}

${formattedResults.trim()}`
        }];

        console.log('发送分析请求，消息:', messages);

        const response = await sendAIRequest(messages);
        console.log('收到分析响应:', response);

        // 使用 marked 解析器渲染 Markdown
        return marked.parse(response);
    } catch (error) {
        console.error('分析搜索结果失败:', error);
        throw error;
    }
}

// 构建上下文消息
export function buildContextMessage(message, pageInfo) {
    if (!pageInfo) return message;
    
    return `当前页面信息：
标题：${pageInfo.title}
网址：${pageInfo.url}
${pageInfo.metaDescription ? '描述：' + pageInfo.metaDescription + '\n' : ''}
${pageInfo.h1Text ? '标题文本：' + pageInfo.h1Text + '\n' : ''}
页面内容摘要：${pageInfo.textContent.substring(0, 3000)}...

用户问题：${message}`;
} 