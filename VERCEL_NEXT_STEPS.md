# 🚀 Vercel 部署 - 下一步操作

## ✅ 当前状态

您已经：
- ✅ 在 Vercel 导入了项目
- ✅ 配置了大部分环境变量
- ⚠️ 还缺少几个关键变量

---

## ⚠️ 立即添加缺少的环境变量

### 1. NEXT_PUBLIC_MAPBOX_TOKEN （必需 - 地图功能）

**在 Vercel 添加**:
```
变量名: NEXT_PUBLIC_MAPBOX_TOKEN
值: pk.xxxxxxxxxxxxxxxxx
```

**如何获取**:
1. 访问 https://account.mapbox.com/access-tokens/
2. 如果没有账户，免费注册
3. 点击 "Create a token"
4. 选择 "Public" 范围
5. 复制 token（以 pk. 开头）

### 2. NEXT_PUBLIC_SUPABASE_URL （必需 - 客户端连接）

**在 Vercel 添加**:
```
变量名: NEXT_PUBLIC_SUPABASE_URL
值: [使用您的 SUPABASE_URL 相同的值]
```

**注意**: 这个变量必须有 `NEXT_PUBLIC_` 前缀，因为客户端代码需要访问它。

---

## 🔧 如何在 Vercel 添加环境变量

1. 在 Vercel Dashboard 中打开您的项目
2. 点击 **Settings** 标签
3. 点击左侧菜单的 **Environment Variables**
4. 点击 **Add Another**
5. 输入变量名和值
6. 选择环境: **Production, Preview, Development**（全选）
7. 点击 **Save**

---

## 📝 完整的环境变量清单

### 必需变量（必须配置）

| 变量名 | 状态 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ 缺失 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 已配置 | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ 已配置 | 服务端密钥 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ⚠️ 缺失 | Mapbox 地图 token |

### 可选变量（推荐配置）

| 变量名 | 状态 | 说明 |
|--------|------|------|
| `RESEND_API_KEY` | ✅ 已配置 | 邮件通知功能 |
| `CRON_SECRET` | ✅ 已配置 | Cron 端点保护 |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ 缺失 | 您的生产 URL |
| `NEXT_PUBLIC_ADMIN_EMAIL` | ⚠️ 未配置 | 管理员邮箱 |
| `NEXT_PUBLIC_GOOGLE_ADSENSE_ID` | ⚠️ 未配置 | Google AdSense |

---

## 🔄 添加变量后的操作

1. **重新部署**:
   - 在 Vercel Dashboard，点击 **Deployments** 标签
   - 找到最新的部署
   - 点击右侧的 **...** 菜单
   - 选择 **Redeploy**
   - 确认重新部署

2. **等待构建完成**:
   - 通常需要 3-5 分钟
   - 查看构建日志确保没有错误

3. **访问您的网站**:
   - 点击 **Visit** 按钮
   - 或访问您的 Vercel URL

---

## ✅ 部署验证清单

部署完成后，请检查：

### 基础功能
- [ ] 网站可以访问
- [ ] 地图正常显示（需要 Mapbox token）
- [ ] 可以注册/登录
- [ ] 暗黑模式切换工作

### 核心功能
- [ ] 可以创建新报告
- [ ] 可以上传图片
- [ ] 可以添加评论
- [ ] 可以投票
- [ ] 通知功能工作

### 如果出现问题

#### 地图不显示
- 检查 `NEXT_PUBLIC_MAPBOX_TOKEN` 是否正确配置
- 确保 token 以 `pk.` 开头
- 在 Mapbox Dashboard 检查 token 权限

#### 数据库连接错误
- 检查 `NEXT_PUBLIC_SUPABASE_URL` 是否配置
- 确保 Supabase 项目正在运行
- 检查 API 密钥是否正确

#### 图片上传失败
- 在 Supabase Dashboard 创建 `incident-photos` 存储桶
- 设置存储桶为 Public
- 配置 CORS 允许您的 Vercel 域名

---

## 🎯 快速行动项

**现在立即做**:
1. ⚠️ 添加 `NEXT_PUBLIC_MAPBOX_TOKEN`
2. ⚠️ 添加 `NEXT_PUBLIC_SUPABASE_URL`
3. 🔄 重新部署应用
4. ✅ 访问并测试您的网站

**5 分钟后可以做**:
- 添加 `NEXT_PUBLIC_SITE_URL`（使用您的 Vercel URL）
- 配置自定义域名（可选）
- 设置 Cron 任务（如果需要邮件功能）

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Vercel 构建日志
2. 检查浏览器控制台错误
3. 参考 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) 故障排除部分

---

**下一步**: 添加缺失的环境变量，然后重新部署！🚀
