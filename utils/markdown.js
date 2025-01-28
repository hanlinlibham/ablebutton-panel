// Markdown 解析和样式处理

// Markdown 样式定义
export const markdownStyles = `
.markdown-body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    word-wrap: break-word;
    padding: 8px;
}

.markdown-body h3 {
    font-size: 1.4em;
    margin: 0.8em 0 0.4em;
    padding-bottom: 0.2em;
    border-bottom: 1px solid #eaecef;
}

.markdown-body h4 {
    font-size: 1.2em;
    margin: 0.6em 0 0.3em;
}

.markdown-body h5 {
    font-size: 1em;
    margin: 0.4em 0 0.2em;
}

.markdown-body ul {
    margin: 0.2em 0;
    padding-left: 1.5em;
}

.markdown-body li {
    margin: 0.1em 0;
}

.markdown-body li.indent-2 {
    margin-left: 1em;
}

.markdown-body li.indent-4 {
    margin-left: 2em;
}

.markdown-body p {
    margin: 0.2em 0;
}

.markdown-body p + h3 {
    margin-top: 0.8em;
}

.markdown-body p + h4 {
    margin-top: 0.6em;
}

.markdown-body p + h5 {
    margin-top: 0.4em;
}

.markdown-body strong {
    font-weight: 600;
}

.markdown-body em {
    font-style: italic;
}

.markdown-body code {
    font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    background-color: rgba(27, 31, 35, 0.05);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 85%;
}

.markdown-body pre {
    background-color: #f6f8fa;
    border-radius: 3px;
    padding: 12px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    margin: 6px 0;
}

.markdown-body pre code {
    background-color: transparent;
    padding: 0;
}

.markdown-body a {
    color: #0366d6;
    text-decoration: none;
}

.markdown-body a:hover {
    text-decoration: underline;
}`;

// Markdown 解析函数
export function parseMarkdown(text) {
    // 保存代码块
    const codeBlocks = [];
    text = text.replace(/```([\s\S]*?)```/g, (match) => {
        codeBlocks.push(match);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // 基本的 markdown 解析规则
    text = text
        // 标题
        .replace(/^### (.*$)/gm, '<h3 class="markdown-h3">$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4 class="markdown-h4">$1</h4>')
        .replace(/^##### (.*$)/gm, '<h5 class="markdown-h5">$1</h5>')
        
        // 列表（支持多级缩进）
        .replace(/^(\s*)-\s(.+)/gm, (match, indent, content) => {
            const level = indent.length;
            return `<li class="indent-${level}">${content}</li>`;
        })
        .replace(/(<li.*>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        
        // 粗体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        
        // 斜体
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        
        // 段落（减少空行）
        .replace(/\n\s*\n/g, '</p><p>')
        
        // 换行
        .replace(/\n/g, '<br>');

    // 恢复代码块
    text = text.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
        const code = codeBlocks[parseInt(index)]
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        return code;
    });

    // 确保段落包装
    if (!text.startsWith('<')) {
        text = '<p>' + text;
    }
    if (!text.endsWith('>')) {
        text = text + '</p>';
    }

    return text;
} 