# 🧪 系统测试指南 - 完整测试流程

**目的**: 验证所有功能正常工作  
**预计时间**: 45-60 分钟

---

## 📋 准备工作清单

### 1. 必需的账户
- [ ] Supabase 账户（https://supabase.com）
- [ ] Vercel 账户（https://vercel.com）
- [ ] Mapbox 账户（https://mapbox.com）

### 2. 环境变量
确保您已有这些值：
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN`

---

## 🗄️ 第 1 步：应用数据库迁移（10 分钟）

### 1.1 登录 Supabase Dashboard

1. 访问 https://supabase.com
2. 登录您的账户
3. 选择您的项目（或创建新项目）

### 1.2 应用迁移 #1 - 匹配系统

1. 点击左侧菜单的 **SQL Editor**
2. 点击 **New Query**
3. 打开文件：`supabase/migrations/20260703_add_matching_system.sql`
4. 复制全部内容
5. 粘贴到 SQL Editor
6. 点击 **Run** 按钮
7. ✅ 确认看到 "Success. No rows returned"

### 1.3 应用迁移 #2 - 认领系统

1. 在 SQL Editor 创建 **New Query**
2. 打开文件：`supabase/migrations/20260704_add_claims_system.sql`
3. 复制全部内容
4. 粘贴到 SQL Editor
5. 点击 **Run**
6. ✅ 确认成功

### 1.4 应用迁移 #3 - 安全地点

1. 在 SQL Editor 创建 **New Query**
2. 打开文件：`supabase/migrations/20260705_add_safe_locations.sql`
3. 复制全部内容
4. 粘贴到 SQL Editor
5. 点击 **Run**
6. ✅ 确认成功并看到 "9 rows affected"（9 个安全地点已插入）

### 1.5 验证数据库

1. 点击左侧菜单的 **Table Editor**
2. 检查以下表是否存在：
   - [ ] `potential_matches`
   - [ ] `claims`
   - [ ] `claim_notifications`
   - [ ] `safe_locations`
   - [ ] `location_reviews`

3. 点击 `safe_locations` 表
4. ✅ 确认看到 9 行数据（Malvern East 的安全地点）

---

## 💻 第 2 步：启动开发服务器（2 分钟）

### 2.1 配置环境变量

1. 在项目根目录创建 `.env.local` 文件（如果还没有）
2. 添加以下内容（替换为您的真实值）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
```

### 2.2 启动服务器

```bash
npm run dev
```

### 2.3 打开浏览器

访问 http://localhost:3000

✅ 确认应用加载成功，地图显示正常

---

## 👤 第 3 步：创建测试账户（5 分钟）

### 3.1 注册第一个账户（失主）

1. 点击右上角的登录/注册
2. 选择 **Sign Up**
3. 输入邮箱：`owner@test.com`
4. 输入密码：`test123456`
5. 点击 **Sign Up**
6. ✅ 确认成功登录

### 3.2 创建第二个账户（认领者）

1. 在**无痕/隐私窗口**打开 http://localhost:3000
2. 或者先登出第一个账户
3. 注册邮箱：`claimer@test.com`
4. 密码：`test123456`
5. ✅ 确认成功登录

---

## 📍 第 4 步：创建测试报告（10 分钟）

### 4.1 创建"丢失"报告

使用 `owner@test.com` 账户：

1. 点击地图上的 **"+" 按钮**
2. 选择类别：**Lost Property**
3. 点击地图选择位置（Malvern East 附近）
   - 建议坐标：-37.875, 145.065
4. 填写表单：
   ```
   标题: Blue Leather Wallet
   描述: Lost my blue leather wallet near Darling Station on June 15th. 
   Contains driver's license and credit cards. Has a small scratch on the back.
   Brand: Tommy Hilfiger
   ```
5. 可选：上传照片
6. 点击 **Submit**
7. ✅ 确认报告创建成功

### 4.2 创建"找到"报告

使用 `claimer@test.com` 账户：

