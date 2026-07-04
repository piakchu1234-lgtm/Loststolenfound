# 🚀 部署检查清单

**项目**: LostStolenFound Phase 1 Complete  
**状态**: 准备部署  
**日期**: 2026-07-04

---

## ✅ 已完成的集成

### 代码集成
- [x] OneSignalProvider 已集成到 layout.tsx
- [x] ToastProvider 已集成到 layout.tsx
- [x] GoogleAnalytics 已集成到 layout.tsx
- [x] PageViewTracker 已集成到 layout.tsx
- [x] ErrorBoundary 已存在
- [x] Vercel Analytics 已存在

### 文件完整性
- [x] 推送通知系统 (5个文件)
- [x] 直接消息系统 (4个文件)
- [x] 错误处理系统 (7个文件)
- [x] 分析系统 (3个文件)
- [x] 所有指南文档 (8个文件)

---

## 📋 部署前检查清单

### 1. 环境变量配置

#### 本地 (.env.local)
```env
# Supabase (已有)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox (已有)
NEXT_PUBLIC_MAPBOX_TOKEN=

# App URL (已有)
NEXT_PUBLIC_APP_URL=

# OneSignal (需要添加)
NEXT_PUBLIC_ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
ONESIGNAL_APP_ID=

# Sentry (需要添加)
NEXT_PUBLIC_SENTRY_DSN=

# Google Analytics (需要添加)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

#### Vercel (需要添加)
- [ ] NEXT_PUBLIC_ONESIGNAL_APP_ID
- [ ] ONESIGNAL_REST_API_KEY
- [ ] ONESIGNAL_APP_ID
- [ ] NEXT_PUBLIC_SENTRY_DSN
- [ ] NEXT_PUBLIC_GA_MEASUREMENT_ID

---

### 2. 第三方服务配置

#### OneSignal (15-20分钟)
- [ ] 创建 OneSignal 账户
- [ ] 创建 Web Push 应用
- [ ] 配置网站 URL
- [ ] 获取 App ID 和 REST API Key
- [ ] 添加到环境变量

**指南**: ONESIGNAL_SETUP_GUIDE.md

#### Sentry (10分钟)
- [ ] 创建 Sentry 账户
- [ ] 创建 Next.js 项目
- [ ] 获取 DSN
- [ ] 添加到环境变量

**指南**: ERROR_HANDLING_GUIDE.md

#### Google Analytics (15分钟)
- [ ] 创建 GA4 账户
- [ ] 创建属性和数据流
- [ ] 获取测量 ID (G-XXXXXXXXXX)
- [ ] 添加到环境变量

**指南**: ANALYTICS_SETUP_GUIDE.md

---

### 3. Supabase 数据库迁移

#### 消息系统迁移 (15分钟)
- [ ] 打开 Supabase Dashboard → SQL Editor
- [ ] 复制 `supabase/migrations/20260706_add_messaging_system.sql`
- [ ] 执行 SQL
- [ ] 验证表创建成功:
  - conversations 表
  - messages 表
  - RLS 策略
  - 函数和触发器

#### Storage Bucket (5分钟)
- [ ] Supabase → Storage
- [ ] 创建 bucket: `message-attachments`
- [ ] 设置为 Public
- [ ] 配置 RLS 策略:

```sql
-- 允许认证用户上传
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- 所有人可以查看
CREATE POLICY "Anyone can view attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-attachments');
```

**指南**: MESSAGING_SYSTEM_GUIDE.md

---

### 4. 代码部署

#### Git 推送
- [x] 所有代码已提交
- [x] 已推送到 GitHub

#### Vercel 部署
- [ ] Vercel 会自动部署
- [ ] 等待部署完成 (2-4分钟)
- [ ] 检查部署日志无错误

---

### 5. 功能测试

#### 基础功能 (已有)
- [ ] 网站可访问
- [ ] 地图显示正常
- [ ] 可以创建报告
- [ ] 可以查看匹配
- [ ] 认领流程工作

#### 推送通知
- [ ] 注册/登录
- [ ] 访问个人资料
- [ ] 看到 "Push Notifications" 设置
- [ ] 点击启用
- [ ] 浏览器弹出权限请求
- [ ] 允许通知
- [ ] 在 OneSignal Dashboard 看到订阅者数 > 0

#### 直接消息
- [ ] 创建测试报告
- [ ] 点击 "Contact" 按钮 (需要添加)
- [ ] 打开聊天窗口
- [ ] 发送文本消息
- [ ] 发送图片
- [ ] 验证实时接收

#### 错误处理
- [ ] 触发测试错误
- [ ] 看到友好的错误页面
- [ ] Toast 通知显示
- [ ] Sentry Dashboard 显示错误

#### 分析
- [ ] 访问页面
- [ ] 执行操作 (创建报告等)
- [ ] 24小时后检查 GA4
- [ ] 验证事件数据

---

## ⏱️ 预计时间

### 第三方服务配置
- OneSignal: 15-20分钟
- Sentry: 10分钟
- Google Analytics: 15分钟
- **小计**: 40-45分钟

### 数据库迁移
- 应用迁移: 15分钟
- Storage 配置: 5分钟
- **小计**: 20分钟

### 测试
- 基础功能: 10分钟
- 新功能: 30分钟
- **小计**: 40分钟

### 总计
**1.5 - 2 小时**

---

## 🎯 部署后验证

### 立即验证
- [ ] 网站加载无错误
- [ ] 控制台无错误
- [ ] 所有页面可访问
- [ ] 基础功能工作

### 24小时内验证
- [ ] Sentry 显示错误 (如果有)
- [ ] GA4 显示用户和事件
- [ ] OneSignal 显示订阅者
- [ ] 消息系统工作正常

### 1周内验证
- [ ] 用户留存数据
- [ ] 转化漏斗数据
- [ ] 错误趋势
- [ ] 性能指标

---

## 🐛 常见问题

### 问题 1: 通知不工作
**解决**:
- 检查环境变量
- 验证 OneSignal App ID
- 检查浏览器权限

### 问题 2: 消息发送失败
**解决**:
- 检查 Supabase 迁移
- 验证 Storage bucket
- 检查 RLS 策略

### 问题 3: 错误未报告到 Sentry
**解决**:
- 检查 SENTRY_DSN
- 验证环境 (不在开发环境)
- 检查错误过滤规则

### 问题 4: GA4 无数据
**解决**:
- 等待 24-48 小时
- 检查测量 ID
- 使用 GA4 DebugView 测试

---

## 📞 支持资源

### 文档
- ONESIGNAL_SETUP_GUIDE.md
- MESSAGING_SYSTEM_GUIDE.md
- ERROR_HANDLING_GUIDE.md
- ANALYTICS_SETUP_GUIDE.md

### 外部文档
- OneSignal: https://documentation.onesignal.com
- Sentry: https://docs.sentry.io
- GA4: https://support.google.com/analytics
- Supabase: https://supabase.com/docs

---

## ✅ 完成标志

### 全部完成时
- ✅ 所有环境变量已配置
- ✅ 所有第三方服务已设置
- ✅ 数据库迁移已应用
- ✅ 代码已部署
- ✅ 所有功能测试通过
- ✅ 监控系统正常运行

**恭喜！您的平台已完全部署并运行！** 🎉

---

## 🎯 下一步

部署完成后:
1. 邀请测试用户
2. 收集反馈
3. 监控指标
4. 持续优化
5. 考虑第 2 阶段

**详见**: USER_ACQUISITION_GUIDE.md
