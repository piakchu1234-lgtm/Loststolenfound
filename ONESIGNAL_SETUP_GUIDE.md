# 🔔 OneSignal 设置完整指南

**目的**: 配置推送通知系统  
**时间**: 15-20 分钟  
**难度**: 简单

---

## 📋 步骤 1: 创建 OneSignal 账户（5 分钟）

### 1.1 访问 OneSignal
👉 https://onesignal.com

### 1.2 注册账户
1. 点击右上角 **Sign Up** 或 **Get Started Free**
2. 使用 Email 或 Google 账户注册
3. 验证邮箱

### 1.3 创建新应用
1. 登录后，点击 **New App/Website**
2. 输入应用名称: `LostStolenFound`
3. 点击 **Create App**

---

## 📋 步骤 2: 配置 Web Push（10 分钟）

### 2.1 选择平台
1. 在 "Select a Platform" 页面
2. 选择 **Web**
3. 点击 **Next**

### 2.2 配置网站
1. **Site Name**: `LostStolenFound`
2. **Site URL**: `https://your-app.vercel.app`
   - 使用您的实际 Vercel URL
   - 必须是 HTTPS

3. **Auto Resubscribe**: 保持 **ON**
4. 点击 **Save**

### 2.3 上传通知图标（可选）
1. 准备一个 256x256 的 PNG 图标
2. 或暂时跳过（使用默认）

### 2.4 完成设置
点击 **Done** 或 **Finish**

---

## 🔑 步骤 3: 获取 API 密钥（2 分钟）

### 3.1 进入 Settings
1. 在左侧菜单，点击 **Settings** ⚙️
2. 选择 **Keys & IDs**

### 3.2 复制密钥
您会看到以下信息：

```
App ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
REST API Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Safari Web ID: web.onesignal.auto.xxxxxxxx (如果有)
```

**重要**: 复制这些值，马上需要使用！

---

## 💻 步骤 4: 配置本地环境变量（2 分钟）

### 4.1 创建/编辑 .env.local

在项目根目录，编辑 `.env.local` 文件，添加：

```env
# OneSignal Configuration
NEXT_PUBLIC_ONESIGNAL_APP_ID=你的App ID
ONESIGNAL_REST_API_KEY=你的REST API Key
ONESIGNAL_APP_ID=你的App ID
```

**示例**:
```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789012
ONESIGNAL_REST_API_KEY=YourRestApiKeyHereAbout40Characters
ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789012
```

### 4.2 保存文件
确保文件已保存

---

## ☁️ 步骤 5: 配置 Vercel 环境变量（3 分钟）

### 5.1 登录 Vercel
访问 https://vercel.com

### 5.2 选择项目
找到您的 `Loststolenfound` 项目

### 5.3 进入 Settings
1. 点击项目
2. 点击顶部的 **Settings**
3. 点击左侧的 **Environment Variables**

### 5.4 添加变量
添加以下 3 个变量：

#### 变量 1:
```
Key: NEXT_PUBLIC_ONESIGNAL_APP_ID
Value: 你的App ID
Environment: Production, Preview, Development (全选)
```

#### 变量 2:
```
Key: ONESIGNAL_REST_API_KEY
Value: 你的REST API Key
Environment: Production, Preview, Development (全选)
```

#### 变量 3:
```
Key: ONESIGNAL_APP_ID
Value: 你的App ID
Environment: Production, Preview, Development (全选)
```

### 5.5 保存
每个变量添加后点击 **Add**

---

## 🚀 步骤 6: 重新部署（3 分钟）

### 6.1 触发重新部署

**选项 A: 通过 Vercel Dashboard**
1. 在 Vercel 项目页面
2. 点击 **Deployments**
3. 点击最新部署旁的 **...** 菜单
4. 选择 **Redeploy**

**选项 B: 通过 Git Push**
```bash
git add .
git commit -m "Add OneSignal configuration"
git push origin main
```

### 6.2 等待部署
- 通常需要 2-3 分钟
- 等待显示 "Deployment Complete"

---

## ✅ 步骤 7: 测试通知（5 分钟）

### 7.1 访问您的网站
打开浏览器，访问您的生产 URL

