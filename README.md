# AbleButton

<div align="center">

![AbleButton Logo](icons/icon128.png)

一个智能的 Chrome 扩展，基于 DeepSeek API 提供强大的网页内容分析和智能对话功能。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v1.0-green.svg)](https://github.com/hanlinlibham/ablebutton-panel/releases)

</div>

## 🌟 功能特点

- 🤖 完整支持 DeepSeek AI 模型系列
  - deepseek-chat：适用于日常对话和内容生成
  - deepseek-reasoner：专注于逻辑推理和复杂问题解决（实验性功能）
- 📊 智能网页内容分析
  - 自动提取关键信息
  - 支持多语言内容处理
  - 智能总结和重点提取
- 🔍 强大的上下文感知能力
  - 支持选中文本智能分析
  - 自动关联页面上下文
  - 支持多轮对话记忆
- 📈 完整的使用统计
  - Token 使用量实时统计
  - 会话历史记录
  - 使用成本追踪
- ⚙️ 高度可定制
  - 灵活的 API 设置
  - 可调节的模型参数
  - 自定义提示词模板

## 📦 安装

### 方式一：从源码安装

1. 克隆仓库：
```bash
git clone https://github.com/hanlinlibham/ablebutton-panel.git
cd ablebutton-panel
```

2. 在 Chrome 浏览器中安装：
   - 访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录

### 方式二：从 Chrome 商店安装（即将上线）

- 访问 Chrome 网上应用店
- 搜索 "AbleButton"
- 点击"添加到 Chrome"

## ⚙️ 配置说明

### 1. API 配置

1. 获取 DeepSeek API Key：
   - 访问 [DeepSeek Platform](https://platform.deepseek.com/)
   - 注册并登录您的账号
   - 在控制台中生成 API Key

2. 配置扩展：
   - 点击扩展图标
   - 选择"设置"
   - 在 API 设置中填入您的 API Key
   - 保存设置

### 2. 模型参数配置

- **Temperature**：控制输出的随机性（0.0-2.0）
- **Max Tokens**：单次响应的最大 token 数
- **Top P**：控制输出的多样性
- **Presence Penalty**：控制话题重复度

## 🚀 使用指南

### 基础功能

1. **快速访问**：
   - 点击浏览器工具栏中的扩展图标
   - 使用快捷键 `Alt+B` 打开侧边栏（可自定义）

2. **文本分析**：
   - 选中网页文本
   - 右键选择 "使用 AbleButton 分析"
   - 或直接在侧边栏中输入问题

3. **上下文对话**：
   - 支持多轮对话
   - 自动保持对话上下文
   - 支持对话历史回溯

### 高级功能

1. **模型切换**：
   - deepseek-chat：日常对话和内容生成
   - deepseek-reasoner：复杂推理和专业分析

2. **使用统计**：
   - 在设置页面查看详细使用统计
   - 支持按时间段筛选
   - 导出统计数据

## 🔧 开发指南

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test
```

### 项目结构

```
ablebutton-panel/
├── manifest.json      # 扩展配置文件
├── background.js     # 后台服务
├── sidepanel.html    # 侧边栏界面
├── sidepanel.js      # 侧边栏逻辑
├── options.html      # 设置页面
├── options.js        # 设置逻辑
├── utils/            # 工具函数
├── lib/              # 第三方库
├── icons/            # 图标资源
└── test/            # 测试文件
```

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 提交 bug 报告
- 新功能建议
- 代码贡献
- 文档改进

请查看我们的[贡献指南](CONTRIBUTING.md)了解更多详情。

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。

## 📮 联系我们

- 提交 Issue：[GitHub Issues](https://github.com/hanlinlibham/ablebutton-panel/issues)
- 邮件联系：[your-email@example.com](mailto:your-email@example.com)

## 🙏 致谢

- [DeepSeek](https://platform.deepseek.com/) - 提供强大的 AI 模型支持
- 所有贡献者和用户的支持 