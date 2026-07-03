# 🔔 推送通知系统实施指南

**功能**: Web Push Notifications  
**时间**: 3-4 天  
**优先级**: P0（必须有）

---

## 📋 功能概述

### 目标
让用户能够接收实时通知，即使不在应用中也能及时了解重要更新。

### 通知类型
1. **新匹配发现** - 高置信度匹配（≥70%）
2. **认领请求** - 有人认领您的物品
3. **认领更新** - 您的认领被批准/拒绝
4. **新评论** - 有人评论您的报告
5. **物品完成** - 认领被标记为完成

---

## 🏗️ 技术架构

### 方案选择

#### 选项 1: OneSignal（推荐）
**优点**:
- ✅ 免费（< 10,000 订阅者）
- ✅ 简单集成
- ✅ Web + 移动支持
- ✅ 分析仪表板

**缺点**:
- ⚠️ 第三方依赖

#### 选项 2: Firebase Cloud Messaging
**优点**:
- ✅ Google 支持
- ✅ 可靠
- ✅ 免费

**缺点**:
- ⚠️ 设置复杂

#### 选项 3: 自建 Service Worker
**优点**:
- ✅ 完全控制
- ✅ 无第三方依赖

**缺点**:
- ⚠️ 开发时间长
- ⚠️ 需要维护

**推荐**: OneSignal（快速启动）

---

## 📝 实施步骤

### 步骤 1: OneSignal 设置（30 分钟）

#### 1.1 创建 OneSignal 账户
1. 访问 https://onesignal.com
2. 注册免费账户
3. 创建新应用
4. 选择 **Web Push**

#### 1.2 配置应用
```javascript
// 在 OneSignal Dashboard
App Name: LostStolenFound
Site URL: https://your-domain.vercel.app
Auto Resubscribe: Enabled
Default Notification Icon: 上传 logo
```

#### 1.3 获取 App ID
复制 **App ID** 和 **Safari Web ID**（如果支持 Safari）

---

### 步骤 2: 前端集成（1-2 小时）

#### 2.1 安装 OneSignal SDK

```bash
npm install react-onesignal
```

#### 2.2 创建 OneSignal 配置

**文件**: `lib/onesignal.ts`

```typescript
export const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''

export function initOneSignal() {
  if (typeof window === 'undefined') return

  window.OneSignal = window.OneSignal || []
  
  window.OneSignal.push(function() {
    window.OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID,
      notifyButton: {
        enable: false, // 我们会创建自定义按钮
      },
      allowLocalhostAsSecureOrigin: true,
    })
  })
}

export async function subscribeToNotifications(userId: string) {
  if (typeof window === 'undefined') return

  try {
    await window.OneSignal.push(async function() {
      await window.OneSignal.setExternalUserId(userId)
      await window.OneSignal.showNativePrompt()
    })
    
    return true
  } catch (error) {
    console.error('[OneSignal] Subscribe error:', error)
    return false
  }
}

export async function unsubscribeFromNotifications() {
  if (typeof window === 'undefined') return

  try {
    await window.OneSignal.push(function() {
      window.OneSignal.setSubscription(false)
    })
    return true
  } catch (error) {
    console.error('[OneSignal] Unsubscribe error:', error)
    return false
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const isPushSupported = await window.OneSignal.isPushNotificationsSupported()
    if (!isPushSupported) return false

    const permissionGranted = await window.OneSignal.getNotificationPermission()
    return permissionGranted === 'granted'
  } catch (error) {
    return false
  }
}
```

#### 2.3 添加 TypeScript 类型

**文件**: `types/onesignal.d.ts`

```typescript
interface Window {
  OneSignal: any[]
}
```

#### 2.4 在 App 中初始化

**文件**: `app/layout.tsx`

在现有代码中添加：

```typescript
'use client'

import { useEffect } from 'react'
import { initOneSignal } from '@/lib/onesignal'

export default function RootLayout({ children }) {
  useEffect(() => {
    // 初始化 OneSignal
    initOneSignal()
  }, [])

  return (
    // ... 现有代码
  )
}
```

#### 2.5 添加环境变量

**文件**: `.env.local`

```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id-here
NEXT_PUBLIC_ONESIGNAL_SAFARI_ID=web.onesignal.auto.xxx (可选)
```

---

### 步骤 3: 通知偏好设置 UI（2 小时）

#### 3.1 创建通知设置组件

