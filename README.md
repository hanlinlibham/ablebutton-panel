# AbleButton

AbleButton 是一个智能的 Chrome 扩展，它可以帮助你分析网页内容、执行搜索和处理文件。它默认使用 DeepSeek API 来提供智能对话功能，旨在于提供api应用场景，降低使用门槛。

## 功能特点

- 友好支持DEEPSEEKAI 模型（deepseek-chat, deepseek-reasoner）
- 智能网页内容分析
- 自定义搜索和分析
- Token 使用统计
- 可自定义的 API 设置

## 安装

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/addin_chrome.git
```

2. 在 Chrome 浏览器中：
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

## 配置

1. 获取 DeepSeek API Key：
   - 访问 [DeepSeek Platform](https://platform.deepseek.com/)
   - 注册账号并获取 API Key

2. 配置扩展：
   - 点击扩展图标
   - 打开设置页面
   - 输入你的 API Key
   - 选择要使用的模型
   - 配置其他参数（温度、最大 token 等）

## 使用说明

1. 基本使用：
   - 点击扩展图标打开侧边栏
   - 输入问题或选择文本后右键使用
   - 查看 AI 响应和分析结果

2. 模型选择：
   - deepseek-chat：适合一般对话
   - deepseek-reasoner：适合需要推理的任务 #不稳定，还在查询原因

3. Token 统计：
   - 在设置页面查看 token 使用情况
   - 包括上传、下载和总计统计

## 开发

```bash
# 安装依赖
npm install

# 构建扩展
npm run build

# 运行测试
npm test
```

## 贡献

欢迎提交 Pull Request 或创建 Issue。

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。 