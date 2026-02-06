# Supabase 数据库

当前为**单次合并迁移**，无需考虑历史数据。在全新项目中执行一次即可建表。

## 迁移文件

- `migrations/00000000000000_initial_schema.sql` — 创建 `user_profiles`、`travel_memories`、RLS、索引与 `updated_at` 触发器

## 执行方式

### 方式一：Supabase CLI（推荐）

```bash
# 安装 CLI 后登录并链接项目
npx supabase link --project-ref <your-project-ref>

# 推送迁移
npx supabase db push
```

### 方式二：Supabase Dashboard

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 选择项目 → **SQL Editor**
2. 复制 `migrations/00000000000000_initial_schema.sql` 全文
3. 粘贴并点击 **Run**

执行成功后即可在 **Table Editor** 中看到 `user_profiles` 和 `travel_memories`。

## 表结构摘要

| 表名 | 说明 |
|------|------|
| `user_profiles` | 用户资料，`id` 关联 `auth.users` |
| `travel_memories` | 旅行记忆；`user_id` 为 NULL 表示 demo 数据 |

RLS 已启用：用户只能读写自己的 profile 和 memories；`travel_memories` 可读本人 + `user_id IS NULL` 的 demo 数据。
