# Orbit Journey 部署说明（大白话版）

## 一、部署前要搞定的两件事

### 1. 数据库（Supabase）

- 去 [supabase.com](https://supabase.com) 建一个项目，记下 **Project URL** 和 **anon key**（在 Settings → API 里）。
- 在 Supabase 里把表建好：打开 **SQL Editor**，把项目里 `supabase/migrations/00000000000000_initial_schema.sql` 这个文件的**全部内容**复制进去，点运行。这样就会创建 `user_profiles`、`travel_memories` 两张表以及权限（RLS）。
- 如果要支持图片/音频/视频上传：在 Supabase 里打开 **Storage**，新建一个桶，名字必须是 **`memories`**，并勾选「公开」（Public），这样前端拿到的链接才能直接访问。

### 2. 环境变量

在你要部署的平台（比如 Vercel）里配置这些变量：

| 变量名 | 必填吗 | 说明 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 要上线登录和同步就必填 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | Supabase 的 anon 公钥 |
| `NEXT_PUBLIC_ENABLE_MOCK_AUTH` | 生产别开 | 留空或 `false`，否则不会用真实 Supabase 登录 |
| `NEXT_PUBLIC_ENABLE_DEMO_DATA` | 可选 | 只有做演示站时才设成 `true` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 可选 | 编辑器里选地点用（建议在 Google Cloud 限制 referrer） |
| `GEMINI_API_KEY`、`OPENAI_API_KEY` 等 | 可选 | **仅服务端**，AI 功能（剧本、转录、地点信息、图片/TTS 等）；见下方安全说明 |
| `GCS_BUCKET`、`GCS_SERVICE_ACCOUNT_JSON` | 可选 | 仅服务端，不用 Supabase 存文件时用 GCS 上传媒体 |

**安全说明**：  
- **不要**把 API 密钥放在 `NEXT_PUBLIC_*` 里。`NEXT_PUBLIC_*` 会打进前端代码，任何人打开网页都能看到。  
- AI 密钥请用**仅服务端**变量：`GEMINI_API_KEY`、`OPENAI_API_KEY`、`DOUBAO_API_KEY` 等（无 `NEXT_PUBLIC_` 前缀）。  
- Supabase 的 URL 和 anon key 设计上可公开，靠 RLS 和 Auth 做安全；其他密钥一律只放在服务端。  
- 完整变量列表与说明见项目根目录 `.env.example`。

**大白话**：  
- 想用**真实登录 + 数据同步**：必须配好 Supabase 两个变量，并且**不要**开 Mock Auth。  
- 想用**图片/音频/视频上传**：要么在 Supabase 建好 `memories` 公开桶，要么配 GCS。  
- **AI 功能**：在部署平台配置 `GEMINI_API_KEY`（或 `OPENAI_API_KEY` 等），不要配成 `NEXT_PUBLIC_GEMINI_API_KEY`。

---

## 二、怎么部署

### 方式 A：用 Vercel（推荐）

1. 代码推到 GitHub。
2. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录，点「Import」把你的仓库导进来。
3. 在项目里打开 **Settings → Environment Variables**，把上面那些变量一条条加进去（Production 环境记得加）。
4. 点 **Deploy**（或推送代码自动部署）。等构建跑完，用「Visit」打开网址即可。

### 方式 B：自己服务器或别的平台

1. 在机器上装好 Node 20，拉代码，执行：
   ```bash
   npm install
   npm run build
   npm run start
   ```
2. 默认端口是 3000；如需改端口可设环境变量 `PORT=3000`（改成你要的端口）。
3. 环境变量在平台或 `.env` 里配好，同样**不要**在生产开 `NEXT_PUBLIC_ENABLE_MOCK_AUTH`。

### 方式 C：部署到 Cloudflare（Workers / Pages）

当前推荐用 **OpenNext for Cloudflare**（`@opennextjs/cloudflare`）把 Next.js 跑在 Cloudflare Workers 上，而不是已弃用的 `next-on-pages`。

#### 1. 安装依赖

```bash
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
```

需要 **Wrangler 3.99.0 及以上**。

#### 2. 新建 Wrangler 配置

在项目根目录创建 `wrangler.jsonc`（或 `wrangler.toml`），例如：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "orbit-journey",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "orbit-journey"
    }
  ],
  "images": {
    "binding": "IMAGES"
  }
}
```

- `nodejs_compat` 和 `compatibility_date` 必须设置，否则 Next 在 Workers 里可能跑不起来。
- `main`、`assets` 一般不要改，除非你自定义了 OpenNext 输出目录。

#### 3. 可选：OpenNext 配置

若要使用 R2 做增量缓存等，可在根目录加 `open-next.config.ts`：

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

并在 `wrangler.jsonc` 里配置 R2 bucket 绑定（见 OpenNext 文档）。不做缓存可先省略。

#### 4. 本地预览用的环境变量

根目录创建 `.dev.vars`（不要提交到 Git）：

```
NEXTJS_ENV=development
```

本地用 Wrangler 预览时会按此加载 Next 的 `.env` 等。

#### 5. 修改 package.json 脚本

在 `package.json` 的 `scripts` 里增加或改成：

```json
"build": "next build",
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
"upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload"
```

保留 `next build` 给 OpenNext 调用即可。

#### 6. 静态资源缓存（推荐）

在 `public/_headers` 里加一行（没有就新建）：

```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```

#### 7. 环境变量

- **本地预览**：在 `.dev.vars` 或 `.env.local` 里配 Supabase、Gemini 等（与方式 A/B 相同）。
- **线上**：在 [Cloudflare Dashboard](https://dash.cloudflare.com) → 你的 Worker/Pages 项目 → **Settings → Variables and Secrets** 里添加：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 以及 `NEXT_PUBLIC_GEMINI_API_KEY`、`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 等按需配置。
- 生产环境**不要**设置 `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true`。

