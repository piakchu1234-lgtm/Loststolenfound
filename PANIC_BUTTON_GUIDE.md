# 🚨 紧急按钮系统实施指南

**功能**: Emergency Panic Button  
**状态**: ✅ 已完成  
**优先级**: 🔴 高（安全功能）

---

## 🎉 功能完成

### ✅ 已实现的功能

#### 紧急按钮 UI
- ✅ 浮动红色按钮（右下角，显眼）
- ✅ 脉动动画效果
- ✅ 点击后显示紧急对话框
- ✅ 响应式设计

#### 紧急选项
1. **拨打警察 (000)**
   - 一键拨打澳洲紧急服务
   - 蓝色按钮，电话图标
   - 自动记录事件

2. **激活警报**
   - 播放响亮的警报声
   - 屏幕闪烁红色
   - 通知附近用户
   - 自动记录事件
   - 2 分钟后自动停止

#### 数据库功能
- ✅ 记录所有紧急事件
- ✅ 存储位置信息
- ✅ 时间戳
- ✅ 附近紧急事件查询
- ✅ 管理员可以标记为已解决

#### 安全功能
- ✅ 用户认证验证
- ✅ RLS 策略保护
- ✅ 隐私保护
- ✅ 审计追踪

---

## 📁 文件清单

### 数据库迁移
- `supabase/migrations/20260707_add_emergency_system.sql`
  - emergency_events 表
  - RLS 策略
  - 附近事件查询函数
  - 索引优化

### API 函数
- `lib/emergency.ts`
  - createEmergencyEvent() - 创建紧急事件
  - getNearbyEmergencies() - 获取附近紧急事件
  - resolveEmergency() - 标记为已解决
  - getUserEmergencyEvents() - 获取用户事件
  - subscribeToNearbyEmergencies() - 实时订阅
  - notifyNearbyUsers() - 通知附近用户

### UI 组件
- `components/panic-button.tsx`
  - PanicButton 组件
  - 紧急对话框
  - 警报系统
  - 声音生成

---

## 🚀 集成步骤

### 步骤 1: 应用数据库迁移（5 分钟）

1. 打开 Supabase Dashboard
   👉 https://supabase.com/dashboard/project/nivcvueuohxofajchssk

2. 点击 **SQL Editor**

3. 复制 `supabase/migrations/20260707_add_emergency_system.sql` 的内容

4. 粘贴并运行

5. 验证表创建成功：
   - 点击 **Table Editor**
   - 查找 `emergency_events` 表

### 步骤 2: 添加到主页面（2 分钟）

在 `app/page.tsx` 中添加：

```typescript
import { PanicButton } from '@/components/panic-button'

// 在主组件中添加
export default function HomePage() {
  // 获取用户信息和位置
  const { data: user } = useUser()
  const userLocation = { lat: -37.8136, lng: 145.0937 } // 从地图或用户位置获取

  return (
    <div>
      {/* 现有内容 */}
      
      {/* 添加紧急按钮 */}
      <PanicButton 
        userId={user?.id}
        userLocation={userLocation}
      />
    </div>
  )
}
```

### 步骤 3: 测试功能（5 分钟）

1. 启动应用
   ```bash
   npm run dev -- --port 3001
   ```

2. 查看右下角的红色紧急按钮

3. 点击按钮测试：
   - 对话框应该打开
   - 两个选项清晰可见

4. 测试"Call Police"按钮（不要实际拨打）

5. 测试"Activate Alarm"按钮：
   - 应该听到警报声
   - 屏幕应该闪烁
   - 可以点击"Stop Alarm"停止

---

## 🎨 设计特点

### 视觉设计
```
浮动按钮:
  • 位置: 右下角固定
  • 颜色: 红色 (#DC2626)
  • 大小: 64x64 像素
  • 图标: 警报八边形
  • 动画: 脉动效果
  • 阴影: 大阴影增加显眼度
```

