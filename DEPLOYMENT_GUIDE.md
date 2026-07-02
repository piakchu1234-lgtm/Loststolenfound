# 🚀 部署指南 - LostStolenFound

完整的部署步骤和最佳实践。

---

## 📋 部署前检查清单

### 必需步骤
- [ ] 所有环境变量已配置
- [ ] Supabase 项目已创建
- [ ] Mapbox 账户已设置
- [ ] 数据库迁移已应用
- [ ] 本地构建测试通过

### 可选步骤
- [ ] Resend API 密钥 (邮件功能)
- [ ] Google AdSense ID (广告)
- [ ] 自定义域名配置
- [ ] SSL 证书配置

---

## 🌐 Vercel 部署 (推荐)

### 1. 准备工作

1. **确保代码已推送到 GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **在 Vercel 创建新项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "Add New Project"
   - 导入你的 GitHub 仓库

### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

**必需变量**:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-key
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
```

**可选变量**:
```
RESEND_API_KEY=re_...your-key
RESEND_FROM=LostStolenFound <noreply@yourdomain.com>
CRON_SECRET=your-random-secret-string
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_GOOGLE_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX
```

### 3. 部署设置

**构建命令**: `next build` (默认)  
**输出目录**: `.next` (默认)  
**安装命令**: `npm install` (默认)

### 4. 部署

1. 点击 "Deploy"
2. 等待构建完成 (~3-5 分钟)
3. 访问生成的 URL

### 5. 自定义域名 (可选)

1. 在 Vercel 项目设置中添加域名
2. 按照说明配置 DNS
3. 等待 DNS 传播 (~24 小时)

---

## 🗄️ Supabase 设置

### 1. 创建项目

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 记录以下信息：
   - Project URL
   - Anon key
   - Service role key

### 2. 应用数据库迁移

**选项 A: 使用 Supabase CLI (推荐)**
```bash
# 链接到远程项目
supabase link --project-ref your-project-ref

