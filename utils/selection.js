// 选择工具模块
import { addMessage } from './messages.js';
import { isSpecialPage } from './pageContent.js';

// 创建选择工具
export async function createSelectionTool() {
    try {
        console.log('开始创建选择工具...');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('无法获取当前标签页');
        }

        // 检查是否是特殊页面
        if (isSpecialPage(tab.url)) {
            console.log('特殊页面，跳过选择工具创建');
            return;
        }

        console.log('注入 CSS...');
        await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            css: `
                .selection-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    z-index: 999999;
                    cursor: crosshair;
                    display: none;
                }
                .selection-box {
                    position: absolute;
                    border: 2px solid #007bff;
                    background: rgba(0, 123, 255, 0.1);
                    pointer-events: none;
                }
            `
        });

        console.log('注入选择工具脚本...');
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                console.log('开始执行选择工具脚本...');
                if (document.querySelector('.selection-overlay')) {
                    console.log('选择工具已存在，跳过创建');
                    return;
                }

                const overlay = document.createElement('div');
                overlay.className = 'selection-overlay';
                document.body.appendChild(overlay);
                console.log('创建选择覆盖层完成');

                let isSelecting = false;
                let startX, startY;
                let selectionBox = null;

                overlay.addEventListener('mousedown', (e) => {
                    console.log('开始选择...');
                    isSelecting = true;
                    startX = e.clientX;
                    startY = e.clientY;

                    selectionBox = document.createElement('div');
                    selectionBox.className = 'selection-box';
                    overlay.appendChild(selectionBox);
                });

                overlay.addEventListener('mousemove', (e) => {
                    if (!isSelecting) return;

                    const currentX = e.clientX;
                    const currentY = e.clientY;

                    const left = Math.min(startX, currentX);
                    const top = Math.min(startY, currentY);
                    const width = Math.abs(currentX - startX);
                    const height = Math.abs(currentY - startY);

                    selectionBox.style.left = left + 'px';
                    selectionBox.style.top = top + 'px';
                    selectionBox.style.width = width + 'px';
                    selectionBox.style.height = height + 'px';
                });

                overlay.addEventListener('mouseup', (e) => {
                    if (!isSelecting) return;
                    console.log('完成选择...');
                    isSelecting = false;

                    const rect = selectionBox.getBoundingClientRect();
                    console.log('选择区域:', rect);

                    // 获取选区内的所有元素
                    const selectedElements = Array.from(document.querySelectorAll('*')).filter(el => {
                        const elRect = el.getBoundingClientRect();
                        return !(elRect.right < rect.left || 
                                elRect.left > rect.right || 
                                elRect.bottom < rect.top || 
                                elRect.top > rect.bottom);
                    });

                    console.log('选中元素数量:', selectedElements.length);

                    // 发送选区信息
                    chrome.runtime.sendMessage({
                        type: 'AREA_SELECTED',
                        data: {
                            rect: {
                                left: rect.left,
                                top: rect.top,
                                width: rect.width,
                                height: rect.height
                            },
                            elements: selectedElements.length
                        }
                    });

                    // 保存选区信息到页面
                    window.selectedArea = {
                        rect: rect,
                        elements: selectedElements
                    };

                    overlay.style.display = 'none';
                });

                console.log('选择工具脚本执行完成');
            }
        });

        console.log('选择工具创建完成');
    } catch (error) {
        console.error('创建选择工具失败:', error);
        // 不抛出错误，而是静默失败
        return;
    }
}

// 激活选择工具
export async function activateSelectionTool(messageHistory, MAX_MESSAGE_HISTORY) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('无法获取当前标签页');
        }

        // 确保选择工具已创建
        await createSelectionTool();

        // 显示选择覆盖层
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                const overlay = document.querySelector('.selection-overlay');
                if (overlay) {
                    overlay.style.display = 'block';
                }
            }
        });

        addMessage('请在页面上框选要分析的区域...', false, false, document.getElementById('chatMessages'), messageHistory, MAX_MESSAGE_HISTORY);
    } catch (error) {
        console.error('激活选择工具失败:', error);
        addMessage('激活框选工具失败: ' + error.message, false, false, document.getElementById('chatMessages'), messageHistory, MAX_MESSAGE_HISTORY);
        return false;
    }
    return true;
} 