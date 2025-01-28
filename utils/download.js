// 下载处理模块
import { addMessage } from './messaging.js';
import { updateOperationStatus } from './ui.js';

// 分析网页结构
export async function analyzeWebStructure(selectedArea = null) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('无法获取当前标签页');

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (selectedArea) => {
                // 获取要分析的元素范围
                let elements = selectedArea?.elements || document.querySelectorAll('*');
                
                // 分析页面结构
                const structure = {
                    url: window.location.href,
                    title: document.title,
                    elements: Array.from(elements).map(el => ({
                        tag: el.tagName.toLowerCase(),
                        classes: Array.from(el.classList),
                        id: el.id,
                        href: el.tagName === 'A' ? el.href : null,
                        text: el.textContent.trim().substring(0, 100)
                    }))
                };

                return structure;
            },
            args: [selectedArea]
        });

        return result;
    } catch (error) {
        console.error('分析页面结构失败:', error);
        throw error;
    }
}

// 匹配页面模式
export function matchPagePattern(structure) {
    const patterns = [
        {
            name: '文件列表页面',
            downloadMethod: 'downloadFilesFromAllPages',
            match: (structure) => {
                const hasFileLinks = structure.elements.some(el => 
                    el.tag === 'a' && 
                    (el.href?.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i) ||
                     el.text.toLowerCase().includes('下载'))
                );
                const hasPagination = structure.elements.some(el =>
                    el.classes.some(cls => cls.toLowerCase().includes('page') || cls.toLowerCase().includes('pagination'))
                );
                return hasFileLinks && hasPagination;
            }
        },
        {
            name: '详情页面列表',
            downloadMethod: 'downloadFilesFromAllDetails',
            match: (structure) => {
                const hasDetailLinks = structure.elements.some(el =>
                    el.tag === 'a' && 
                    (el.classes.some(cls => cls.toLowerCase().includes('detail') || cls.toLowerCase().includes('title')) ||
                     el.href?.includes('detail') || el.href?.includes('view'))
                );
                return hasDetailLinks;
            }
        }
    ];

    return patterns
        .map(pattern => ({
            pattern,
            score: pattern.match(structure) ? 1 : 0
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score);
}

// 查找并下载文件
export async function findAndDownloadFiles(progressMessage) {
    try {
        updateOperationStatus('正在分析页面结构...');
        const structure = await analyzeWebStructure();
        
        updateOperationStatus('正在准备下载...');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('无法获取当前标签页');

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // 获取要分析的元素范围
                let elements = window.selectedArea?.elements || Array.from(document.querySelectorAll('a'));

                // 筛选下载链接
                return elements
                    .filter(el => el.tagName === 'A')
                    .filter(a => {
                        const href = a.href.toLowerCase();
                        const text = a.textContent.toLowerCase().trim();
                        
                        // 检查是否是文件下载链接
                        const isFileDownload = href.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i) ||
                                             a.hasAttribute('download') ||
                                             href.includes('download') ||
                                             text.includes('下载');
                        
                        return isFileDownload && href && !href.includes('javascript:');
                    })
                    .map(a => ({
                        url: a.href,
                        filename: a.getAttribute('download') || 
                                a.textContent.trim() || 
                                a.href.split('/').pop()
                    }));
            }
        });

        if (!result || result.length === 0) {
            return `未找到可下载的文件${window.selectedArea ? '（在选中区域内）' : ''}`;
        }

        return await downloadWithProgress(result, progressMessage);
    } catch (error) {
        console.error('下载操作失败:', error);
        throw error;
    }
}

// 带进度的下载
export async function downloadWithProgress(downloadLinks, progressMessage) {
    try {
        let successCount = 0;
        let failCount = 0;
        const total = downloadLinks.length;
        
        for (let i = 0; i < downloadLinks.length; i++) {
            const { url, filename } = downloadLinks[i];
            try {
                await chrome.downloads.download({ url, filename });
                successCount++;
                
                // 更新进度消息
                if (progressMessage) {
                    const progress = Math.round((i + 1) / total * 100);
                    const markdownContainer = progressMessage.querySelector('.markdown-body');
                    if (markdownContainer) {
                        markdownContainer.innerHTML = `下载进度: ${progress}%\n成功: ${successCount}\n失败: ${failCount}`;
                    }
                }
            } catch (error) {
                console.error(`下载文件失败 ${url}:`, error);
                failCount++;
            }
        }

        return `下载完成\n共 ${total} 个文件\n成功: ${successCount}\n失败: ${failCount}`;
    } catch (error) {
        console.error('批量下载失败:', error);
        throw error;
    }
}

// 从所有页面下载文件
export async function downloadFilesFromAllPages(progressMessage) {
    // 实现从分页列表页面下载文件的逻辑
    return await findAndDownloadFiles(progressMessage);
}

// 从所有详情页下载文件
export async function downloadFilesFromAllDetails(progressMessage) {
    // 实现从详情页面下载文件的逻辑
    return await findAndDownloadFiles(progressMessage);
} 