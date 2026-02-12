# 首次构建与部署 — 数据与逻辑分析

本文档基于当前代码库，对数据流、环境区分和部署前检查做了整理，便于第一次后端构建与部署。

---

## 一、架构概览

- **前端**: Next.js 14 (App Router)，客户端为主（`'use client'`）。
- **本地存储**: IndexedDB（Dexie），仅浏览器端，用于 memories 的离线优先。
- **后端/同步**: Supabase（PostgreSQL + Auth），可选；未配置时仅本地；Demo 数据仅开发或显式开启时注入。
- **环境区分**: `environment.ts` 通过 `NODE_ENV`、`NEXT_PUBLIC_ENABLE_MOCK_AUTH`、`NEXT_PUBLIC_ENABLE_DEMO_DATA`、Supabase 是否配置决定 Mock 登录、Demo 数据、同步开关与间隔。

---

## 二、数据流与逻辑

### 2.1 数据来源与写入

| 场景 | 数据来源 | 写入位置 | 说明 |
|------|----------|----------|------|
| 未登录且 Demo 开启 | Demo 数据 | IndexedDB（`userId: null`） | 仅当 `isDemoDataEnabled()`（开发或 `NEXT_PUBLIC_ENABLE_DEMO_DATA=true`）且无 demo 时执行一次 |
| 未登录且 Demo 关闭 | 空 | IndexedDB 空 | 生产默认不注入 Demo，首页仅显示 start/end 卡片 |
| 已登录 | 用户创建/编辑 | IndexedDB → 后台同步到 Supabase | Local-first，先写本地再 push |
| 已登录首次 | 空本地 | 从 Supabase `initialSync` 拉取 | `MemoryService.initialize()` 里 `count === 0` 时触发 |

### 2.2 核心路径

1. **初始化**（仅客户端）  
   - `layout.tsx` → `DatabaseProvider` → `useInitializeDatabase()`  
   - 未登录且 Demo 开启：若无 demo 数据则 `initializeDemoData()`  
   - 已登录：`MemoryService.initialize(userId)` → 视情况 `initialSync` 或 `sync`，并启动定时 sync  

2. **首页列表**  
   - `getCarouselItems(userId)` → `fetchMemoriesForUser` → `MemoryService.listMemories(userId)`  
   - 读的是 IndexedDB，不直接读 Supabase  

3. **新建记忆**（`/memories/editor`）  
   - `saveMemory(userId, memory)` → `MemoryService.createMemory()` → `MemoryRepository.create()` 写 IndexedDB  
   - 若有 Supabase 且非 Mock：`SyncEngine.push()` 在后台把 pending 推到 Supabase  

4. **同步**  
   - **Push**：只推送 `userId != null` 的 pending 记录（demo 数据 `userId: null` 不会推送，避免 RLS 报错）。  
   - **Pull**：按 `userId` 拉取自己的数据 + `user_id IS NULL` 的 demo；增量用 `lastPullSync`。  

### 2.3 已做修复（与部署相关）

- **SyncEngine.push()**：在取 `getPendingSync()` 后过滤掉 `userId === null` 的记录，只推送当前用户的数据，避免把本地 demo 推到 Supabase 触发 RLS 错误。

---

## 三、环境变量与配置

### 3.1 部署必配（生产）

在部署平台（Vercel / 自建等）配置：

```bash
# Supabase（若要用真实登录与同步）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# 生产务必关闭 Mock 登录
NEXT_PUBLIC_ENABLE_MOCK_AUTH=  # 留空或 false
# 生产默认不注入 Demo 数据；仅演示站需要时可设 true
# NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

### 3.2 可选

```bash
# 地图选点（创建记忆时的地点）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# 地点信息 AI（/api/location-info）
NEXT_PUBLIC_AI_PROVIDER=auto
NEXT_PUBLIC_GEMINI_API_KEY=...   # 或 NEXT_DOUBAO_* / NEXT_PUBLIC_OPENAI_*
```

### 3.3 行为小结

- `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true`：仅开发/预览，用 Mock 登录，**不同步** Supabase。  
- 生产应不设或设为 `false`，并配置 Supabase，这样登录与同步才生效。

---

## 四、Supabase 与迁移

- 数据库结构以 **单文件迁移** 为准：`supabase/migrations/00000000000000_initial_schema.sql`。  
  该文件创建：`user_profiles`、`travel_memories`（含 `type`、`editor_blocks_json`）、RLS、索引、`updated_at` 触发器。  
- 首次部署前在 Supabase 项目里执行该迁移（Dashboard → SQL Editor 粘贴运行，或 `supabase db push`）。  
- 客户端使用 **anon key** 即可；RLS 已限制行级访问。服务端若需跨用户管理再考虑 `SUPABASE_SERVICE_ROLE_KEY`。

### 4.1 Supabase Storage（图片/音频上传）

- 编辑器中图片、音频、视频会优先上传到 **Supabase Storage**（配置了 Supabase 时），否则回退为 base64 存入 `editor_blocks_json`。  
- 部署后需在 Supabase Dashboard → **Storage** 中新建一个 **公开** 存储桶，名称设为 **`memories`**（与 `lib/upload-media.ts` 中 `STORAGE_BUCKET` 一致）。  
- 新建桶时勾选 **Public bucket**，以便前端通过 `getPublicUrl()` 得到的 URL 可直接访问。  
- （可选）在 Storage → Policies 中为该桶配置：允许已登录用户 `INSERT`、允许所有人 `SELECT`，以限制上传仅限登录用户。

### 4.2 Google Cloud Storage（可选，图片/音频/视频）

- 若希望使用 **Google Cloud Storage** 存储媒体文件（或作为 Supabase 的备选），可配置服务端上传。  
- **上传顺序**：编辑器会先尝试 Supabase Storage，失败或未配置时再调用 `POST /api/upload-media` 上传到 GCS，最后才回退为 base64。  
- **环境变量**（仅服务端，部署平台配置）：  
  - `GCS_BUCKET`：GCS 桶名称（需预先在 Google Cloud Console 创建，并设为可公开读或对对象执行 `makePublic`）。  
  - `GCS_SERVICE_ACCOUNT_JSON`：服务账号密钥的完整 JSON 字符串（可从 GCP Console → IAM → 服务账号 → 创建密钥 获取）。  
- **权限**：该服务账号需对上述桶具备 **Storage Object Creator**（或 **Storage Admin**），且桶允许对对象设置公开读（上传后接口会调用 `makePublic()`，访问形式为 `https://storage.googleapis.com/<bucket>/<path>`）。  
- 不配置 GCS 时，接口返回 503，前端自动使用 Supabase 或 base64，无需修改前端逻辑。

