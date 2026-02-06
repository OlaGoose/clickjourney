# Orbit Journey Database Architecture

## 概述

这是一个基于 IndexedDB 的本地优先（Local-First）数据存储系统，使用 Dexie.js 作为 IndexedDB 的封装库。系统设计遵循最佳实践，提供离线支持、自动同步和类型安全。

## 架构层次

### 1. 核心层 (`core/`)
- **schema.ts**: 数据库 schema 定义、版本管理、Dexie 实例
- 定义 `MemoryRecord`、`SyncQueueItem`、`AppMetadata` 等核心类型
- 提供数据库实例的创建和管理

### 2. 仓库层 (`repositories/`)
- **memory-repository.ts**: 内存数据的 CRUD 操作
- 提供类型安全的数据库操作接口
- 处理软删除、版本控制、同步状态管理

### 3. 同步层 (`sync/`)
- **sync-engine.ts**: IndexedDB ↔ Supabase 双向同步
- Local-first 策略：本地优先，后台同步
- 支持增量同步、冲突检测、错误重试

### 4. 服务层 (`services/`)
- **memory-service.ts**: 业务逻辑层
- 统一的应用 API
- 处理环境差异（开发/生产、Mock/真实认证）
- 自动初始化 demo 数据

### 5. Hooks 层 (`hooks/`)
- **useMemories.ts**: React hooks 用于组件中的数据访问
- 提供响应式数据更新
- 自动处理加载状态和错误

### 6. 工具层 (`utils/`)
- **demo-data.ts**: Demo 数据初始化和管理
- **environment.ts**: 环境检测和配置
- **dev-tools.ts**: 开发工具（仅开发环境）

## 数据流

```
用户操作
  ↓
React Component (使用 useMemories hook)
  ↓
MemoryService (业务逻辑)
  ↓
MemoryRepository (数据操作)
  ↓
IndexedDB (本地存储)
  ↓
SyncEngine (后台同步)
  ↓
Supabase (远程存储)
```

## 核心特性

### 1. 本地优先（Local-First）
- 所有操作首先写入 IndexedDB
- 立即返回结果，无需等待网络
- 后台异步同步到 Supabase

### 2. 离线支持
- 完全离线可用
- 数据持久化在浏览器中
- 网络恢复后自动同步

### 3. 自动同步
- 后台自动同步（默认 30 秒间隔）
- 支持手动触发同步
- 同步状态追踪

### 4. 冲突处理
- 版本号机制检测冲突
- 本地优先策略
- 冲突记录标记供用户处理

### 5. 环境适配
- **开发环境**: Mock 认证时禁用同步，使用本地数据
- **生产环境**: 启用自动同步，连接 Supabase

## 使用方法

### 在组件中使用

```tsx
import { useMemories } from '@/lib/db';

function MyComponent() {
  const { memories, isLoading, createMemory, sync } = useMemories();
  
  const handleCreate = async () => {
    const result = await createMemory({
      title: 'New Memory',
      subtitle: 'Memory',
      image: 'https://...',
      color: 'rgb(44, 62, 80)',
      chord: [220, 261.63, 329.63],
    });
    
    if (result.error) {
      console.error(result.error);
    }
  };
  
  return (
    <div>
      {isLoading ? 'Loading...' : memories.map(m => <div key={m.id}>{m.title}</div>)}
      <button onClick={handleCreate}>Create</button>
      <button onClick={sync}>Sync</button>
    </div>
  );
}
```

### 直接使用 Service

```tsx
import { MemoryService } from '@/lib/db';

// 创建记忆
const result = await MemoryService.createMemory(userId, memoryData);

// 获取记忆列表
const memories = await MemoryService.listMemories(userId);

// 手动同步
const syncResult = await MemoryService.sync(userId);
```

### 开发工具（仅开发环境）

在浏览器控制台中：

```javascript
// 查看所有工具
window.orbitDB

// 查看数据
await orbitDB.utils.list()

// 初始化 demo 数据
await orbitDB.initDemo()

// 查看同步状态
await orbitDB.sync.status()

// 导出数据
const data = await orbitDB.utils.export()

// 导入数据
await orbitDB.utils.import(data)
```

## 数据库 Schema

### memories 表
- `id`: 主键
- `userId`: 用户 ID（null 表示 demo 数据）
- `title`, `subtitle`, `imageUrl`, `color`, `chord`: 基础信息
- `galleryUrls`, `audioUrls`, `videoUrls`: 媒体文件
- `richContent`: 富文本内容
- `lat`, `lng`, `placeName`, `placeAddress`: 位置信息
- `sortOrder`: 排序顺序
- `syncStatus`: 同步状态（pending/synced/conflict/error）
- `localVersion`, `remoteVersion`: 版本号（冲突检测）
- `isDeleted`: 软删除标记

### 索引
- `id`: 主键索引
- `userId`: 用户索引
- `sortOrder`: 排序索引
- `syncStatus`: 同步状态索引
- `createdAt`, `updatedAt`: 时间索引
- `[userId+isDeleted]`: 复合索引（用户查询）
- `[userId+sortOrder]`: 复合索引（排序查询）

## 同步策略

### Pull（从 Supabase 拉取）
1. 检查上次同步时间
2. 只拉取更新的记录
3. 与本地数据合并（保留本地待同步更改）
4. 检测冲突

### Push（推送到 Supabase）
1. 查找所有 `syncStatus === 'pending'` 的记录
2. 批量推送到 Supabase
3. 更新同步状态
4. 处理错误和重试

### 冲突解决
- 如果本地有 pending 更改，保留本地版本
- 如果远程更新，标记为 conflict
- 用户可以通过 UI 手动解决冲突

## 环境配置

### 开发环境
- Mock 认证时：禁用同步，纯本地存储
- 真实认证时：启用同步，30 秒间隔

### 生产环境
- 启用自动同步
- 30 秒同步间隔
- 5 次重试，3 秒延迟

## 最佳实践

1. **始终使用 Service 层**：不要直接访问 Repository
2. **使用 Hooks**：在 React 组件中使用 `useMemories`
3. **错误处理**：检查返回的 `error` 字段
4. **同步状态**：监控 `syncStatus` 了解数据状态
5. **离线优先**：设计 UI 时考虑离线场景

## 性能优化

- 使用索引加速查询
- 批量操作使用事务
- 增量同步减少数据传输
- 本地缓存减少网络请求

## 故障排除

### 数据不同步
1. 检查 Supabase 配置
2. 查看 `syncStatus` 状态
3. 手动触发同步：`await MemoryService.sync(userId)`

### 数据丢失
1. 检查 IndexedDB 是否被清除
2. 查看浏览器存储限制
3. 检查是否有错误日志

### 性能问题
1. 使用开发工具检查数据量
2. 清理旧数据
3. 优化查询索引

## 未来改进

- [ ] 数据压缩
- [ ] 加密支持
- [ ] 更智能的冲突解决
- [ ] 增量备份
- [ ] 数据导出/导入 UI
