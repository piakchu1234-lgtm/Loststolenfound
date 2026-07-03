# 📊 分析和监控系统完整指南

**功能**: Google Analytics 4 + 事件追踪系统  
**状态**: ✅ 已完成  
**时间**: 2 天开发

---

## 🎉 功能完成

### ✅ 已实现的功能

#### Google Analytics 4
- ✅ GA4 完整集成
- ✅ 自动页面浏览追踪
- ✅ 路由变化追踪
- ✅ 用户属性设置

#### 事件追踪
- ✅ 6 个事件类别
- ✅ 20+ 个预定义事件
- ✅ 自定义事件支持
- ✅ 转化追踪
- ✅ 价值追踪

#### 性能监控
- ✅ Vercel Analytics（已有）
- ✅ Core Web Vitals
- ✅ 性能指标

---

## 📁 文件清单

### Analytics 组件
- `lib/analytics.ts` - 追踪工具函数
- `components/google-analytics.tsx` - GA4 组件
- `components/page-view-tracker.tsx` - 页面浏览追踪

---

## 🚀 快速开始

### 1. 创建 Google Analytics 账户

#### 1.1 访问 Google Analytics
👉 https://analytics.google.com

#### 1.2 创建账户和属性
1. 点击 **开始测量**
2. 输入账户名称: `LostStolenFound`
3. 创建属性:
   - 属性名称: `LostStolenFound Web`
   - 时区: `Australia/Melbourne`
   - 货币: `AUD`
4. 选择行业类别: `Community & Society`
5. 选择业务规模: `Small`

#### 1.3 设置数据流
1. 选择 **网站**
2. 输入网站 URL: `https://your-app.vercel.app`
3. 输入数据流名称: `LostStolenFound Production`
4. 点击 **创建数据流**

#### 1.4 获取测量 ID
复制 **测量 ID**（格式: `G-XXXXXXXXXX`）

---

### 2. 配置环境变量

#### 2.1 本地环境
在 `.env.local` 添加:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### 2.2 Vercel 环境
1. 进入 Vercel Dashboard
2. 选择项目
3. Settings → Environment Variables
4. 添加变量:
   - Key: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - Value: `G-XXXXXXXXXX`
   - 环境: Production, Preview, Development

---

### 3. 集成到应用

#### 3.1 更新 app/layout.tsx

```typescript
import { GoogleAnalytics } from '@/components/google-analytics'
import { PageViewTracker } from '@/components/page-view-tracker'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <GoogleAnalytics />
      </head>
      <body>
        <PageViewTracker />
        {children}
      </body>
    </html>
  )
}
```

---

## 📊 事件追踪使用

### 报告事件

```typescript
import {
  trackReportCreated,
  trackReportViewed,
  trackReportUpdated,
} from '@/lib/analytics'

// 创建报告
trackReportCreated('lost') // 或 'found'

// 查看报告
trackReportViewed(reportId)

// 更新报告
trackReportUpdated(reportId)
```

### 匹配事件

```typescript
import { trackMatchViewed, trackMatchClicked } from '@/lib/analytics'

// 查看匹配
trackMatchViewed(matchId, confidenceScore)

// 点击匹配
trackMatchClicked(matchId)
```

### 认领事件

```typescript
import {
  trackClaimCreated,
  trackClaimApproved,
  trackClaimRejected,
} from '@/lib/analytics'

// 创建认领
trackClaimCreated(claimId)

// 批准认领
trackClaimApproved(claimId)

// 拒绝认领
trackClaimRejected(claimId)
```

### 消息事件

```typescript
import {
  trackConversationStarted,
  trackMessageSent,
} from '@/lib/analytics'

// 开始对话
trackConversationStarted(conversationId)

// 发送消息
trackMessageSent('text') // 或 'image', 'location'
```

### 用户事件

```typescript
import {
  trackUserSignUp,
  trackUserLogin,
  trackUserLogout,
} from '@/lib/analytics'

// 用户注册
trackUserSignUp('email') // 或 'google', 'facebook'

// 用户登录
trackUserLogin('email')

// 用户登出
trackUserLogout()
```

