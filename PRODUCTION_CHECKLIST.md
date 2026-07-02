# 🚀 生产部署清单

**项目**: LostStolenFound  
**版本**: 1.0.0  
**部署日期**: _______

---

## ✅ 环境变量检查

### Vercel 环境变量
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] `NEXT_PUBLIC_APP_URL` (设置为生产 URL)

### 验证方法
```bash
# 在本地测试环境变量
npm run build
```

---

## 🗄️ Supabase 数据库

### 迁移文件（按顺序）
- [ ] `20260528035918_initial_schema.sql` - 初始架构
- [ ] `20260703_add_matching_system.sql` - 匹配系统
- [ ] `20260704_add_claims_system.sql` - 认领系统
- [ ] `20260705_add_safe_locations.sql` - 安全地点（含 9 个地点）

### 验证数据库
- [ ] 所有表已创建
- [ ] RLS 策略已启用
- [ ] 触发器工作正常
- [ ] `safe_locations` 表有 9 行数据

### SQL 验证查询
```sql
-- 检查表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 检查安全地点
SELECT COUNT(*) FROM safe_locations;

-- 检查 RLS
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 🔒 安全检查

### 代码安全
- [ ] `.env.local` 在 `.gitignore` 中
- [ ] 没有硬编码的 API 密钥
- [ ] 所有敏感数据使用环境变量
- [ ] CORS 配置正确

### Supabase 安全
- [ ] RLS 在所有敏感表上启用
- [ ] 策略已测试
- [ ] 服务角色密钥仅在服务端使用
- [ ] 匿名密钥在客户端使用

### 测试清单
- [ ] 用户不能访问其他人的数据
- [ ] 用户不能认领自己的物品
- [ ] 用户不能修改其他人的报告
- [ ] 匿名用户访问受限

---

## ⚡ 性能检查

### 构建优化
- [ ] 运行 `npm run build` 无错误
- [ ] 检查包大小警告
- [ ] First Load JS < 200KB（理想）

### 图片优化
- [ ] 使用 Next.js Image 组件
- [ ] Supabase 域名在 next.config.js 中配置
- [ ] 图片格式优化（WebP/AVIF）

### 缓存策略
- [ ] API 路由有适当的缓存头
- [ ] 静态资源缓存配置

---

## 🎨 SEO 检查

### Metadata
- [ ] 页面标题正确
- [ ] Meta 描述存在且有意义
- [ ] Open Graph 标签配置
- [ ] Twitter Card 配置

### 可索引性
- [ ] `robots.txt` 已创建
- [ ] `sitemap.xml` 已生成
- [ ] 无 `noindex` 标签（除非有意为之）

### 验证方法
```bash
# 检查生成的 sitemap
curl http://localhost:3000/sitemap.xml

# 检查 robots.txt
curl http://localhost:3000/robots.txt
```

---

## 🧪 功能测试

### 核心功能
- [ ] 用户注册和登录
- [ ] 创建报告（所有类别）
- [ ] 上传图片
- [ ] 查看地图和列表
- [ ] 搜索和筛选

### 匹配系统
- [ ] 创建报告后自动生成匹配
- [ ] 匹配列表显示
- [ ] 匹配对比视图
- [ ] 匹配分数正确

### 认领系统
- [ ] "Claim This Item" 按钮显示
- [ ] 提交认领证据
- [ ] 失主收到通知
- [ ] 批准/拒绝认领
- [ ] 标记为完成
- [ ] 报告状态更新为 resolved

### 安全地点
- [ ] 9 个地点在数据库中
- [ ] 地点选择器工作
- [ ] 显示距离和设施

---

## 🌐 浏览器兼容性

### 桌面浏览器
- [ ] Chrome（最新版）
- [ ] Firefox（最新版）
- [ ] Safari（最新版）
- [ ] Edge（最新版）

### 移动浏览器
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] 响应式设计正常

### 测试要点
- [ ] 地图交互流畅
- [ ] 表单可用
- [ ] 按钮可点击
- [ ] 图片加载正常

---

## 📱 移动端测试

### 布局
- [ ] 所有页面响应式
- [ ] 按钮够大（最小 44x44px）
- [ ] 文字可读
- [ ] 没有水平滚动

### 交互
- [ ] 触摸手势工作
- [ ] 地图可缩放
- [ ] 表单输入流畅
- [ ] 图片上传工作

---

## 🚀 Vercel 部署配置

### 项目设置
- [ ] 仓库已连接
- [ ] 构建命令: `npm run build`
- [ ] 输出目录: `.next`
- [ ] 安装命令: `npm install`
- [ ] Node.js 版本: 18.x 或更高

### 环境变量
- [ ] 所有变量已添加到 Vercel
- [ ] 生产环境变量已设置
- [ ] 预览环境变量已设置（可选）

### 域名配置（可选）
- [ ] 自定义域名已添加
- [ ] DNS 记录已配置
- [ ] SSL 证书自动配置

---

## 📊 监控和分析

### Vercel Analytics
- [ ] 已启用 Vercel Analytics
- [ ] Speed Insights 已启用

### 错误追踪（可选）
- [ ] Sentry 已配置（如果使用）
- [ ] 错误通知已设置

### 性能监控
- [ ] 检查 Vercel Dashboard 中的性能指标
- [ ] Core Web Vitals 良好

---

## 🔍 部署后验证

### 立即检查（部署后 5 分钟内）
- [ ] 网站可访问
- [ ] 首页加载正常
- [ ] 地图显示
- [ ] 登录/注册工作
- [ ] 无控制台错误

### 功能验证（部署后 30 分钟内）
- [ ] 创建测试报告
- [ ] 验证匹配系统
- [ ] 测试认领流程
- [ ] 检查通知
- [ ] 验证数据持久化

### 性能验证
- [ ] 页面加载速度 < 3 秒
- [ ] Lighthouse 分数 > 80
- [ ] 无明显性能问题

---

## 📝 部署记录

### 部署信息
```
部署日期: ______________
部署人: ______________
Vercel URL: ______________
提交 Hash: ______________
```

### 问题记录
```
发现的问题:
1. 
2. 
3. 

解决方案:
1. 
2. 
3. 
```

---

## 🎯 发布后任务

### 立即（24小时内）
- [ ] 监控错误日志
- [ ] 检查用户反馈
- [ ] 验证所有功能
- [ ] 修复关键问题

### 短期（1周内）
- [ ] 收集用户反馈
- [ ] 优化性能瓶颈
- [ ] 修复非关键问题
- [ ] 更新文档

### 中期（1月内）
- [ ] 分析用户行为
- [ ] 计划下一阶段功能
- [ ] SEO 优化
- [ ] 市场推广

---

## ✅ 最终批准

### 技术负责人
- [ ] 代码审查通过
- [ ] 测试通过
- [ ] 性能满足要求
- [ ] 安全检查通过

签名: ______________ 日期: ______________

### 产品负责人
- [ ] 功能完整
- [ ] 用户体验良好
- [ ] 准备好发布

签名: ______________ 日期: ______________

---

## 🆘 回滚计划

### 如果需要回滚
1. 在 Vercel Dashboard 找到上一个稳定部署
2. 点击 "Promote to Production"
3. 验证回滚成功
4. 通知团队

### 紧急联系
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com

---

**部署完成后，此清单应该全部打勾！** ✅

祝部署顺利！🚀
