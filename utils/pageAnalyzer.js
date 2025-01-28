// 页面分析相关功能

// 预定义的网页结构模式
export const PAGE_PATTERNS = {
    // 动态下载模式：页面包含动态下载链接（如 .do）
    DYNAMIC_DOWNLOAD_PATTERN: {
        name: 'dynamic_download',
        conditions: {
            hasDynamicDownloadLinks: (structure) => structure.links.withDynamicDownload > 0,
            hasListStructure: (structure) => structure.layout.isList,
            hasDatePattern: (structure) => structure.layout.hasDatePattern,
            hasPagination: (structure) => {
                return structure.links.withDetailPattern > 0 && (
                    structure.links.listItems.total > 10 || 
                    structure.layout.isList
                );
            }
        },
        downloadMethod: 'downloadFilesFromAllPages',
        description: '列表页包含动态下载链接，需要遍历所有页面'
    },

    // 列表-详情模式：列表页包含多个链接，每个链接指向包含下载按钮的详情页
    LIST_DETAIL_PATTERN: {
        name: 'list_detail',
        conditions: {
            isList: (structure) => structure.layout.isList,
            hasListItems: (structure) => structure.links.listItems.total > 5,
            hasDateItems: (structure) => structure.links.listItems.withDate > 0,
            hasTitleItems: (structure) => structure.links.listItems.withTitle > 0,
            noDirectDownloads: (structure) => structure.links.withDownloadAttr === 0,
            hasDetailLinks: (structure) => structure.links.withDetailPattern > 0
        },
        downloadMethod: 'downloadFilesFromAllDetails',
        description: '列表页包含多个指向详情页的链接，需要进入详情页下载文件'
    },

    // 直接下载模式：页面上直接包含下载链接
    DIRECT_DOWNLOAD_PATTERN: {
        name: 'direct_download',
        conditions: {
            hasDownloadLinks: (structure) => structure.links.withDownloadAttr > 0 || 
                                         structure.links.withPDFExtension > 0,
            hasDownloadText: (structure) => structure.downloadElements.hasDownloadText,
            isNotDynamicDownload: (structure) => structure.links.withDynamicDownload === 0
        },
        downloadMethod: 'findAndDownloadFiles',
        description: '页面直接包含可下载的文件链接'
    },

    // 分页列表模式：列表分多页显示，每页都有下载链接
    PAGINATED_LIST_PATTERN: {
        name: 'paginated_list',
        conditions: {
            isList: (structure) => structure.layout.isList,
            hasPagination: (structure) => {
                return structure.links.withDetailPattern > 0 && 
                       structure.links.listItems.total > 10;
            },
            hasDownloadLinks: (structure) => structure.links.withDownloadAttr > 0 || 
                                         structure.links.withPDFExtension > 0 ||
                                         structure.links.withDynamicDownload > 0
        },
        downloadMethod: 'downloadFilesFromAllPages',
        description: '分页列表，每页包含可下载的文件'
    },

    // 详情页模式：单个详情页面，包含下载链接
    DETAIL_PAGE_PATTERN: {
        name: 'detail_page',
        conditions: {
            isDetail: (structure) => structure.layout.isDetail,
            hasDetailContent: (structure) => structure.layout.isDetail,
            hasDownloadNearTitle: (structure) => structure.downloadElements.nearTitleDownload,
            hasDownloadInContent: (structure) => structure.downloadElements.inContentDownload
        },
        downloadMethod: 'findAndDownloadFiles',
        description: '详情页面包含下载链接'
    }
};

// 匹配网页结构模式
export function matchPagePattern(structure) {
    const matches = [];
    
    for (const [patternKey, pattern] of Object.entries(PAGE_PATTERNS)) {
        let matchScore = 0;
        let totalConditions = 0;
        let criticalConditionsMet = true;
        
        for (const [conditionKey, condition] of Object.entries(pattern.conditions)) {
            totalConditions++;
            const result = condition(structure);
            if (result) {
                matchScore++;
            } else if (
                (patternKey === 'DYNAMIC_DOWNLOAD_PATTERN' && conditionKey === 'hasDynamicDownloadLinks') ||
                (patternKey === 'LIST_DETAIL_PATTERN' && conditionKey === 'hasDetailLinks') ||
                (patternKey === 'DIRECT_DOWNLOAD_PATTERN' && conditionKey === 'hasDownloadLinks')
            ) {
                criticalConditionsMet = false;
            }
        }
        
        const matchPercentage = (matchScore / totalConditions) * 100;
        
        if (criticalConditionsMet && matchPercentage >= 60) {
            matches.push({
                pattern: pattern,
                score: matchPercentage,
                description: pattern.description
            });
        }
    }
    
    matches.sort((a, b) => b.score - a.score);
    return matches;
}