---

## 五、构建与运行

- 当前 **`npm run build` 已通过**（含 LocationPicker 使用新 API、GlobeWrapper ref 类型修复）。  
- 生产运行：`npm run start`（或部署平台的 start 命令）。  
- 所有 DB/Sync 逻辑均在浏览器执行，**服务端不访问 IndexedDB 或 getDB()**，不会在 SSR 报错。

---

## 六、部署前自检清单

- [ ] 在 Supabase 执行 `supabase/migrations/00000000000000_initial_schema.sql`（单文件即包含全部表与列）  
- [ ] 配置 `NEXT_PUBLIC_SUPABASE_*`，生产不启用 `NEXT_PUBLIC_ENABLE_MOCK_AUTH`  
- [ ] 生产不设 `NEXT_PUBLIC_ENABLE_DEMO_DATA`（或留空），仅演示站需要时设为 `true`  
- [ ] （可选）配置 Google Maps、AI Provider、**Google Cloud Storage**（`GCS_BUCKET` + `GCS_SERVICE_ACCOUNT_JSON`）等  
- [ ] 本地执行 `npm run build` 与 `npm run start` 做一次冒烟测试  
- [ ] 部署后验证：登录 → 新建记忆（含富文本/editor blocks）→ 在 Supabase Table Editor 确认 `travel_memories` 有对应行且 `type`/`editor_blocks_json`、RLS 正常  

---

## 七、类型与存储对应

- **CarouselItem**（UI）/ **NewMemoryInput**（新建）与 **MemoryRecord**（IndexedDB）的转换在 `memory-service.ts`：`carouselItemToMemoryRecord`、`memoryRecordToCarouselItem`。  
- **MemoryRecord** 与 Supabase 表 **travel_memories** 的转换在 `sync-engine.ts`：`memoryRecordToRow`、`rowToMemoryRecord`；与 `lib/storage/types.ts` 中的 **TravelMemoryRow** 一致。字段对应：`type` ↔ `type`，`editorBlocksJson` ↔ `editor_blocks_json`。  
- 地点：`LocationData`（含 name/region/country/address）→ `placeName` / `placeAddress`；若前端只传 name/region/country，`placeAddress` 可能为空，可后续在转换里用 `[name, region, country].filter(Boolean).join(', ')` 补全。

以上为当前数据与逻辑的梳理，可直接用于第一次后端构建与部署。

---

## 八、如何部署

### 8.1 部署前准备

1. **Supabase 项目**
   - 在 [Supabase](https://supabase.com) 创建项目，记下 **Project URL** 和 **anon public** key。
   - 在 Supabase Dashboard → **SQL Editor** 中执行 `supabase/migrations/00000000000000_initial_schema.sql` 的完整内容。  
   - 或使用 CLI：在项目根目录执行 `npx supabase db push`（需先 `npx supabase link` 关联项目）。

2. **环境变量**
   - 复制 `.env.example` 为 `.env.local`（本地）或在部署平台配置环境变量（见下）。

### 8.2 部署到 Vercel（推荐）

1. 将代码推送到 GitHub，在 [Vercel](https://vercel.com) 导入该仓库。
2. 在 Vercel 项目 **Settings → Environment Variables** 中配置：

   | 变量名 | 说明 | 生产必填 |
   |--------|------|----------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 是（若用真实登录与同步） |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 是（同上） |
   | `NEXT_PUBLIC_ENABLE_MOCK_AUTH` | 留空或 `false` | 生产务必不启用 |
   | `NEXT_PUBLIC_ENABLE_DEMO_DATA` | 仅演示站可设 `true` | 可选 |
   | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 地图选点 | 可选 |
   | `NEXT_PUBLIC_GEMINI_API_KEY` 等 | AI 能力 | 可选 |
   | `GCS_BUCKET` | Google Cloud Storage 桶名（媒体上传） | 可选 |
   | `GCS_SERVICE_ACCOUNT_JSON` | GCS 服务账号 JSON 字符串 | 可选（与 GCS_BUCKET 配套） |

3. 部署：Vercel 会自动执行 `npm install` 与 `next build`（见 `vercel.json`）。部署完成后用 **Visit** 打开站点验证。

### 8.3 自建 / 其他平台部署

- **构建**：`npm run build`
- **启动**：`npm run start`（默认端口 3000，可用 `PORT=3000` 覆盖）
- **Node**：建议 Node 20.x（见 `package.json` engines）。
- 环境变量与上表一致；确保生产不设 `NEXT_PUBLIC_ENABLE_MOCK_AUTH`。

### 8.4 部署后验证

- 打开首页，登录（Supabase Auth）。
- 新建一条记忆（含富文本 / editor blocks），保存后刷新或换设备，在 Supabase **Table Editor → travel_memories** 中确认该行存在，且 `type`、`editor_blocks_json` 有值、RLS 正常。