1. 点击 **"+" 按钮**
2. 选择类别：**Found Property**
3. 点击地图选择**附近位置**（距离第一个报告 < 2km）
   - 建议坐标：-37.870, 145.060
4. 填写表单：
   ```
   标题: Found Blue Wallet
   描述: Found a blue wallet at Darling Railway Station this morning.
   Contains ID cards and appears to belong to someone named [initial].
   Kept safe at station office.
   ```
5. 点击 **Submit**
6. ✅ 确认报告创建成功

---

## 🔍 第 5 步：测试匹配系统（10 分钟）

### 5.1 验证自动匹配

使用 `owner@test.com` 账户：

1. 点击您创建的 "Blue Leather Wallet" 报告
2. 在详情页面，查看右上角按钮区域
3. ✅ 应该看到 **"1 Match"** 或 **"X Matches"** 按钮

### 5.2 查看匹配列表

1. 点击 **"X Matches"** 按钮
2. ✅ 应该看到右侧打开匹配列表
3. ✅ 应该看到 "Found Blue Wallet" 出现在列表中
4. ✅ 检查匹配分数（应该 > 50%）
5. ✅ 检查显示的距离和时间

### 5.3 查看匹配对比

1. 点击匹配卡片的 **"View Details"** 按钮
2. ✅ 应该看到对比视图打开
3. ✅ 左右并排显示两个报告
4. ✅ 显示匹配分数分解：
   - 关键词匹配分数
   - 位置匹配分数
   - 时间匹配分数
   - 综合分数
5. ✅ 显示进度条

---

## ✅ 第 6 步：测试认领流程（15 分钟）

### 6.1 提交认领

使用 `claimer@test.com` 账户：

1. 打开 "Blue Leather Wallet" 报告（失主的报告）
2. ✅ 应该看到 **"Claim This Item"** 按钮（绿色）
3. 点击 **"Claim This Item"**
4. ✅ 应该打开认领对话框
5. 填写证据（最少 50 字符）：
   ```
   This is my wallet! I lost it at Darling Station on June 15th morning 
   around 8:30am. The wallet is blue leather Tommy Hilfiger with a small 
   scratch on the back left corner. Inside are my driver's license 
   (license number: 123456), Westpac credit card, and a photo of my dog.
   The wallet was a birthday gift from my partner.
   ```
6. 可选：上传证明照片
7. 点击 **"Submit Claim"**
8. ✅ 应该看到成功消息
9. ✅ 对话框应该显示成功图标

### 6.2 审核认领

使用 `owner@test.com` 账户：

1. 刷新页面或重新打开报告
2. ✅ 应该看到 **"1 Claim"** 按钮（带橙色徽章）
3. 点击 **"1 Claim"** 按钮
4. ✅ 应该打开认领审核 Sheet
5. ✅ 看到 "Pending Review" 部分
6. ✅ 看到认领者的证据
7. 检查证据内容

### 6.3 批准认领

1. 点击 **"Approve"** 按钮
2. ✅ 应该打开批准模态框
3. 可选：添加消息给认领者：
   ```
   Great! The details match. Let's meet at Darling Station tomorrow at 2pm.
   ```
4. 点击 **"Approve Claim"**
5. ✅ 应该看到成功消息
6. ✅ 认领状态变为 "Approved"

### 6.4 标记为已完成

1. 在认领卡片上，点击 **"Mark as Completed"**
2. ✅ 确认对话框
3. 点击确认
4. ✅ 认领状态变为 "Completed"
5. ✅ 报告状态变为 "Resolved"

---

## 🗺️ 第 7 步：测试安全地点（5 分钟）

### 7.1 查看数据库中的安全地点

1. 回到 Supabase Dashboard
2. 打开 **Table Editor** > `safe_locations`
3. ✅ 确认看到 9 个地点
4. ✅ 检查几个地点的详细信息：
   - Stonnington Police Station (safety_score: 100)
   - Chadstone Shopping Centre (safety_score: 95)
   - Malvern Library (safety_score: 90)

### 7.2 测试地点查询（可选）

在 Supabase SQL Editor 运行：

