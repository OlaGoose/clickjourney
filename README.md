# Orbit Journey (Next)

一比一复刻 **orbit-travel-memory** 的 Next.js 项目，采用 **infinite-craft-game** 与 **Supabase** 的架构与最佳实践。

## 功能

- **星空背景**：Canvas 星星动画
- **3D 地球**：react-globe.gl 可旋转/缩放，当前点位高亮
- **时间轴轮播**：旅程开始/结束卡片 + 记忆卡片，滚动时和弦音效
- **记忆详情**：点击卡片进入详情页（图库、描述）
- **图库弹窗**：支持滑动/键盘/拖拽切换大图
- **Journey Intel**：基于当前中心点调用 AI（Gemini/Doubao/OpenAI）获取地点简介
- **用户与数据**：Supabase Auth（登录/注册/OAuth）+ 云端记忆表，未登录使用 Demo 数据

## 技术栈

- **框架**：Next.js 14 (App Router)
- **样式**：Tailwind CSS
- **3D**：Three.js + react-globe.gl（动态加载，SSR 关闭）
- **后端/数据**：Supabase（Auth + PostgreSQL）
- **AI**：服务端 API `/api/location-info`，按环境变量顺序尝试 Gemini → Doubao → OpenAI

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写（你提供的配置可直接粘贴）：

```bash
# AI：auto 表示 Gemini 优先，豆包第二，OpenAI 第三
NEXT_PUBLIC_AI_PROVIDER=auto

# 豆包
NEXT_DOUBAO_API_KEY=...
NEXT_DOUBAO_CHAT_MODEL=doubao-seed-1-6-lite-251015
NEXT_DOUBAO_CHAT_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3/chat/completions

# Gemini
NEXT_PUBLIC_GEMINI_API_KEY=...
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.5-flash

# OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=...
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o-mini

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 数据库

在 Supabase 项目中执行 `supabase/migrations/001_initial_schema.sql`：

- `user_profiles`：用户资料（id 关联 auth.users）
- `travel_memories`：旅行记忆（user_id 可空为 Demo 数据）
- RLS 已配置：用户仅能读写自己的 profile 与 memories

## 开发与构建

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
npm run start
```

## 架构要点

- **鉴权**：`AuthProvider` + `useAuth` / `useOptionalAuth`，Supabase Auth 持久化 Session
- **数据**：未登录用内置 Demo 列表；登录后从 `travel_memories` 拉取并组装轮播（start + memories×3 + end）
- **本地/云端**：当前为「云端为主」；如需离线优先，可在此基础上加 IndexedDB 与同步队列（参考 infinite-craft-game 的 hybrid-storage）