### 7.2 注册/登录
如果还没有账户，创建一个

### 7.3 访问个人资料
点击右上角的个人资料图标

### 7.4 启用通知
1. 找到 "Push Notifications" 卡片
2. 点击 **Enable Notifications**
3. 浏览器会弹出权限请求
4. 点击 **允许** 或 **Allow**

✅ 如果看到 "Enabled" 状态，配置成功！

---

## 🧪 步骤 8: 发送测试通知（5 分钟）

### 8.1 通过 OneSignal Dashboard

1. 登录 OneSignal Dashboard
2. 选择您的应用
3. 点击左侧 **Messages**
4. 点击 **New Push**
5. 填写：
   - **Message**: "Test notification from LostStolenFound!"
   - **Title**: "Welcome! 🎉"
6. 选择 **Send to Subscribed Users**
7. 点击 **Review & Send**
8. 点击 **Send Message**

### 8.2 验证
- 几秒钟后应该收到通知
- 如果没收到，检查浏览器通知权限

---

## 🎯 完成检查清单

### OneSignal 账户
- [ ] 已创建 OneSignal 账户
- [ ] 已创建应用
- [ ] 已配置 Web Push
- [ ] 已获取 App ID 和 REST API Key

### 环境变量
- [ ] `.env.local` 已配置（3个变量）
- [ ] Vercel 环境变量已配置（3个变量）

### 部署
- [ ] 已重新部署到 Vercel
- [ ] 部署成功（无错误）

### 功能测试
- [ ] 可以访问网站
- [ ] 可以看到通知设置
- [ ] 可以启用通知
- [ ] 浏览器显示权限请求
- [ ] 已允许通知权限
- [ ] 收到测试通知 ✅

---

## 🐛 故障排查

### 问题 1: 找不到通知设置
**解决**:
- 确认已登录
- 访问个人资料页面
- 如果还是没有，检查代码是否正确集成

### 问题 2: 点击启用后没反应
**解决**:
- 检查浏览器控制台（F12）是否有错误
- 确认环境变量已正确配置
- 确认 App ID 正确（不要有多余空格）

### 问题 3: 浏览器不弹出权限请求
**解决**:
- 检查是否已经拒绝过通知权限
- 在浏览器设置中重置通知权限：
  - Chrome: 设置 → 隐私和安全 → 网站设置 → 通知
  - Firefox: 设置 → 隐私与安全 → 权限 → 通知

### 问题 4: 没有收到测试通知
**解决**:
- 确认已订阅（OneSignal Dashboard 应显示 1+ subscribers）
- 检查浏览器通知是否被阻止
- 尝试刷新页面后重新订阅

### 问题 5: 部署失败
**解决**:
- 检查 Vercel 部署日志
- 确认所有环境变量都已添加
- 确认变量名称拼写正确（区分大小写）

---

## 📊 验证成功的标志

### OneSignal Dashboard
- ✅ Subscribers 数量 > 0
- ✅ 可以发送测试消息
- ✅ 消息历史中显示已发送

### 您的应用
- ✅ 通知设置显示 "Enabled"
- ✅ 浏览器有通知权限
- ✅ 收到测试通知

### Vercel
- ✅ 最新部署成功
- ✅ 环境变量已配置
- ✅ 无构建错误

---

## 🎉 下一步

### 通知系统已就绪！

现在当以下事件发生时，用户会自动收到通知：
- 🎯 发现新匹配（高置信度）
- 📦 有人认领他们的物品
- ✅ 认领被批准
- ❌ 认领被拒绝
- 💬 收到新评论

### 继续第 1 阶段

推送通知 ✅ 完成！

下一个任务：
- **直接消息系统**（3-4 天）
- 或 **错误处理改进**（2 天）
- 或 **分析设置**（2 天）

---

## 📞 需要帮助？

如果遇到问题：

1. 检查本指南的故障排查部分
2. 查看 OneSignal 文档: https://documentation.onesignal.com
3. 检查浏览器控制台错误
4. 检查 Vercel 部署日志

---

**配置完成后告诉我，我会帮您继续下一个功能！** 🚀