```sql
-- 查找最近的安全地点
SELECT * FROM find_nearest_safe_locations(
  -37.875,  -- 纬度
  145.065,  -- 经度
  5,        -- 限制返回 5 个
  10        -- 10km 范围内
);
```

✅ 应该返回按距离排序的地点列表

---

## 🔔 第 8 步：验证通知系统（5 分钟）

### 8.1 检查认领通知

在 Supabase Dashboard：

1. 打开 **Table Editor** > `claim_notifications`
2. ✅ 应该看到至少 2 条通知：
   - "claim_received" - 发送给失主
   - "claim_approved" - 发送给认领者

### 8.2 验证通知内容

1. 点击查看通知详情
2. ✅ 检查 `notification_type` 正确
3. ✅ 检查 `message` 内容合理
4. ✅ 检查 `user_id` 指向正确的用户

---

## ✅ 测试结果检查清单

### 数据库
- [ ] 所有 3 个迁移成功应用
- [ ] `potential_matches` 表有数据
- [ ] `claims` 表有数据
- [ ] `claim_notifications` 表有通知
- [ ] `safe_locations` 表有 9 个地点

### 匹配系统
- [ ] 自动匹配生成
- [ ] 匹配分数计算正确
- [ ] 匹配列表显示
- [ ] 匹配对比视图工作
- [ ] 距离和时间显示正确

### 认领系统
- [ ] "Claim This Item" 按钮显示
- [ ] 认领对话框打开
- [ ] 证据提交成功
- [ ] 失主看到认领通知
- [ ] 审核界面工作
- [ ] 批准流程完成
- [ ] 完成标记成功
- [ ] 报告状态更新

### 安全地点
- [ ] 9 个地点已插入
- [ ] 查询函数工作
- [ ] 数据完整

### 通知系统
- [ ] 认领通知创建
- [ ] 批准通知创建
- [ ] 通知内容正确

---

## 🐛 常见问题排查

### 问题 1: 迁移失败

**症状**: SQL 执行出错

**解决**:
1. 检查是否已有同名表存在
2. 尝试删除相关表后重新运行
3. 检查 Supabase 版本兼容性

### 问题 2: 匹配不生成

**症状**: 创建报告后没有匹配

**排查**:
1. 检查 `potential_matches` 表是否为空
2. 检查两个报告的类别是否相反（lost ↔ found）
3. 检查距离是否 < 10km
4. 检查时间差是否 < 14 天

**手动触发匹配**:
```sql
SELECT * FROM find_potential_matches('pin-id-here');
```

### 问题 3: 认领按钮不显示

**症状**: 看不到 "Claim This Item" 按钮

**排查**:
1. 确认不是失主账户（失主不能认领自己的物品）
2. 确认报告状态是 "open"
3. 检查浏览器控制台错误

### 问题 4: 地图不显示

**症状**: 空白地图或错误

**解决**:
1. 检查 `NEXT_PUBLIC_MAPBOX_TOKEN` 是否正确
2. 确认 token 以 `pk.` 开头
3. 检查 Mapbox Dashboard 配额

---

## 📝 测试完成报告

### 测试通过 ✅

如果所有检查项都通过：

**恭喜！您的系统完全正常工作！** 🎉

您现在可以：
- ✅ 自信地部署到 Vercel
- ✅ 邀请真实用户测试
- ✅ 开始收集反馈
- ✅ 计划下一阶段功能

### 测试失败 ❌

如果有问题：

1. 记录具体错误信息
2. 检查浏览器控制台
3. 检查 Supabase 日志
4. 参考上面的故障排查部分
5. 告诉我具体问题，我会帮您解决

---

## 🚀 测试通过后的下一步

### 选项 1: 部署到 Vercel

参考 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### 选项 2: 完成可选集成

- 在地图上显示安全地点标记
- 认领审核时集成地点选择

### 选项 3: 邀请用户测试

- 创建测试用户指南
- 收集反馈
- 迭代改进

---

**准备好开始测试了吗？** 🧪

告诉我您已经到哪一步，或遇到任何问题！
