# 🐛 错误处理系统完整指南

**功能**: 全面的错误追踪和处理系统  
**状态**: ✅ 已完成  
**时间**: 2 天开发

---

## 🎉 功能完成

### ✅ 已实现的功能

#### 错误追踪
- ✅ Sentry 集成（客户端 + 服务端 + Edge）
- ✅ 自动错误捕获
- ✅ 错误上下文和用户信息
- ✅ 性能监控
- ✅ Session Replay

#### 错误处理
- ✅ 全局 Error Boundary
- ✅ 自定义错误类型
- ✅ 友好的错误消息
- ✅ Toast 通知系统
- ✅ 错误恢复机制

#### 用户体验
- ✅ 友好的错误页面
- ✅ 重试按钮
- ✅ 返回首页按钮
- ✅ 开发环境详细信息

---

## 📁 文件清单

### Sentry 配置
- `sentry.client.config.ts` - 客户端配置
- `sentry.server.config.ts` - 服务端配置
- `sentry.edge.config.ts` - Edge 配置

### 错误处理
- `lib/errors.ts` - 自定义错误类型和工具函数
- `lib/toast.ts` - Toast 通知工具函数

### UI 组件
- `components/error-boundary.tsx` - 改进的错误边界
- `components/toast-provider.tsx` - Toast 提供者

---

## 🚀 如何使用

### 1. 配置 Sentry

#### 1.1 创建 Sentry 账户

1. 访问 https://sentry.io
2. 注册免费账户
3. 创建新项目
4. 选择 **Next.js**
5. 获取 DSN

#### 1.2 添加环境变量

在 `.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=your-dsn-here
```

在 Vercel:
- 添加 `NEXT_PUBLIC_SENTRY_DSN`
- 选择所有环境（Production, Preview, Development）

---

### 2. 集成 Toast Provider

在 `app/layout.tsx` 添加:

```typescript
import { ToastProvider } from '@/components/toast-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <ToastProvider />
      </body>
    </html>
  )
}
```

---

### 3. 使用自定义错误类型

```typescript
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from '@/lib/errors'

// 验证错误
if (!email) {
  throw new ValidationError('Email is required', 'email')
}

// 认证错误
if (!user) {
  throw new AuthenticationError('Please log in to continue')
}

// 未找到错误
if (!item) {
  throw new NotFoundError('Item not found')
}
```

---

### 4. 使用 Toast 通知

```typescript
import { showSuccess, showError, showPromiseToast } from '@/lib/toast'

// 成功通知
showSuccess('Report created successfully!')

// 错误通知
try {
  await someAsyncFunction()
} catch (error) {
  showError(error) // 自动显示友好消息
}

// Promise toast
await showPromiseToast(
  createReport(data),
  {
    loading: 'Creating report...',
    success: 'Report created!',
    error: 'Failed to create report',
  }
)
```

---

### 5. 手动报告错误到 Sentry

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // 代码
} catch (error) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      feature: 'reports',
      action: 'create',
    },
    extra: {
      reportId: '123',
      userId: user.id,
    },
  })

  showError(error)
}
```

---

## 📊 错误类型

### 自定义错误类

```typescript
// ValidationError - 验证错误 (400)
throw new ValidationError('Invalid email format', 'email')

// AuthenticationError - 认证错误 (401)
throw new AuthenticationError('Session expired')

// AuthorizationError - 授权错误 (403)
throw new AuthorizationError('Cannot access this resource')

// NotFoundError - 未找到 (404)
throw new NotFoundError('User not found')

// ConflictError - 冲突 (409)
throw new ConflictError('Email already exists')

// RateLimitError - 限流 (429)
throw new RateLimitError('Too many attempts')

// NetworkError - 网络错误
throw new NetworkError('Connection failed')

// AppError - 通用应用错误
throw new AppError('Something went wrong', 'CUSTOM_CODE', 500)
```

---

## 🎨 Toast 通知示例

### 基础用法

```typescript
import { 
  showSuccess, 
  showError, 
  showInfo, 
  showWarning 
} from '@/lib/toast'

// 成功
showSuccess('Settings saved!')

// 错误
showError(new Error('Failed to save'))

// 信息
showInfo('New match found')

// 警告
showWarning('Your session will expire soon')
```

### 加载状态

```typescript
import { showLoading, dismissToast } from '@/lib/toast'

const toastId = showLoading('Uploading image...')

try {
  await uploadImage(file)
  dismissToast(toastId)
  showSuccess('Image uploaded!')
} catch (error) {
  dismissToast(toastId)
  showError(error)
}
```

### Promise Toast

```typescript
import { showPromiseToast } from '@/lib/toast'

// 自动处理 loading -> success/error
const result = await showPromiseToast(
  sendMessage(conversationId, message),
  {
    loading: 'Sending message...',
    success: 'Message sent!',
    error: 'Failed to send message',
  }
)
```

---

## 🛡️ Error Boundary

### 默认行为

Error Boundary 会自动捕获所有子组件的错误：

- 显示友好的错误页面
- 提供"重试"和"返回首页"按钮
- 在开发环境显示详细错误信息
- 自动报告错误到 Sentry

### 自定义 Fallback

```typescript
import { ErrorBoundary } from '@/components/error-boundary'

