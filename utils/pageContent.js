// 页面内容处理模块

// 检查是否是特殊页面
export function isSpecialPage(url) {
    return url.startsWith('chrome://') || 
           url.startsWith('chrome-extension://') || 
           url.startsWith('about:') ||
           url.startsWith('edge://') ||
           url.startsWith('file://');
}

// 获取主要内容
function getMainContent() {
    // 需要排除的元素选择器
    const excludeSelectors = [
        // 导航和页眉页脚
        'header', 'nav', 'footer', '#header', '#footer', '#nav', 
        '.header', '.footer', '.nav', '.navigation', '.menu',
        '.sidebar', '[role="banner"]', '[role="navigation"]',
        
        // 广告和推广
        '.advertisement', '.ad', '.ads', '.advert', '.banner',
        'ins.adsbygoogle', '[id*="gpt"]', '[id*="ad-"]', '[class*="ad-"]',
        '[id*="banner"]', '[class*="banner"]',
        
        // 社交和分享
        '.social-share', '.share-buttons', '.social-media',
        '.social-links', '.share-container',
        
        // 评论和用户交互
        '.comment', '.comments', '.comment-section',
        '#comments', '#disqus_thread', '.discuss',
        
        // 相关内容和推荐
        '.related-posts', '.recommended', '.suggestions',
        '.read-more', '.more-articles', '.similar-articles',
        
        // 侧边栏和补充内容
        'aside', '.sidebar', '.widget', '.auxiliary',
        '.supplementary', '.complementary',
        
        // 导航元素
        '.breadcrumb', '.pagination', '.nav-links',
        '.menu-container', '.site-navigation',
        
        // 页面装饰
        '.decoration', '.ornament', '.background',
        
        // 弹出和覆盖
        '.popup', '.modal', '.overlay', '.dialog',
        
        // 工具栏和控制
        '.toolbar', '.controls', '.buttons',
        
        // 版权和法律
        '.copyright', '.legal', '.terms',
        
        // 搜索相关
        '.search', '.search-form', '.search-box',
        
        // 用户相关
        '.user-profile', '.author-info', '.bio',
        
        // 元数据
        '.meta', '.metadata', '.post-meta',
        '.article-meta', '.entry-meta'
    ].join(',');

    // 可能包含主要内容的元素选择器（按优先级排序）
    const contentSelectors = [
        // 文章主体
        'article', '[role="article"]',
        '.article', '.post', '.entry',
        
        // 主要内容区
        'main', '[role="main"]',
        '.main-content', '.primary-content',
        '.page-content', '.content-area',
        
        // 具体内容容器
        '.article-content', '.post-content',
        '.entry-content', '.article-body',
        '.post-body', '.entry-body',
        
        // 特定平台内容
        '.markdown-body', // GitHub
        '.article-detail', // 新闻网站
        '.story-content', // 媒体网站
        
        // 通用内容容器
        '.content', '.text-content',
        'section:not(.sidebar):not(.widget)',
        '#content', '#main'
    ];

    // 内容质量评分函数
    function scoreContent(element) {
        let score = 0;
        const text = element.textContent.trim();
        const textLength = text.length;
        
        // 文本长度评分
        score += Math.min(textLength / 100, 50); // 最多50分
        
        // 段落密度评分
        const paragraphs = element.getElementsByTagName('p');
        score += Math.min(paragraphs.length * 2, 30); // 最多30分
        
        // 图片评分（适度的图片数量）
        const images = element.getElementsByTagName('img');
        score += Math.min(images.length * 5, 20); // 最多20分
        
        // 标题评分
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        score += Math.min(headings.length * 3, 15); // 最多15分
        
        // 链接密度惩罚（太多链接可能是导航区域）
        const links = element.getElementsByTagName('a');
        const linkTextLength = Array.from(links).reduce((sum, link) => sum + link.textContent.length, 0);
        const linkDensity = linkTextLength / textLength;
        score -= Math.min(linkDensity * 50, 30); // 最多减30分
        
        // 文本/HTML比例评分
        const htmlLength = element.innerHTML.length;
        const textToHtmlRatio = textLength / htmlLength;
        score += Math.min(textToHtmlRatio * 20, 20); // 最多20分
        
        return score;
    }

    // 尝试按优先级获取内容
    let bestElement = null;
    let bestScore = -1;

    for (const selector of contentSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            // 检查是否在排除列表中
            if (element.matches(excludeSelectors) || element.closest(excludeSelectors)) {
                continue;
            }

            // 检查内容长度
            const text = element.textContent.trim();
            if (text.length < 200) { // 内容太短的忽略
                continue;
            }

            const score = scoreContent(element);
            if (score > bestScore) {
                bestScore = score;
                bestElement = element;
            }
        }

        // 如果找到了高质量内容（分数超过100），就不再继续查找
        if (bestScore > 100) {
            break;
        }
    }

    // 如果找到了合适的元素
    if (bestElement && bestScore > 50) {
        let cleanedContent = bestElement.cloneNode(true);
        
        // 清理内容
        // 1. 移除所有排除的元素
        excludeSelectors.split(',').forEach(selector => {
            cleanedContent.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // 2. 移除脚本和样式
        cleanedContent.querySelectorAll('script, style, link, meta').forEach(el => el.remove());
        
        // 3. 移除空白节点
        cleanedContent.querySelectorAll('*').forEach(el => {
            if (el.textContent.trim().length === 0) {
                el.remove();
            }
        });
        
        // 4. 移除特定属性
        cleanedContent.querySelectorAll('*').forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('class');
            el.removeAttribute('id');
            el.removeAttribute('onclick');
        });

        // 提取并清理文本
        const content = cleanedContent.textContent
            .replace(/[\n\r]+/g, '\n') // 统一换行符
            .replace(/\s+/g, ' ') // 合并空白
            .replace(/\n\s*\n/g, '\n\n') // 合并多个空行
            .trim();

        if (content.length > 200) {
            return content;
        }
    }

    // 如果上述方法都失败了，尝试获取body内容
    const body = document.body.cloneNode(true);
    
    // 清理 body 内容
    excludeSelectors.split(',').forEach(selector => {
        body.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    body.querySelectorAll('script, style, link, meta').forEach(el => el.remove());
    
    // 移除空白节点
    body.querySelectorAll('*').forEach(el => {
        if (el.textContent.trim().length === 0) {
            el.remove();
        }
    });

    return body.textContent
        .replace(/[\n\r]+/g, '\n')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
}

// 获取页面内容的函数
function getPageContent() {
    const title = document.title;
    const url = window.location.href;
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const h1Text = Array.from(document.getElementsByTagName('h1')).map(h1 => h1.textContent).join(' ');
    const textContent = getMainContent();

    return {
        title,
        url,
        metaDescription,
        h1Text,
        textContent,
        timestamp: Date.now()
    };
}

// 获取当前页面信息
export async function getCurrentPageInfo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return null;

        // 检查是否是特殊页面
        if (isSpecialPage(tab.url)) {
            return {
                title: tab.title || '特殊页面',
                url: tab.url,
                metaDescription: '',
                h1Text: '',
                textContent: '这是一个浏览器特殊页面，无法访问其内容。',
                timestamp: Date.now()
            };
        }

        // 获取页面内容
        try {
            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    // 获取主要内容的函数
                    function getMainContent() {
                        // 需要排除的元素选择器
                        const excludeSelectors = [
                            // 导航和页眉页脚
                            'header', 'nav', 'footer', '#header', '#footer', '#nav', 
                            '.header', '.footer', '.nav', '.navigation', '.menu',
                            '.sidebar', '[role="banner"]', '[role="navigation"]',
                            
                            // 广告和推广
                            '.advertisement', '.ad', '.ads', '.advert', '.banner',
                            'ins.adsbygoogle', '[id*="gpt"]', '[id*="ad-"]', '[class*="ad-"]',
                            '[id*="banner"]', '[class*="banner"]',
                            
                            // 社交和分享
                            '.social-share', '.share-buttons', '.social-media',
                            '.social-links', '.share-container',
                            
                            // 评论和用户交互
                            '.comment', '.comments', '.comment-section',
                            '#comments', '#disqus_thread', '.discuss',
                            
                            // 相关内容和推荐
                            '.related-posts', '.recommended', '.suggestions',
                            '.read-more', '.more-articles', '.similar-articles',
                            
                            // 侧边栏和补充内容
                            'aside', '.sidebar', '.widget', '.auxiliary',
                            '.supplementary', '.complementary',
                            
                            // 导航元素
                            '.breadcrumb', '.pagination', '.nav-links',
                            '.menu-container', '.site-navigation',
                            
                            // 页面装饰
                            '.decoration', '.ornament', '.background',
                            
                            // 弹出和覆盖
                            '.popup', '.modal', '.overlay', '.dialog',
                            
                            // 工具栏和控制
                            '.toolbar', '.controls', '.buttons',
                            
                            // 版权和法律
                            '.copyright', '.legal', '.terms',
                            
                            // 搜索相关
                            '.search', '.search-form', '.search-box',
                            
                            // 用户相关
                            '.user-profile', '.author-info', '.bio',
                            
                            // 元数据
                            '.meta', '.metadata', '.post-meta',
                            '.article-meta', '.entry-meta'
                        ].join(',');

                        // 可能包含主要内容的元素选择器（按优先级排序）
                        const contentSelectors = [
                            // 文章主体
                            'article', '[role="article"]',
                            '.article', '.post', '.entry',
                            
                            // 主要内容区
                            'main', '[role="main"]',
                            '.main-content', '.primary-content',
                            '.page-content', '.content-area',
                            
                            // 具体内容容器
                            '.article-content', '.post-content',
                            '.entry-content', '.article-body',
                            '.post-body', '.entry-body',
                            
                            // 特定平台内容
                            '.markdown-body', // GitHub
                            '.article-detail', // 新闻网站
                            '.story-content', // 媒体网站
                            
                            // 通用内容容器
                            '.content', '.text-content',
                            'section:not(.sidebar):not(.widget)',
                            '#content', '#main'
                        ];

                        // 内容质量评分函数
                        function scoreContent(element) {
                            let score = 0;
                            const text = element.textContent.trim();
                            const textLength = text.length;
                            
                            // 文本长度评分
                            score += Math.min(textLength / 100, 50); // 最多50分
                            
                            // 段落密度评分
                            const paragraphs = element.getElementsByTagName('p');
                            score += Math.min(paragraphs.length * 2, 30); // 最多30分
                            
                            // 图片评分（适度的图片数量）
                            const images = element.getElementsByTagName('img');
                            score += Math.min(images.length * 5, 20); // 最多20分
                            
                            // 标题评分
                            const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
                            score += Math.min(headings.length * 3, 15); // 最多15分
                            
                            // 链接密度惩罚（太多链接可能是导航区域）
                            const links = element.getElementsByTagName('a');
                            const linkTextLength = Array.from(links).reduce((sum, link) => sum + link.textContent.length, 0);
                            const linkDensity = linkTextLength / textLength;
                            score -= Math.min(linkDensity * 50, 30); // 最多减30分
                            
                            // 文本/HTML比例评分
                            const htmlLength = element.innerHTML.length;
                            const textToHtmlRatio = textLength / htmlLength;
                            score += Math.min(textToHtmlRatio * 20, 20); // 最多20分
                            
                            return score;
                        }

                        // 尝试按优先级获取内容
                        let bestElement = null;
                        let bestScore = -1;

                        for (const selector of contentSelectors) {
                            const elements = document.querySelectorAll(selector);
                            for (const element of elements) {
                                // 检查是否在排除列表中
                                if (element.matches(excludeSelectors) || element.closest(excludeSelectors)) {
                                    continue;
                                }

                                // 检查内容长度
                                const text = element.textContent.trim();
                                if (text.length < 200) { // 内容太短的忽略
                                    continue;
                                }

                                const score = scoreContent(element);
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestElement = element;
                                }
                            }

                            // 如果找到了高质量内容（分数超过100），就不再继续查找
                            if (bestScore > 100) {
                                break;
                            }
                        }

                        // 如果找到了合适的元素
                        if (bestElement && bestScore > 50) {
                            let cleanedContent = bestElement.cloneNode(true);
                            
                            // 清理内容
                            // 1. 移除所有排除的元素
                            excludeSelectors.split(',').forEach(selector => {
                                cleanedContent.querySelectorAll(selector).forEach(el => el.remove());
                            });
                            
                            // 2. 移除脚本和样式
                            cleanedContent.querySelectorAll('script, style, link, meta').forEach(el => el.remove());
                            
                            // 3. 移除空白节点
                            cleanedContent.querySelectorAll('*').forEach(el => {
                                if (el.textContent.trim().length === 0) {
                                    el.remove();
                                }
                            });
                            
                            // 4. 移除特定属性
                            cleanedContent.querySelectorAll('*').forEach(el => {
                                el.removeAttribute('style');
                                el.removeAttribute('class');
                                el.removeAttribute('id');
                                el.removeAttribute('onclick');
                            });

                            // 提取并清理文本
                            const content = cleanedContent.textContent
                                .replace(/[\n\r]+/g, '\n') // 统一换行符
                                .replace(/\s+/g, ' ') // 合并空白
                                .replace(/\n\s*\n/g, '\n\n') // 合并多个空行
                                .trim();

                            if (content.length > 200) {
                                return content;
                            }
                        }

                        // 如果上述方法都失败了，尝试获取body内容
                        const body = document.body.cloneNode(true);
                        
                        // 清理 body 内容
                        excludeSelectors.split(',').forEach(selector => {
                            body.querySelectorAll(selector).forEach(el => el.remove());
                        });
                        
                        body.querySelectorAll('script, style, link, meta').forEach(el => el.remove());
                        
                        // 移除空白节点
                        body.querySelectorAll('*').forEach(el => {
                            if (el.textContent.trim().length === 0) {
                                el.remove();
                            }
                        });

                        return body.textContent
                            .replace(/[\n\r]+/g, '\n')
                            .replace(/\s+/g, ' ')
                            .replace(/\n\s*\n/g, '\n\n')
                            .trim();
                    }

                    const title = document.title;
                    const url = window.location.href;
                    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
                    const h1Text = Array.from(document.getElementsByTagName('h1')).map(h1 => h1.textContent).join(' ');
                    const textContent = getMainContent();

                    return {
                        title,
                        url,
                        metaDescription,
                        h1Text,
                        textContent,
                        timestamp: Date.now()
                    };
                }
            });

            return result;
        } catch (error) {
            console.error('获取页面内容失败:', error);
            throw error;
        }
    } catch (error) {
        console.error('获取页面信息失败:', error);
        throw error;
    }
}

let currentPageInfo = null;

// 初始化页面信息
export async function initializePageInfo() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await refreshPageInfo();
        }
    } catch (error) {
        console.error('初始化页面信息失败:', error);
        throw error;
    }
}

// 刷新页面信息
export async function refreshPageInfo() {
    try {
        currentPageInfo = await getCurrentPageInfo();
        return currentPageInfo;
    } catch (error) {
        console.error('刷新页面信息失败:', error);
        throw error;
    }
} 