# 推送迁移
supabase db push
```

**选项 B: 手动执行**
1. 在 Supabase Dashboard 打开 SQL Editor
2. 复制 `supabase/migrations/*.sql` 内容
3. 执行 SQL

### 3. 配置存储桶

1. 在 Supabase Dashboard 打开 Storage
2. 创建 `incident-photos` 存储桶
3. 设置为公开访问
4. 配置 CORS (允许你的域名)

### 4. 设置认证

1. 在 Authentication 设置中：
   - 启用 Email provider
   - 配置站点 URL
   - 配置重定向 URLs

---

## 🗺️ Mapbox 设置

### 1. 创建账户

1. 访问 [mapbox.com](https://www.mapbox.com/)
2. 注册免费账户
3. 创建访问令牌

### 2. 配置令牌

1. 选择 "Public" 范围
2. 添加你的域名到 URL 限制
3. 复制令牌到环境变量

### 3. 使用限制

- 免费层: 50,000 次地图加载/月
- 监控使用量在 Mapbox Dashboard

---

## 📧 Resend 设置 (可选)

### 1. 创建账户

1. 访问 [resend.com](https://resend.com)
2. 验证你的域名
3. 创建 API 密钥

### 2. DNS 配置

添加以下 DNS 记录：
```
TXT @ "v=spf1 include:resend.com ~all"
DKIM resend._domainkey "provided by Resend"
```

### 3. 测试邮件

```bash
curl -X POST https://your-domain.com/api/cron/digest \
  -H "Authorization: Bearer your-cron-secret"
```

---

## 🔐 安全配置

### 1. 环境变量安全

- ✅ 永远不要提交 `.env.local` 到 Git
- ✅ 在 Vercel 使用环境变量加密
- ✅ 定期轮换 secrets
- ✅ 使用不同的密钥用于开发/生产

### 2. Supabase 安全

- ✅ 启用 Row Level Security (RLS)
- ✅ 使用 Service Role Key 仅在服务器端
- ✅ 定期审查 RLS 策略
- ✅ 限制 API 密钥权限

### 3. API 保护

- ✅ 使用 CRON_SECRET 保护定时任务
- ✅ 考虑添加速率限制
- ✅ 监控异常请求

---

## 📊 监控与日志

### 1. Vercel 监控

- 访问 Vercel Dashboard > Analytics
- 监控：
  - 响应时间
  - 错误率
  - 带宽使用

### 2. Supabase 监控

- 访问 Supabase Dashboard > Database
- 监控：
  - 查询性能
  - 连接数
  - 存储使用

### 3. 错误追踪

在 `app/layout.tsx` 的 ErrorBoundary 中添加错误报告服务：
```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // 发送到错误追踪服务 (Sentry, LogRocket, etc.)
  console.error("ErrorBoundary caught:", error, errorInfo);
}
```

---

## 🔄 持续部署

### Git 工作流

```bash
# 开发新功能
git checkout -b feature/new-feature
# 提交更改
git commit -m "Add new feature"
# 推送到 GitHub
git push origin feature/new-feature
# 创建 PR 并合并到 main
# Vercel 自动部署
```

### 部署环境

- **Production**: `main` 分支
- **Preview**: PR 和其他分支
- **Development**: 本地环境

---

## 🧪 测试部署

### 1. 本地构建测试

```bash
# 安装依赖
npm install

# 构建
npm run build

# 测试生产构建
npm run start
```

### 2. 测试检查清单

- [ ] 主页加载正常
- [ ] 地图显示正常
- [ ] 用户可以登录
- [ ] 可以创建报告
- [ ] 图片上传工作
- [ ] 评论功能正常
- [ ] 投票功能正常
- [ ] 通知工作
- [ ] 暗黑模式切换
- [ ] 移动端响应式

---

## 🐛 故障排除

### 构建失败

**错误**: "Missing environment variable"
```bash
# 解决: 在 Vercel 添加缺失的环境变量
```

**错误**: "supabaseKey is required"
```bash
# 解决: 确保 NEXT_PUBLIC_SUPABASE_ANON_KEY 已设置
```

### 运行时错误

**错误**: Map 不显示
```bash
# 检查: NEXT_PUBLIC_MAPBOX_TOKEN 是否正确
# 检查: Mapbox token 权限和 URL 限制
```

**错误**: 图片上传失败
```bash
# 检查: Supabase Storage 存储桶 "incident-photos" 是否存在
# 检查: 存储桶是否为公开访问
# 检查: CORS 配置是否正确
```

### 数据库问题

**错误**: "relation does not exist"
```bash
# 解决: 运行数据库迁移
supabase db push
```

---

## 📈 优化建议

### 性能优化

1. **启用 Vercel Edge Functions**
   ```typescript
   export const runtime = 'edge';
   ```

2. **配置 ISR (Incremental Static Regeneration)**
   ```typescript
   export const revalidate = 3600; // 1 hour
   ```

3. **使用 Vercel Image Optimization**
   - 已配置在 `next.config.ts`

### 成本优化

1. **Supabase**: 监控数据库连接数
2. **Mapbox**: 使用缓存减少 API 调用
3. **Vercel**: 监控带宽和函数调用

---

## ✅ 部署完成检查

部署后验证：

- [ ] 网站可访问
- [ ] HTTPS 工作正常
- [ ] 环境变量正确
- [ ] 数据库连接正常
- [ ] 地图加载正常
- [ ] 用户认证工作
- [ ] 图片上传功能
- [ ] 邮件通知 (如果启用)
- [ ] 错误边界工作
- [ ] 移动端体验良好

---

## 🎉 恭喜！

您的应用已成功部署！

**下一步**:
1. 分享你的网站链接
2. 监控使用情况和错误
3. 收集用户反馈
4. 持续改进

---

**需要帮助？** 查看 [PROJECT_STATUS.md](PROJECT_STATUS.md) 或 [AUDIT_FINAL_SUMMARY.md](AUDIT_FINAL_SUMMARY.md)
