# 🚀 环境变量配置快速指南

**问题**: Supabase 环境变量缺失，应用无法启动  
**解决**: 配置 .env.local 文件

---

## ⚡ 快速修复（5 分钟）

### 步骤 1: 创建 .env.local 文件

在项目根目录创建 `.env.local` 文件（如果还没有的话）

### 步骤 2: 添加必需的环境变量

复制以下内容到 `.env.local` 并替换为您的实际值：

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Mapbox Configuration (REQUIRED)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token-here

# App Configuration (REQUIRED)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 步骤 3: 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重启
npm run dev
```

---

## 📝 如何获取这些值

### Supabase (必需)

1. 访问 https://supabase.com/dashboard
2. 登录您的账户
3. 选择您的项目（或创建新项目）
4. 点击左侧 **Settings** ⚙️
5. 点击 **API**
6. 复制以下值：
   - **URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### Mapbox (必需)

1. 访问 https://account.mapbox.com
2. 登录您的账户（或创建新账户）
3. 点击 **Tokens**
4. 复制 **Default public token** → `NEXT_PUBLIC_MAPBOX_TOKEN`

---

## 🎯 可选的环境变量（Phase 1 功能）

在配置完必需变量并测试应用后，您可以添加这些可选变量：

```env
# OneSignal Configuration (Optional - for Push Notifications)
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-onesignal-rest-key
ONESIGNAL_APP_ID=your-onesignal-app-id

# Sentry Configuration (Optional - for Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Google Analytics Configuration (Optional - for Analytics)
NEXT_PUBLIC_GA_MEASUREMENT_ID=your-ga-measurement-id
```

**如何获取**:
- OneSignal: 参考 `ONESIGNAL_SETUP_GUIDE.md`
- Sentry: 参考 `ERROR_HANDLING_GUIDE.md`
- Google Analytics: 参考 `ANALYTICS_SETUP_GUIDE.md`

---

## ✅ 验证配置

### 检查 .env.local 文件

您的 `.env.local` 应该看起来像这样（使用实际值）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoic29tZXVzZXIiLCJhIjoiY2x...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 测试应用

```bash
npm run dev
```

访问 http://localhost:3000

如果看到地图和应用界面，配置成功！✅

---

## 🐛 常见问题

### 问题 1: 应用仍然报错 "supabaseUrl is required"

**解决**:
1. 确认 `.env.local` 文件在项目根目录
2. 确认变量名拼写正确（区分大小写）
3. 确认没有多余的空格
4. 重启开发服务器

### 问题 2: 地图不显示

**解决**:
1. 检查 `NEXT_PUBLIC_MAPBOX_TOKEN` 是否正确
2. 访问 Mapbox Dashboard 确认 token 有效
3. 检查浏览器控制台错误

### 问题 3: 找不到 .env.local 文件

**解决**:
在项目根目录创建：
```bash
# Windows
type nul > .env.local

# Mac/Linux
touch .env.local
```

然后用文本编辑器打开并添加内容。

---

## 📊 环境变量优先级

```
必需（现在配置）:
  ✅ Supabase URL
  ✅ Supabase Keys
  ✅ Mapbox Token
  ✅ App URL

可选（稍后配置）:
  ⏳ OneSignal (推送通知)
  ⏳ Sentry (错误追踪)
  ⏳ Google Analytics (分析)
```

---

## 🎯 下一步

配置完环境变量后：

1. ✅ 应用可以运行
2. ✅ 可以创建和查看报告
3. ✅ 地图正常显示
4. ✅ 基本功能工作

然后您可以：
- 按照 `DEPLOYMENT_CHECKLIST.md` 配置 Phase 1 功能
- 或继续使用 MVP 功能
- 或开始获取用户

---

## 📞 需要帮助？

如果遇到问题：
1. 检查环境变量拼写
2. 确认值没有引号
3. 重启开发服务器
4. 查看浏览器控制台

---

**配置完成后，您的应用就可以运行了！** 🚀
