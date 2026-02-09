# 首次构建与部署 — 数据与逻辑分析

本文档基于当前代码库，对数据流、环境区分和部署前检查做了整理，便于第一次后端构建与部署。

---

## 一、架构概览

- **前端**: Next.js 14 (App Router)，客户端为主（`'use client'`）。
- **本地存储**: IndexedDB（Dexie），仅浏览器端，用于 memories 的离线优先。
- **后端/同步**: Supabase（PostgreSQL + Auth），可选；未配置时仅本地 + Demo 数据。
- **环境区分**: `environment.ts` 通过 `NODE_ENV`、`NEXT_PUBLIC_ENABLE_MOCK_AUTH`、Supabase 是否配置决定 Mock 登录、同步开关与间隔。

---

## 二、数据流与逻辑

### 2.1 数据来源与写入

| 场景 | 数据来源 | 写入位置 | 说明 |
|------|----------|----------|------|
| 未登录 | Demo 数据 | IndexedDB（`userId: null`） | `initializeDemoData()` 仅在无 demo 时执行一次 |
| 已登录 | 用户创建/编辑 | IndexedDB → 后台同步到 Supabase | Local-first，先写本地再 push |
| 已登录首次 | 空本地 | 从 Supabase `initialSync` 拉取 | `MemoryService.initialize()` 里 `count === 0` 时触发 |

### 2.2 核心路径

1. **初始化**（仅客户端）  
   - `layout.tsx` → `DatabaseProvider` → `useInitializeDatabase()`  
   - 未登录：若无 demo 数据则 `initializeDemoData()`  
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

- 数据库结构以 **Supabase 迁移** 为准：`supabase/migrations/00000000000000_initial_schema.sql`。  
- 首次部署前在 Supabase 项目里执行该迁移（Dashboard → SQL Editor 或 `supabase db push`），创建：  
  - `user_profiles`  
  - `travel_memories`（含 RLS：读本人 + demo `user_id IS NULL`，写仅本人）  
  - `updated_at` 触发器  

- 客户端使用 **anon key** 即可；RLS 已限制行级访问。服务端若需跨用户管理再考虑 `SUPABASE_SERVICE_ROLE_KEY`。

---

## 五、构建与运行

- 当前 **`npm run build` 已通过**（含 LocationPicker 使用新 API、GlobeWrapper ref 类型修复）。  
- 生产运行：`npm run start`（或部署平台的 start 命令）。  
- 所有 DB/Sync 逻辑均在浏览器执行，**服务端不访问 IndexedDB 或 getDB()**，不会在 SSR 报错。

---

## 六、部署前自检清单

- [ ] 在 Supabase 执行 `00000000000000_initial_schema.sql`  
- [ ] 配置 `NEXT_PUBLIC_SUPABASE_*`，生产不启用 `NEXT_PUBLIC_ENABLE_MOCK_AUTH`  
- [ ] （可选）配置 Google Maps、AI Provider 等  
- [ ] 本地执行 `npm run build` 与 `npm run start` 做一次冒烟测试  
- [ ] 部署后验证：登录 → 新建记忆 → 刷新/换设备，确认 Supabase 中能看到对应行且 RLS 正常  

---

## 七、类型与存储对应

- **CarouselItem**（UI）/ **NewMemoryInput**（新建）与 **MemoryRecord**（IndexedDB）的转换在 `memory-service.ts`：`carouselItemToMemoryRecord`、`memoryRecordToCarouselItem`。  
- **MemoryRecord** 与 Supabase 表 **travel_memories** 的转换在 `sync-engine.ts`：`memoryRecordToRow`、`rowToMemoryRecord`；与 `lib/storage/types.ts` 中的 **TravelMemoryRow** 一致。  
- 地点：`LocationData`（含 name/region/country/address）→ `placeName` / `placeAddress`；若前端只传 name/region/country，`placeAddress` 可能为空，可后续在转换里用 `[name, region, country].filter(Boolean).join(', ')` 补全。

以上为当前数据与逻辑的梳理，可直接用于第一次后端构建与部署。
