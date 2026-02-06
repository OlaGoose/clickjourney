# 数据存储系统迁移指南

## 概述

本次重构将数据存储从直接使用 Supabase 迁移到基于 IndexedDB 的本地优先架构。

## 主要变化

### 之前（旧架构）
- 直接查询 Supabase
- 无离线支持
- 每次操作都需要网络请求
- Demo 数据硬编码在代码中

### 现在（新架构）
- IndexedDB 作为主存储
- 完全离线支持
- 本地优先，后台同步
- Demo 数据存储在 IndexedDB

## 代码变更

### 1. 应用入口（已完成）

**文件**: `src/app/layout.tsx`

```tsx
// 添加了 DatabaseProvider
import { DatabaseProvider } from '@/lib/db/init';

<AuthProvider>
  <DatabaseProvider>{children}</DatabaseProvider>
</AuthProvider>
```

### 2. 存储 API（向后兼容）

**文件**: `src/lib/storage/memory-storage.ts`

API 保持不变，但内部实现已切换到 IndexedDB：

```tsx
// 这些函数仍然可用，行为相同
import { getCarouselItems, saveMemory } from '@/lib/storage';

// 自动使用 IndexedDB + 后台同步
const items = await getCarouselItems(userId);
await saveMemory(userId, memoryData);
```

### 3. 新 API（推荐使用）

**文件**: `src/lib/db/hooks/useMemories.ts`

```tsx
import { useMemories } from '@/lib/db';

function MyComponent() {
  const { memories, isLoading, createMemory, sync } = useMemories();
  // ...
}
```

## 数据迁移

### 自动迁移
- 首次访问时，如果用户已登录，会自动从 Supabase 拉取数据到 IndexedDB
- Demo 数据会在首次访问时自动初始化

### 手动迁移（如果需要）

```typescript
import { SyncEngine } from '@/lib/db';

// 强制全量同步
await SyncEngine.initialSync(userId);
```

## 开发环境

### Mock 认证模式
- 当 `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` 时
- 禁用 Supabase 同步
- 纯本地存储，适合开发测试

### 真实认证模式
- 启用自动同步
- 30 秒同步间隔
- 连接 Supabase

## 开发工具

在开发环境中，打开浏览器控制台：

```javascript
// 查看数据库工具
window.orbitDB

// 常用操作
await orbitDB.utils.list()           // 列出所有数据
await orbitDB.initDemo()             // 初始化 demo 数据
await orbitDB.sync.status()           // 查看同步状态
await orbitDB.utils.export()          // 导出数据
await orbitDB.utils.clear()           // 清空数据
```

## 性能改进

1. **首次加载**: 从 IndexedDB 读取，几乎瞬间完成
2. **离线使用**: 完全可用，无需网络
3. **后台同步**: 不阻塞用户操作
4. **增量同步**: 只同步变更的数据

## 注意事项

1. **数据持久化**: 数据存储在浏览器 IndexedDB 中，清除浏览器数据会丢失本地数据
2. **同步延迟**: 后台同步有延迟（默认 30 秒），手动调用 `sync()` 可立即同步
3. **冲突处理**: 本地优先策略，冲突时保留本地版本
4. **存储限制**: IndexedDB 有存储限制（通常几 GB），但足够使用

## 故障排除

### 数据不同步
```typescript
import { MemoryService } from '@/lib/db';

// 检查同步状态
const status = await MemoryService.getSyncStatus();
console.log(status);

// 手动触发同步
await MemoryService.sync(userId);
```

### 清除所有数据
```typescript
import { deleteDB } from '@/lib/db';

// 删除整个数据库（谨慎使用）
await deleteDB();
```

### 重置 demo 数据
```typescript
import { clearDemoData, initializeDemoData } from '@/lib/db';

await clearDemoData();
await initializeDemoData();
```

## 测试

### 单元测试
```typescript
import { MemoryRepository } from '@/lib/db';

// 测试 CRUD 操作
const memory = await MemoryRepository.create({...});
const list = await MemoryRepository.list();
```

### 集成测试
```typescript
import { MemoryService } from '@/lib/db';

// 测试完整流程
const result = await MemoryService.createMemory(userId, data);
const memories = await MemoryService.listMemories(userId);
```

## 下一步

1. ✅ 核心架构已完成
2. ✅ API 向后兼容
3. ✅ 开发工具已集成
4. 🔄 监控和日志（可选）
5. 🔄 UI 显示同步状态（可选）
6. 🔄 冲突解决 UI（可选）

## 支持

如有问题，请查看：
- `src/lib/db/README.md` - 完整架构文档
- 浏览器控制台 - 开发工具和日志
- 代码注释 - 详细的实现说明