### 交互设计
```
点击流程:
1. 用户点击紧急按钮
2. 对话框打开
3. 显示两个大按钮：
   - 拨打警察 (蓝色)
   - 激活警报 (红色)
4. 用户选择操作
5. 系统执行并记录
```

---

## 🔧 功能详解

### 拨打警察 (000)

**功能**:
- 一键拨打澳洲紧急服务 (000)
- 记录事件到数据库
- 存储位置信息

**代码**:
```typescript
const handleCallPolice = () => {
  logEmergencyEvent('police_call')
  window.location.href = 'tel:000'
}
```

**注意**:
- 仅在手机上可用
- 桌面浏览器会显示错误
- 考虑添加桌面替代方案

---

### 激活警报

**功能**:
- 播放响亮的警报声（1000Hz 方波）
- 屏幕闪烁红色
- 通知附近用户（通过 OneSignal）
- 记录事件
- 2 分钟后自动停止

**警报声**:
- 使用 Web Audio API
- 在 800Hz 和 1000Hz 之间振荡
- 每 0.5 秒切换频率
- 音量: 30%

**视觉效果**:
- 红色半透明覆盖层
- 脉动动画
- 屏幕闪烁

**通知**:
- 推送到 5km 范围内的用户
- 使用 OneSignal 地理位置过滤
- 标题: "🚨 Emergency Alert"
- 内容: "Emergency situation reported nearby. Stay alert."

---

## 📊 数据库架构

### emergency_events 表

```sql
CREATE TABLE emergency_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT CHECK (IN ('police_call', 'alarm_activated')),
  location GEOGRAPHY(POINT),
  timestamp TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ
);
```

### 索引

- `user_id` - 快速查找用户事件
- `timestamp` - 按时间排序
- `location` - 地理查询
- `resolved` - 过滤未解决事件

### RLS 策略

- ✅ 用户可以创建自己的事件
- ✅ 用户可以查看自己的事件
- ✅ 管理员可以查看所有事件
- ✅ 管理员可以更新事件（标记为已解决）

---

## 🔔 通知系统

### 附近用户通知

当用户激活警报时：

1. **记录事件**
   - 保存到数据库
   - 包含位置信息

2. **推送通知**
   - 使用 OneSignal API
   - 地理位置过滤（5km 范围）
   - 实时发送

3. **实时更新**
   - 使用 Supabase Realtime
   - 订阅 emergency_events 表
   - 附近用户实时收到警报

### OneSignal 集成

```typescript
// 需要 ONESIGNAL_REST_API_KEY
await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
  },
  body: JSON.stringify({
    app_id: NEXT_PUBLIC_ONESIGNAL_APP_ID,
    headings: { en: '🚨 Emergency Alert' },
    contents: { en: 'Emergency situation reported nearby.' },
    filters: [
      { field: 'location', radius: 5000, lat, long },
    ],
  }),
})
```

---

## 🎯 使用场景

### 场景 1: 可疑人物

**情况**: 用户看到有人试图偷窃或可疑活动

**操作**:
1. 点击紧急按钮
2. 选择"Activate Alarm"
3. 警报声吓阻嫌疑人
4. 附近用户收到警报
5. 社区协助应对

### 场景 2: 紧急危险

**情况**: 用户遇到直接威胁或危险

**操作**:
1. 点击紧急按钮
2. 选择"Call Police (000)"
3. 直接连接警察
4. 事件被记录用于后续

### 场景 3: 预防性警报

**情况**: 用户注意到可疑情况但不确定

**操作**:
1. 点击紧急按钮
2. 选择"Activate Alarm"
3. 提醒附近用户保持警惕
4. 社区提高警觉性

---

## ⚠️ 重要提示

### 责任使用

**警告用户**:
- ✅ 仅在真正紧急情况下使用
- ✅ 虚假警报可能导致账户停用
- ✅ 恶意使用可能有法律后果