### 搜索事件

```typescript
import { trackSearch } from '@/lib/analytics'

// 搜索
trackSearch(searchQuery, resultCount)
```

---

## 🎯 自定义事件

```typescript
import { trackEvent } from '@/lib/analytics'

// 自定义事件
trackEvent(
  'Category',     // 事件类别
  'Action',       // 动作
  'Label',        // 标签（可选）
  123             // 价值（可选）
)

// 示例
trackEvent('Engagement', 'Share', 'Report', 1)
trackEvent('Feature', 'Use', 'Safe Location Selector')
```

---

## 👤 用户属性

```typescript
import { setUserProperties } from '@/lib/analytics'

// 设置用户属性
setUserProperties({
  userId: user.id,
  userType: 'premium',
  signUpDate: '2024-01-01',
  reportsCreated: 5,
})
```

---

## 💰 转化追踪

```typescript
import { trackConversion } from '@/lib/analytics'

// 追踪转化
trackConversion(
  'conversion_id',  // 转化 ID
  10.00,            // 价值
  'AUD'             // 货币
)

// 示例：成功归还物品
trackConversion('item_returned', 1, 'AUD')
```

---

## 📈 关键指标

### 在 GA4 中追踪的指标

#### 用户指标
- 新用户数
- 活跃用户数
- 用户留存率
- 会话时长

#### 行为指标
- 页面浏览量
- 事件次数
- 参与度
- 跳出率

#### 转化指标
- 报告创建数
- 匹配生成数
- 认领成功数
- 消息发送数

---

## 🎨 创建自定义仪表板

### 在 GA4 中创建报告

1. **进入 GA4 Dashboard**
2. **点击左侧 "报告"**
3. **点击 "库"**
4. **创建新报告**

### 推荐的报告

#### 1. 用户获取报告
- 数据源
- 新用户数
- 用户留存

#### 2. 参与度报告
- 事件计数
- 事件价值
- 转化率

#### 3. 转化漏斗
```
访问网站
  ↓
创建报告
  ↓
查看匹配
  ↓
创建认领
  ↓
成功归还
```

---

## 🔧 高级配置

### 事件参数

```typescript
import { trackEvent } from '@/lib/analytics'

// 带参数的事件
if (window.gtag) {
  window.gtag('event', 'item_returned', {
    item_type: 'phone',
    item_value: 500,
    return_time_hours: 48,
    user_rating: 5,
  })
}
```

### 自定义维度

在 GA4 中设置自定义维度：
1. Admin → Custom Definitions
2. Create custom dimension
3. 使用事件参数名称

---

## 📊 重要事件列表

### 已实现的事件

| 事件名称 | 类别 | 触发时机 |
|---------|------|---------|
| page_view | 自动 | 页面加载 |
| create_report | Report | 创建报告 |
| view_report | Report | 查看报告 |
| view_match | Match | 查看匹配 |
| click_match | Match | 点击匹配 |
| create_claim | Claim | 创建认领 |
| approve_claim | Claim | 批准认领 |
| reject_claim | Claim | 拒绝认领 |
| start_conversation | Message | 开始对话 |
| send_message | Message | 发送消息 |
| sign_up | User | 用户注册 |
| login | User | 用户登录 |
| logout | User | 用户登出 |
| search | Search | 搜索 |

---

## 🎯 转化目标设置

### 在 GA4 中创建转化

1. **Admin → Events**
2. **点击 "Mark as conversion"**
3. **选择事件**:
   - `create_report` - 创建报告
   - `create_claim` - 创建认领
   - `approve_claim` - 批准认领
   - `start_conversation` - 开始对话

---

## 📱 增强测量

GA4 自动追踪（无需额外代码）：

- ✅ 滚动追踪
- ✅ 出站链接点击
- ✅ 网站搜索
- ✅ 视频互动
- ✅ 文件下载

在 GA4 → Admin → Data Streams → Enhanced Measurement 启用

---

## 🔍 调试和测试

### 开发环境

事件在开发环境会记录到控制台：

