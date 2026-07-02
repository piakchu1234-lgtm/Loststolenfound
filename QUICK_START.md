# ⚡ 快速开始指南

最快 5 分钟部署您的应用！

---

## 📋 准备工作

### 您需要的账户
- [x] GitHub 账户
- [ ] [Vercel](https://vercel.com) 账户（免费）
- [ ] [Supabase](https://supabase.com) 账户（免费）
- [ ] [Mapbox](https://mapbox.com) 账户（免费）

### 可选账户
- [ ] [Resend](https://resend.com) - 邮件功能
- [ ] [Google AdSense](https://adsense.google.com) - 广告功能

---

## 🚀 5 分钟部署

### 第 1 步: Supabase 设置 (2 分钟)

1. **创建项目**
   - 访问 https://supabase.com
   - 点击 "New Project"
   - 记录：
     - Project URL
     - Anon key
     - Service role key

2. **创建存储桶**
   - Storage > Create Bucket
   - 名称: `incident-photos`
   - Public: ✅ Yes

3. **应用迁移**
   - SQL Editor
   - 复制 `supabase/migrations/*.sql` 内容
   - 运行 SQL

### 第 2 步: Mapbox 设置 (1 分钟)

1. 访问 https://account.mapbox.com/access-tokens/
2. 点击 "Create a token"
3. 选择 "Public" 范围
4. 复制 token

### 第 3 步: Vercel 部署 (2 分钟)

1. **导入项目**
   - 访问 https://vercel.com/new
   - 选择 GitHub 仓库
   - 点击 "Import"

2. **配置环境变量**
   粘贴这些变量（替换为您的真实值）：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   NEXT_PUBLIC_MAPBOX_TOKEN=pk....
   ```

3. **部署**
   - 点击 "Deploy"
   - 等待 3-5 分钟
   - ✅ 完成！

---

## ✅ 验证部署

访问您的 Vercel URL，检查：
- [ ] 地图显示正常
- [ ] 可以创建账户
- [ ] 可以添加报告

---

## 🔧 常见问题

### Q: 地图不显示？
**A:** 检查 Mapbox token 是否正确配置

### Q: 无法上传图片？
**A:** 确保 Supabase Storage 存储桶已创建并设为公开

### Q: 数据库错误？
**A:** 确保已运行数据库迁移 SQL

---

## 📚 下一步

- 配置自定义域名
- 设置邮件通知（可选）
- 添加 Google AdSense（可选）
- 邀请用户测试

---

**完整文档**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**需要帮助？** 查看 [PROJECT_STATUS.md](PROJECT_STATUS.md)