// 分析网页结构并获取下载建议
export async function analyzeWebStructure(selectedArea = null) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return null;

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                function getStructureInfo() {
                    console.log('开始分析网页结构...');
                    
                    // 获取要分析的根元素和范围内的元素
                    let selectedElements = null;
                    if (window.selectedArea && window.selectedArea.elements) {
                        console.log('检测到框选区域');
                        selectedElements = window.selectedArea.elements;
                        console.log('框选区域内元素数量:', selectedElements.length);
                    }

                    // 分析页面结构
                    const structure = {
                        url: window.location.href,
                        title: document.title,
                        // 分析链接
                        links: {
                            total: selectedElements ? 
                                selectedElements.filter(el => el.tagName === 'A').length :
                                document.querySelectorAll('a').length,
                            withDownloadAttr: selectedElements ? 
                                selectedElements.filter(el => el.tagName === 'A' && el.hasAttribute('download')).length :
                                document.querySelectorAll('a[download]').length,
                            withPDFExtension: (selectedElements ? 
                                selectedElements.filter(el => el.tagName === 'A') :
                                Array.from(document.querySelectorAll('a'))
                            ).filter(a => {
                                const isMatch = a.href.toLowerCase().includes('.pdf');
                                if (isMatch) console.log('找到PDF链接:', a.href, a.textContent);
                                return isMatch;
                            }).length,
                            withDocExtension: (selectedElements ? 
                                selectedElements.filter(el => el.tagName === 'A') :
                                Array.from(document.querySelectorAll('a'))
                            ).filter(a => {
                                const isMatch = a.href.toLowerCase().match(/\.(doc|docx)$/);
                                if (isMatch) console.log('找到DOC链接:', a.href, a.textContent);
                                return isMatch;
                            }).length,
                            // 检测动态下载链接
                            withDynamicDownload: (selectedElements ? 
                                selectedElements.filter(el => el.tagName === 'A') :
                                Array.from(document.querySelectorAll('a'))
                            ).filter(a => {
                                const href = a.href.toLowerCase();
                                const text = a.textContent.toLowerCase();
                                const isDynamic = (
                                    href.includes('.do') ||
                                    href.includes('download.action') ||
                                    href.includes('download.jsp') ||
                                    (href.includes('download') && !href.endsWith('.pdf') && !href.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/))
                                );
                                if (isDynamic) console.log('找到动态下载链接:', href, text);
                                return isDynamic;
                            }).length,
                            // 检测详情页链接模式
                            withDetailPattern: (selectedElements ? 
                                selectedElements.filter(el => el.tagName === 'A') :
                                Array.from(document.querySelectorAll('a'))
                            ).filter(a => {
                                const href = a.href.toLowerCase();
                                const isDetail = (
                                    href.includes('detail') ||
                                    href.includes('info') ||
                                    href.includes('view') ||
                                    href.match(/\/\d+\.html?$/)
                                );
                                if (isDetail) console.log('找到详情页链接:', href);
                                return isDetail;
                            }).length,
                            // 分析列表项链接
                            listItems: {
                                total: selectedElements ? 
                                    selectedElements.filter(el => 
                                        el.matches('li a, tr a, .list a, .list-item a')
                                    ).length :
                                    document.querySelectorAll('li a, tr a, .list a, .list-item a').length,
                                withDate: (selectedElements ? 
                                    selectedElements.filter(el => el.matches('li, tr, .list-item')) :
                                    Array.from(document.querySelectorAll('li, tr, .list-item'))
                                ).filter(item => {
                                    const text = item.textContent;
                                    const hasDate = text.match(/\d{4}[年\-\.\/]\d{1,2}[月\-\.\/]\d{1,2}/) || 
                                        text.match(/\d{4}年/) ||
                                        text.match(/\d{4}[年\-\.\/](第[一二三四]季度|[1234]季度)/);
                                    if (hasDate) console.log('找到带日期的列表项:', text);
                                    return hasDate;
                                }).length,
                                withTitle: (selectedElements ? 
                                    selectedElements.filter(el => 
                                        el.matches('li a, tr a, .list a, .list-item a')
                                    ) :
                                    Array.from(document.querySelectorAll('li a, tr a, .list a, .list-item a'))
                                ).filter(a => {
                                    const hasTitle = a.textContent.length > 10 && !a.href.includes('#') && !a.href.includes('javascript:');
                                    if (hasTitle) console.log('找到带标题的列表项:', a.textContent);
                                    return hasTitle;
                                }).length
                            }
                        },
                        // 分析页面布局
                        layout: {
                            isList: selectedElements ? 
                                selectedElements.some(el => 
                                    el.matches('ul li a') || el.matches('table tr a') ||
                                    el.matches('.list') || el.matches('.list-item')
                                ) :
                                Boolean(
                                    document.querySelector('ul li a') || 
                                    document.querySelector('table tr a') ||
                                    document.querySelector('.list') ||
                                    document.querySelector('.list-item')
                                ),
                            isDetail: selectedElements ? 
                                selectedElements.some(el => 
                                    el.matches('article') || el.matches('.detail') ||
                                    el.matches('.content')
                                ) :
                                Boolean(
                                    document.querySelector('article') ||
                                    document.querySelector('.detail') ||
                                    document.querySelector('.content') ||
                                    (document.querySelector('h1, h2') && document.querySelectorAll('a').length < 20)
                                ),
                            hasDatePattern: (selectedElements || Array.from(document.querySelectorAll('*'))).some(el => {
                                const text = el.textContent;
                                const hasDate = text.match(/\d{4}[年\-\.\/]\d{1,2}[月\-\.\/]\d{1,2}/) ||
                                    text.match(/\d{4}年/) ||
                                    text.match(/\d{4}[年\-\.\/](第[一二三四]季度|[1234]季度)/);
                                if (hasDate) console.log('找到日期模式:', text);
                                return hasDate;
                            })
                        },
                        // 分析下载相关元素
                        downloadElements: {
                            hasDownloadText: (selectedElements ? 
                                selectedElements.filter(el => 
                                    el.matches('a, button, span, div')
                                ) :
                                Array.from(document.querySelectorAll('a, button, span, div'))
                            ).some(el => {
                                const hasDownload = el.textContent.includes('下载') || 
                                                    el.textContent.includes('查看') ||
                                                    el.getAttribute('title')?.includes('下载');
                                if (hasDownload) console.log('找到下载文本:', el.textContent);
                                return hasDownload;
                            }),
                            nearTitleDownload: selectedElements ? 
                                selectedElements.some(el => 
                                    el.matches('h1 + a, h1 + div a, h2 + a, h2 + div a')
                                ) :
                                Boolean(document.querySelector('h1 + a, h1 + div a, h2 + a, h2 + div a')),
                            inContentDownload: (selectedElements ? 
                                selectedElements.filter(el => 
                                    el.matches('.content a, .detail a, article a')
                                ) :
                                Array.from(document.querySelectorAll('.content a, .detail a, article a'))
                            ).some(a => {
                                const hasDownload = a.textContent.includes('下载') || a.href.toLowerCase().includes('download');
                                if (hasDownload) console.log('找到正文中的下载链接:', a.href, a.textContent);
                                return hasDownload;
                            })
                        }
                    };

                    // 打印关键分析结果
                    console.log('页面分析结果:', {
                        url: structure.url,
                        title: structure.title,
                        linkCounts: {
                            total: structure.links.total,
                            withDownload: structure.links.withDownloadAttr,
                            withPDF: structure.links.withPDFExtension,
                            withDoc: structure.links.withDocExtension,
                            withDynamic: structure.links.withDynamicDownload,
                            withDetail: structure.links.withDetailPattern
                        },
                        listInfo: {
                            isList: structure.layout.isList,
                            totalItems: structure.links.listItems.total,
                            withDate: structure.links.listItems.withDate,
                            withTitle: structure.links.listItems.withTitle
                        },
                        downloadInfo: {
                            hasDownloadText: structure.downloadElements.hasDownloadText,
                            nearTitle: structure.downloadElements.nearTitleDownload,
                            inContent: structure.downloadElements.inContentDownload
                        }
                    });

                    return structure;
                }

                return getStructureInfo();
            }
        });

        // 打印匹配结果
        const matches = matchPagePattern(result);
        console.log('模式匹配结果:', matches.map(match => ({
            pattern: match.pattern.name,
            score: match.score,
            description: match.description
        })));

        return result;
    } catch (error) {
        console.error('分析网页结构失败:', error);
        return null;
    }
}

// 检查链接是否是下载链接
export function isDownloadLink(link) {
    const href = link.href.toLowerCase();
    const text = link.textContent.toLowerCase().trim();
    const parentText = link.parentElement?.textContent.toLowerCase().trim() || '';

    // 检查是否是年度/季度报告文件
    const hasYearQuarter = (
        (text.includes('年') || parentText.includes('年')) && 
        (text.includes('季度') || text.includes('年度') ||
         parentText.includes('季度') || parentText.includes('年度'))
    );

    // 检查是否包含特定文件扩展名
    const fileExtensions = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 
        'ppt', 'pptx', 'txt', 'csv', 'zip', 
        'rar', '7z', 'tar', 'gz', 'html', 'htm'
    ];
    
    const hasFileExtension = fileExtensions.some(ext => 
        href.endsWith('.' + ext) || href.includes('.' + ext + '?')
    );

    // 检查是否是动态下载链接
    const isDynamicDownload = 
        href.includes('websiteDownload.do') ||
        href.includes('download') ||
        href.includes('file') ||
        href.includes('attachment') ||
        text.includes('下载') ||
        text.includes('查看');

    return hasFileExtension || isDynamicDownload || hasYearQuarter;
} 