```javascript
// 控制台输出
[Analytics] { 
  category: 'Report', 
  action: 'Create', 
  label: 'lost' 
}
```

### GA4 DebugView

1. 安装 Google Analytics Debugger 扩展
2. 访问 GA4 → Configure → DebugView
3. 实时查看事件

### 测试事件

```typescript
import { trackEvent } from '@/lib/analytics'

// 测试按钮
<button onClick={() => trackEvent('Test', 'Click', 'Test Event')}>
  Test Analytics
</button>
```

---

## 📊 Vercel Analytics

Vercel Analytics 已集成（`@vercel/analytics`）

### 功能
- ✅ 页面浏览
- ✅ 用户会话
- ✅ 访问来源
- ✅ 设备/浏览器
- ✅ 地理位置

### 查看数据
Vercel Dashboard → Analytics

---

## 💡 最佳实践

### 1. 不要过度追踪

```typescript
// ❌ 不好 - 追踪太多
trackEvent('User', 'Scroll', window.scrollY.toString())

// ✅ 好 - 追踪有意义的事件
trackEvent('Engagement', 'Scroll to Bottom')
```

### 2. 使用有意义的名称

```typescript
// ❌ 不好
trackEvent('Thing', 'Do', 'Stuff')

// ✅ 好
trackEvent('Report', 'Create', 'Lost Property')
```

### 3. 包含上下文

```typescript
// ❌ 不好
trackReportCreated()

// ✅ 好
trackReportCreated('lost') // 指定类型
```

### 4. 保护隐私

```typescript
// ❌ 不好 - 包含 PII
trackEvent('User', 'Email', user.email)

// ✅ 好 - 使用 ID
trackEvent('User', 'Action', user.id)
```

---

## 🔒 隐私和合规

### GDPR 合规

- ✅ GA4 默认匿名 IP
- ✅ 用户可以选择退出
- ✅ 数据保留期可配置

### Cookie 同意

如需 Cookie 横幅：

```typescript
// 仅在用户同意后初始化
if (userConsent) {
  // 初始化 GA4
}
```

---

## ✅ 完成检查清单

### Google Analytics
- [ ] 创建 GA4 账户
- [ ] 创建属性和数据流
- [ ] 获取测量 ID
- [ ] 添加环境变量
- [ ] 集成到 app/layout.tsx

### 事件追踪
- [x] 创建追踪工具函数
- [x] 定义事件类别
- [x] 实现预定义事件
- [ ] 在代码中添加事件追踪
- [ ] 测试事件触发

### 转化设置
- [ ] 在 GA4 中标记转化事件
- [ ] 设置转化目标
- [ ] 创建转化漏斗报告

### 测试
- [ ] 测试页面浏览追踪
- [ ] 测试事件触发
- [ ] 使用 DebugView 验证
- [ ] 在生产环境验证

---

## 🎯 集成步骤总结

### 步骤 1: 创建 GA4 账户（10分钟）
1. 访问 analytics.google.com
2. 创建账户和属性
3. 创建数据流
4. 复制测量 ID

### 步骤 2: 配置环境变量（2分钟）
1. 添加到 `.env.local`
2. 添加到 Vercel

### 步骤 3: 集成组件（5分钟）
1. 在 `app/layout.tsx` 添加 `<GoogleAnalytics />`
2. 添加 `<PageViewTracker />`

### 步骤 4: 添加事件追踪（30-60分钟）
1. 在创建报告时调用 `trackReportCreated()`
2. 在其他关键操作添加追踪
3. 测试事件

### 步骤 5: 验证（15分钟）
1. 使用 DebugView 测试
2. 等待 24-48 小时看到完整数据
3. 创建自定义报告

**总时间**: ~1-2 小时

---

## 📈 预期结果

### 第 1 周
- 基础数据收集
- 页面浏览追踪
- 用户会话数据

### 第 2-4 周
- 事件数据积累
- 用户行为模式
- 转化漏斗分析

### 第 1-3 月
- 趋势分析
- A/B 测试数据
- 优化建议

---

**分析系统已准备就绪！** 🎉

按照本指南配置 GA4 并开始收集数据。