**文件**: `components/notification-settings.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { subscribeToNotifications, unsubscribeFromNotifications, isSubscribed } from '@/lib/onesignal'

export function NotificationSettings({ userId }: { userId: string }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState({
    matches: true,
    claims: true,
    comments: true,
    updates: true,
  })

  useEffect(() => {
    checkSubscriptionStatus()
  }, [])

  async function checkSubscriptionStatus() {
    const subscribed = await isSubscribed()
    setIsEnabled(subscribed)
  }

  async function toggleNotifications() {
    setLoading(true)

    try {
      if (isEnabled) {
        await unsubscribeFromNotifications()
        setIsEnabled(false)
      } else {
        const success = await subscribeToNotifications(userId)
        if (success) {
          setIsEnabled(true)
        }
      }
    } catch (error) {
      console.error('Toggle notifications error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about matches, claims, and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 主开关 */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notifications-toggle" className="font-semibold">
              Enable Notifications
            </Label>
            <p className="text-sm text-gray-500">
              Receive real-time updates
            </p>
          </div>
          <Button
            variant={isEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={toggleNotifications}
            disabled={loading}
          >
            {isEnabled ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enabled
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Disabled
              </>
            )}
          </Button>
        </div>

        {/* 通知类型偏好 */}
        {isEnabled && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold">Notification Types</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="matches" className="cursor-pointer">
                New Matches
              </Label>
              <Switch
                id="matches"
                checked={preferences.matches}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, matches: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="claims" className="cursor-pointer">
                Claim Requests
              </Label>
              <Switch
                id="claims"
                checked={preferences.claims}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, claims: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="comments" className="cursor-pointer">
                New Comments
              </Label>
              <Switch
                id="comments"
                checked={preferences.comments}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, comments: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="updates" className="cursor-pointer">
                Status Updates
              </Label>
              <Switch
                id="updates"
                checked={preferences.updates}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, updates: checked })
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### 3.2 添加到个人资料页面

**文件**: `app/profile/page.tsx`

```typescript
import { NotificationSettings } from '@/components/notification-settings'

// 在个人资料页面中添加
<NotificationSettings userId={user.id} />
```

---

### 步骤 4: 后端通知触发（2-3 小时）

#### 4.1 创建通知服务

**文件**: `lib/notifications.ts`

```typescript
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || ''
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || ''

interface NotificationPayload {
  userIds: string[]
  heading: string
  content: string
  url?: string
  data?: Record<string, any>
}

export async function sendPushNotification(payload: NotificationPayload) {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: payload.userIds,
        headings: { en: payload.heading },
        contents: { en: payload.content },
        url: payload.url,
        data: payload.data,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('[OneSignal] Send notification error:', data)
      return { success: false, error: data }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[OneSignal] Exception:', error)
    return { success: false, error }
  }
}

// 便捷函数

export async function notifyNewMatch(userId: string, matchData: {
  itemTitle: string
  matchScore: number
  pinId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'New Match Found! 🎯',
    content: `We found a ${matchData.matchScore}% match for "${matchData.itemTitle}"`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/?pin=${matchData.pinId}`,
    data: { type: 'match', pinId: matchData.pinId },
  })
}

export async function notifyClaimReceived(userId: string, claimData: {
  itemTitle: string
  claimerName: string
  claimId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'Someone Claimed Your Item! 📦',
    content: `${claimerName} claimed "${claimData.itemTitle}". Review their evidence.`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}`,
    data: { type: 'claim_received', claimId: claimData.claimId },
  })
}

export async function notifyClaimApproved(userId: string, claimData: {
  itemTitle: string
  claimId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'Claim Approved! ✅',
    content: `Your claim for "${claimData.itemTitle}" was approved. Coordinate the exchange!`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimData.claimId}`,
    data: { type: 'claim_approved', claimId: claimData.claimId },
  })
}

export async function notifyClaimRejected(userId: string, claimData: {
  itemTitle: string
  reason?: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'Claim Update',
    content: `Your claim for "${claimData.itemTitle}" was not approved.${claimData.reason ? ` Reason: ${claimData.reason}` : ''}`,
    data: { type: 'claim_rejected' },
  })
}

export async function notifyNewComment(userId: string, commentData: {
  itemTitle: string
  commenterName: string
  pinId: string
}) {
  return sendPushNotification({
    userIds: [userId],
    heading: 'New Comment 💬',
    content: `${commentData.commenterName} commented on "${commentData.itemTitle}"`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/?pin=${commentData.pinId}`,
    data: { type: 'comment', pinId: commentData.pinId },
  })
}
```

#### 4.2 在 Supabase 触发器中调用

**文件**: 更新现有的数据库触发器

```sql
-- 在匹配创建时发送通知
CREATE OR REPLACE FUNCTION notify_on_high_confidence_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.overall_score >= 70 THEN
    -- 调用 Edge Function 发送通知
    PERFORM
      net.http_post(
        url := 'YOUR_EDGE_FUNCTION_URL/notify-match',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'userId', NEW.lost_item.user_id,
          'matchData', json_build_object(
            'itemTitle', NEW.lost_item.title,
            'matchScore', NEW.overall_score,
            'pinId', NEW.lost_item_id
          )
        )::jsonb
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 步骤 5: 测试（1 小时）

#### 5.1 本地测试
1. 启动开发服务器
2. 注册测试账户
3. 启用通知
4. 触发通知事件
5. 验证通知显示

#### 5.2 生产测试清单
- [ ] 通知权限请求正常
- [ ] 订阅成功
- [ ] 通知正确发送
- [ ] 点击通知跳转正确
- [ ] 取消订阅正常

---

## 🎯 完成标准

- [ ] OneSignal 集成完成
- [ ] 通知设置 UI 可用
- [ ] 5 种通知类型都能发送
- [ ] 用户可以控制通知偏好
- [ ] 在生产环境测试通过

---

## 📝 环境变量

添加到 `.env.local` 和 Vercel:

```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=xxx
ONESIGNAL_REST_API_KEY=xxx (后端使用)
ONESIGNAL_APP_ID=xxx (后端使用)
```

---

**预计时间**: 3-4 天  
**优先级**: P0  
**影响**: 用户留存 +30%, 响应时间 -50%

准备好开始实施了吗？🚀