<ErrorBoundary
  fallback={
    <div className="p-4 text-center">
      <h2>Oops! Something went wrong</h2>
      <button onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

---

## 📊 Sentry 功能

### 错误追踪

Sentry 自动捕获：
- ✅ 未捕获的异常
- ✅ Promise rejections
- ✅ React 组件错误
- ✅ API 错误

### 性能监控

```typescript
import * as Sentry from '@sentry/nextjs'

// 自定义 transaction
const transaction = Sentry.startTransaction({
  name: 'Upload Image',
  op: 'upload',
})

try {
  await uploadImage(file)
  transaction.setStatus('ok')
} catch (error) {
  transaction.setStatus('error')
  throw error
} finally {
  transaction.finish()
}
```

### 用户上下文

```typescript
import * as Sentry from '@sentry/nextjs'

// 设置用户信息
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
})

// 清除用户信息（登出时）
Sentry.setUser(null)
```

### 自定义标签

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.setTag('feature', 'messaging')
Sentry.setTag('environment', 'production')
```

---

## 🔍 过滤错误

Sentry 配置已过滤常见无用错误：

- ✅ 浏览器扩展错误
- ✅ ResizeObserver 错误
- ✅ 网络错误（部分）
- ✅ AbortController 错误
- ✅ 开发环境错误（仅记录到控制台）

---

## 📈 错误监控最佳实践

### 1. 始终使用 try-catch

```typescript
// ❌ 不好
async function createReport(data) {
  const result = await api.create(data)
  return result
}

// ✅ 好
async function createReport(data) {
  try {
    const result = await api.create(data)
    showSuccess('Report created!')
    return result
  } catch (error) {
    showError(error)
    Sentry.captureException(error)
    throw error
  }
}
```

### 2. 提供上下文

```typescript
try {
  await updateProfile(userId, data)
} catch (error) {
  Sentry.captureException(error, {
    extra: {
      userId,
      attemptedData: data,
    },
  })
  showError(error)
}
```

### 3. 使用自定义错误类型

```typescript
// ❌ 不好
throw new Error('Invalid input')

// ✅ 好
throw new ValidationError('Email format is invalid', 'email')
```

### 4. 友好的错误消息

```typescript
// ❌ 不好
catch (error) {
  alert(error.message) // 可能显示技术性消息
}

// ✅ 好
catch (error) {
  showError(error) // 自动转换为友好消息
}
```

---

## 🧪 测试错误处理

### 测试 Error Boundary

创建一个会抛出错误的组件：

```typescript
function ErrorTest() {
  throw new Error('Test error!')
  return <div>This will not render</div>
}

// 在页面中使用
<ErrorBoundary>
  <ErrorTest />
</ErrorBoundary>
```

### 测试 Sentry

```typescript
import * as Sentry from '@sentry/nextjs'

function TestSentry() {
  const triggerError = () => {
    try {
      throw new Error('Test Sentry error')
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  return (
    <button onClick={triggerError}>
      Trigger Test Error
    </button>
  )
}
```

### 测试 Toast

```typescript
import { showSuccess, showError, showPromiseToast } from '@/lib/toast'

function TestToast() {
  return (
    <div className="space-y-2">
      <button onClick={() => showSuccess('Success!')}>
        Test Success
      </button>
      <button onClick={() => showError(new Error('Error!'))}>
        Test Error
      </button>
      <button onClick={() => 
        showPromiseToast(
          new Promise((resolve) => setTimeout(resolve, 2000)),
          { loading: 'Loading...', success: 'Done!' }
        )
      }>
        Test Promise
      </button>
    </div>
  )
}
```

---

## 💰 Sentry 成本

### 免费层
- ✅ 5,000 错误/月
- ✅ 10,000 Performance Units/月
- ✅ 1 个用户
- ✅ 30 天数据保留

### 对于早期项目
免费层完全足够！

### 升级时机
当每月错误超过 5,000 时考虑升级

---

## ✅ 完成检查清单

### Sentry 配置
- [x] 安装 @sentry/nextjs
- [x] 创建 Sentry 配置文件
- [x] 配置客户端、服务端、Edge
- [ ] 获取 Sentry DSN
- [ ] 添加环境变量

### 错误处理
- [x] 创建自定义错误类型
- [x] 更新 Error Boundary
- [x] 添加友好错误消息
- [x] 创建错误工具函数

### Toast 系统
- [x] 安装 sonner
- [x] 创建 ToastProvider
- [x] 创建 toast 工具函数
- [ ] 集成到 app/layout.tsx

### 测试
- [ ] 测试 Error Boundary
- [ ] 测试 Sentry 错误捕获
- [ ] 测试 Toast 通知
- [ ] 测试友好错误消息

---

## 🎯 集成步骤总结

1. **获取 Sentry DSN** (5分钟)
   - 访问 sentry.io
   - 创建账户和项目
   - 复制 DSN

2. **添加环境变量** (2分钟)
   - `.env.local` 添加 DSN
   - Vercel 添加环境变量

3. **集成 ToastProvider** (5分钟)
   - 在 `app/layout.tsx` 添加 `<ToastProvider />`

4. **测试** (10分钟)
   - 触发测试错误
   - 验证 Sentry 捕获
   - 验证 Toast 显示

5. **部署** (5分钟)
   - 提交代码
   - 推送到 GitHub
   - Vercel 自动部署

**总时间**: ~30分钟

---

**错误处理系统已准备就绪！** 🎉

现在您的应用有了全面的错误追踪和友好的错误处理。