#### 8. 部署方式

- **命令行部署**：在项目根目录执行  
  `npm run deploy`  
  会先 `opennextjs-cloudflare build`，再发布到 Cloudflare。
- **Git 自动部署**：在 Cloudflare 里 [连接 GitHub/GitLab](https://developers.cloudflare.com/workers/ci-cd/)，构建命令填 `npm run build && opennextjs-cloudflare build`（或按 OpenNext 文档推荐的命令），输出目录用 OpenNext 生成的产物（或按文档配置）。

#### 9. 注意事项（本项目）

- **Supabase**：与方式 A/B 一样，需先在 Supabase 建好项目、表结构和 `memories` 公开桶，否则登录、同步和媒体上传会不可用。
- **Google Cloud Storage**：`/api/upload-media` 使用 `@google-cloud/storage`，在 Cloudflare Workers 的 Node 兼容层下可能有限制。部署到 Cloudflare 时建议**优先用 Supabase Storage（memories 桶）** 做图片/音视频上传；若必须用 GCS，需在 Workers 环境里实测或考虑改为通过其它服务上传。
- **不要**在源码里写 `export const runtime = 'edge'`，OpenNext for Cloudflare 目前不支持 Edge Runtime。
- 把 `.open-next` 加入 `.gitignore`，避免把构建产物提交到仓库。

更详细的 OpenNext for Cloudflare 说明、R2 缓存、图片优化等见：  
[https://opennext.js.org/cloudflare/get-started](https://opennext.js.org/cloudflare/get-started)

---

## 三、部署后检查一下

1. 打开首页，用 Supabase 账号登录（先要在 Supabase Auth 里开邮箱登录或第三方登录）。
2. 新建一条记忆，写点内容、选个类型（富文本/相册/电影感等），保存。
3. 到 Supabase 的 **Table Editor → travel_memories** 里看，应该能看到刚建的那一行，且 `type`、`editor_blocks_json` 等字段有正常数据。

如果以上都正常，说明后端可用、数据在 Supabase 里存上了。

---

## 四、数据在哪里、会不会丢

- **读数据**：前端先从浏览器里的 IndexedDB 读（本地优先），登录且配了 Supabase 时，会后台和 Supabase 同步。
- **写数据**：新建/编辑先写进 IndexedDB，再在后台推到 Supabase，所以**只要 Supabase 配好了，数据在后端是有的**。
- **未登录**：没开 Demo 时列表是空的；开了 Demo 会往本地塞示例数据，这些示例**不会**被推到 Supabase（避免权限报错）。

更细的数据流、Sync 逻辑、类型对应关系见：`docs/DEPLOYMENT_AND_DATA_ANALYSIS.md`。