**对话框中的提示**:
```
Note: The alarm will alert nearby users and play a loud sound.
Use responsibly and only in genuine emergencies.
```

### 隐私保护

- ✅ 用户位置仅在紧急时使用
- ✅ 不会公开显示用户身份
- ✅ 仅记录必要信息
- ✅ RLS 策略保护数据

### 音频考虑

- ⚠️ 警报声很响 - 警告用户
- ⚠️ 可能影响周围人 - 谨慎使用
- ✅ 自动停止（2 分钟）
- ✅ 可以手动停止

---

## 📱 响应式设计

### 移动端
- ✅ 浮动按钮大小合适（16x16 = 64px）
- ✅ 对话框全屏优化
- ✅ 按钮足够大，易于点击
- ✅ 拨打电话直接可用

### 桌面端
- ✅ 浮动按钮固定在右下角
- ✅ 对话框居中显示
- ✅ 警报功能正常
- ⚠️ 拨打电话可能不可用（显示提示）

---

## 🧪 测试清单

### 基本测试
- [ ] 紧急按钮显示在右下角
- [ ] 按钮有脉动动画
- [ ] 点击打开对话框
- [ ] 对话框显示两个选项

### 功能测试
- [ ] "Call Police" 触发 tel: 链接
- [ ] "Activate Alarm" 播放声音
- [ ] 屏幕闪烁红色
- [ ] "Stop Alarm" 停止警报
- [ ] 事件记录到数据库

### 数据库测试
- [ ] emergency_events 表创建成功
- [ ] 可以插入事件
- [ ] 可以查询附近事件
- [ ] RLS 策略工作正常

### 通知测试
- [ ] OneSignal 通知发送（需要 REST API Key）
- [ ] Realtime 订阅工作
- [ ] 附近用户收到警报

---

## 🔧 故障排查

### 问题 1: 按钮不显示

**原因**: 组件未添加到页面

**解决**:
```typescript
import { PanicButton } from '@/components/panic-button'

// 在 JSX 中添加
<PanicButton userId={user?.id} userLocation={location} />
```

### 问题 2: 警报声不播放

**原因**: 浏览器阻止音频自动播放

**解决**:
- 确保用户先交互（点击按钮）
- Chrome/Safari 需要用户手势才能播放音频
- 已在代码中处理

### 问题 3: 数据库错误

**原因**: 迁移未应用

**解决**:
1. 检查 Supabase Dashboard
2. 运行迁移 SQL
3. 验证表存在

### 问题 4: 通知未发送

**原因**: OneSignal REST API Key 未配置

**解决**:
1. 获取 REST API Key from OneSignal Dashboard
2. 添加到 `.env.local`:
   ```
   ONESIGNAL_REST_API_KEY=your-rest-key
   ```
3. 重启应用

---

## 📈 未来增强

### 短期（1-2 周）
- [ ] 添加事件历史页面
- [ ] 管理员仪表板（查看所有事件）
- [ ] 事件统计和分析
- [ ] 地图上显示最近的紧急事件

### 中期（1-2 月）
- [ ] 社区警报订阅
- [ ] 自定义警报范围
- [ ] 紧急联系人列表
- [ ] 短信通知集成

### 长期（3-6 月）
- [ ] 与本地警察集成
- [ ] 视频录制功能
- [ ] 证据上传
- [ ] 社区安全评分

---

## 🎊 总结

### 已完成
- ✅ 显眼的浮动紧急按钮
- ✅ 拨打警察功能 (000)
- ✅ 激活警报功能（声音 + 视觉）
- ✅ 数据库记录
- ✅ 附近用户通知
- ✅ 完整的文档

### 下一步
1. 应用数据库迁移
2. 添加到主页面
3. 测试所有功能
4. 获取 OneSignal REST API Key（可选）
5. 部署到生产环境

---

**紧急按钮系统已准备就绪！这是一个重要的社区安全功能。** 🚨

**参考本指南完成集成和测试！** ✅
