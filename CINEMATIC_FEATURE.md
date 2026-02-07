# Cinematic Memory Feature

## 概述

这是一个完全复刻自 `cinematic-travel-memory` 的 Apple 影集风格的旅行回忆创作工具，集成了强大的 Gemini AI 能力。

## 核心特性

### 1. 三种布局模式

#### Full Bleed (全屏沉浸式)
- 全屏背景图片，带视差缩放效果
- 底部居中文字，渐变遮罩
- 滚动时有优雅的缩放和淡出动画

#### Side by Side (左右分栏)
- 60/40 图文分栏布局
- 图片区域带缩放入场动画
- 文字区域带横向滑入效果

#### Immersive Focus (沉浸聚焦)
- 全屏居中布局
- 图片半透明背景
- 大号粗体文字，混合模式叠加
- 滚动时圆角动态变化

### 2. AI Director 功能 (Gemini 驱动)

所有 AI 功能都集成在底部滑出的工具面板中：

- **Generate (生成图片)**: 使用 `gemini-3-pro-image-preview` 根据提示词生成高质量图片
  - 支持多种宽高比 (1:1, 3:4, 4:3, 9:16, 16:9, 21:9)
  - 支持多种分辨率 (1K, 2K, 4K)
  
- **Edit Media (编辑图片)**: 使用 `gemini-2.5-flash-image` 编辑现有图片
  - 需要先选中一个区块
  - 支持基于提示词的智能编辑

- **Analyze (分析图片)**: 使用 `gemini-3-pro-preview` 分析图片并生成诗意描述
  - 自动为图片生成电影感的文字说明
  - 最多 2 句话的精炼描述

- **Narrate (语音朗读)**: 使用 `gemini-2.5-flash-preview-tts` 文字转语音
  - 5 种预设声音 (Puck, Charon, Kore, Fenrir, Aoede)
  - 实时播放，支持浏览器音频上下文

### 3. 交互特性

- **图片上传**: 鼠标悬停时显示上传按钮，支持替换任意图片
- **实时编辑**: 所有文本都可内联编辑，自动高度调整
- **区块选择**: 点击区块进行选择，选中的区块会有视觉高亮
- **添加章节**: 页面底部有"Continue Story"按钮，可添加新区块
- **滚动回放**: 结束页面有刷新按钮，一键回到顶部

### 4. 视觉设计

- **Apple 风格**: 深色主题 (#050505)，优雅的动画过渡
- **字体搭配**: 
  - 标题使用 Playfair Display (serif)
  - 正文使用 Inter (sans-serif)
- **混合模式**: 使用 mix-blend-difference 实现标题的独特效果
- **毛玻璃效果**: backdrop-blur 实现现代感的半透明面板
- **旋转地球指示器**: 右上角根据滚动进度旋转的视觉反馈

### 5. 动画系统

所有动画都基于 Framer Motion，使用最佳实践：

- **Scroll-driven**: useScroll + useTransform 实现滚动驱动动画
- **Viewport triggers**: whileInView 实现进入视口触发
- **Smooth transitions**: cubic-bezier 缓动函数
- **Performance**: 使用 transform 和 opacity 确保 GPU 加速

## 技术栈

- **React 18** + **Next.js 14**
- **Framer Motion** - 动画库
- **Tailwind CSS** - 样式
- **Gemini AI** (@google/genai v1.40.0)
- **TypeScript** - 类型安全
- **Lucide React** - 图标库

## 文件结构

```
src/
├── types/
│   └── cinematic.ts                    # 类型定义
├── lib/
│   └── services/
│       └── geminiCinematic.ts          # Gemini AI 服务
├── components/
│   └── cinematic/
│       ├── AutoResizeTextarea.tsx      # 自适应文本框
│       ├── ImageUploader.tsx           # 图片上传组件
│       ├── GlobeIndicator.tsx          # 地球指示器
│       ├── FullBleedLayout.tsx         # 全屏布局
│       ├── SideBySideLayout.tsx        # 分栏布局
│       ├── ImmersiveFocusLayout.tsx    # 聚焦布局
│       ├── ReflectionEndLayout.tsx     # 结束页
│       ├── AIDirectorPanel.tsx         # AI 工具面板
│       └── index.ts                    # 统一导出
└── app/
    └── (main)/
        └── memories/
            └── cinematic/
                ├── layout.tsx          # 布局包装
                └── page.tsx            # 主页面

## API 配置

确保在 `.env` 中配置 Gemini API Key:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

## 使用方法

1. 访问 `/memories/cinematic` 路径
2. 编辑标题和位置（左上角）
3. 点击任意区块进行编辑
4. 点击右下角的星星按钮打开 AI 工具面板
5. 使用 AI 功能生成、编辑、分析图片或朗读文字
6. 点击底部"Continue Story"添加新章节
7. 滚动浏览你的电影式回忆

## 最佳实践

### 架构
- 组件化设计，每个布局独立
- 统一的状态管理
- TypeScript 类型安全
- 服务层分离 (Gemini API 调用)

### 代码质量
- 遵循 React Hooks 规则
- 使用 useCallback/useMemo 优化性能
- 清晰的命名和注释
- 错误处理和用户反馈

### 用户体验
- 流畅的动画过渡
- 响应式设计
- 加载状态提示
- 错误提示友好
- 键盘导航支持

## Google STT 实现验证

当前的 `/api/transcribe` 路由正确实现了音频转写功能：

- ✅ 使用 `@google/genai` 库
- ✅ 调用 `gemini-2.0-flash-exp` 模型
- ✅ 支持 base64 音频输入
- ✅ 中文转写提示词优化
- ✅ 错误处理完善

这是 Gemini 的多模态能力，比传统的 Google Cloud STT 更灵活和强大。

## 未来扩展

可能的功能增强：
- 保存和加载项目
- 导出为视频
- 更多布局模式
- 主题自定义
- 音乐背景
- 协作编辑

---

完全遵循了原始 cinematic-travel-memory 的所有细节，并针对 Next.js 架构进行了优化。
```
