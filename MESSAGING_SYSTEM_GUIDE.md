# 💬 直接消息系统实施指南

**功能**: 1对1 实时聊天系统  
**状态**: ✅ 已完成  
**时间**: 3-4 天开发

---

## 🎉 功能完成

### ✅ 已实现的功能

#### 核心功能
- ✅ 1对1 实时聊天
- ✅ 消息历史记录
- ✅ 未读消息跟踪
- ✅ 图片分享
- ✅ 实时更新（WebSocket）
- ✅ 已读状态
- ✅ 消息时间戳

#### 安全功能
- ✅ Row Level Security (RLS)
- ✅ 用户只能看到自己的会话
- ✅ 防止未授权访问
- ✅ 消息验证

#### 性能优化
- ✅ 数据库索引
- ✅ 分页加载
- ✅ 实时订阅优化
- ✅ 自动清理

---

## 📁 文件清单

### 数据库
- `supabase/migrations/20260706_add_messaging_system.sql`
  - conversations 表
  - messages 表
  - RLS 策略
  - 4个优化函数
  - 8个索引

### 后端
- `lib/messaging.ts`
  - 9个 API 函数
  - TypeScript 类型
  - 实时订阅
  - 图片上传

### 前端
- `components/conversation-list.tsx` - 会话列表 UI
- `components/chat-window.tsx` - 聊天窗口 UI

---

## 🚀 如何使用

### 1. 应用数据库迁移

```bash
# 在 Supabase Dashboard:
# 1. 进入 SQL Editor
# 2. 复制 20260706_add_messaging_system.sql 内容
# 3. 执行 SQL
```

### 2. 创建 Storage Bucket

在 Supabase Dashboard:
1. 进入 **Storage**
2. 创建新 bucket: `message-attachments`
3. 设置为 **Public**
4. 配置 RLS 策略：

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

### 3. 集成到应用

在需要消息功能的页面使用组件：

```typescript
'use client'

import { useState } from 'react'
import { ConversationList } from '@/components/conversation-list'
import { ChatWindow } from '@/components/chat-window'
import { Conversation } from '@/lib/messaging'

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const userId = 'current-user-id' // 从 auth 获取

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 会话列表 */}
        <div className="md:col-span-1">
          <ConversationList
            userId={userId}
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>

        {/* 聊天窗口 */}
        <div className="md:col-span-2">
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              currentUserId={userId}
              otherUserName={selectedConversation.other_user?.user_metadata?.name}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 4. 创建会话

从报告或认领页面启动对话：

```typescript
import { getOrCreateConversation } from '@/lib/messaging'

// 在认领页面
async function startConversation(otherUserId: string, pinId: string) {
  const { data: conversationId, error } = await getOrCreateConversation(
    currentUserId,
    otherUserId,
    pinId
  )

  if (conversationId) {
    // 跳转到消息页面
    router.push(`/messages?conversation=${conversationId}`)
  }
}
```

---

## 🎨 UI 功能

### 会话列表 (ConversationList)

**功能**:
- 显示所有会话
- 搜索功能
- 未读消息徽章
- 最后消息预览
- 相对时间显示
- 实时更新

**Props**:
```typescript
{
  userId: string                                    // 当前用户 ID
  onSelectConversation: (conv: Conversation) => void // 选择回调
  selectedConversationId?: string                   // 当前选中的会话
}
```

---

### 聊天窗口 (ChatWindow)

**功能**:
- 消息历史加载
- 发送文本消息
- 发送图片
- 实时接收消息
- 自动标记已读
- 响应式设计

**Props**:
```typescript
{
  conversationId: string  // 会话 ID
  currentUserId: string   // 当前用户 ID
  otherUserName?: string  // 对方用户名（可选）
}
```

**键盘快捷键**:
- `Enter` - 发送消息
- `Shift + Enter` - 换行

---

## 🔧 API 函数

### 会话管理

```typescript
// 获取或创建会话
const { data: conversationId } = await getOrCreateConversation(
  user1Id,
  user2Id,
  pinId?,      // 可选：关联的报告 ID
  claimId?     // 可选：关联的认领 ID
)

// 获取用户的所有会话
const { data: conversations } = await getUserConversations(userId)

// 获取会话消息
const { data: messages } = await getConversationMessages(
  conversationId,
  limit?,   // 默认 50
  offset?   // 默认 0
)
```

### 消息操作

```typescript
// 发送消息
const { data: message } = await sendMessage(
  conversationId,
  senderId,
  content?,      // 文本内容
  attachments?,  // 图片 URL 数组
  messageType?,  // 'text' | 'image' | 'location' | 'system'
  metadata?      // 额外数据
)

// 标记已读
const { count } = await markMessagesAsRead(conversationId, userId)
```

### 实时订阅

```typescript
// 订阅新消息
const unsubscribe = subscribeToConversationMessages(
  conversationId,
  (newMessage) => {
    console.log('New message:', newMessage)
  }
)

// 订阅会话更新
const unsubscribe = subscribeToUserConversations(
  userId,
  () => {
    console.log('Conversation updated')
  }
)

// 清理订阅
unsubscribe()
```

### 图片上传

```typescript
// 上传图片附件
const { url } = await uploadMessageAttachment(file, conversationId)

if (url) {
  // 发送带图片的消息
  await sendMessage(conversationId, userId, undefined, [url], 'image')
}
```

---

## 📊 数据库架构

### conversations 表

```sql
id                     UUID PRIMARY KEY
user1_id               UUID (较小的用户 ID)
user2_id               UUID (较大的用户 ID)
pin_id                 UUID (可选)
claim_id               UUID (可选)
last_message_at        TIMESTAMPTZ
last_message_preview   TEXT
last_message_sender_id UUID
created_at             TIMESTAMPTZ
updated_at             TIMESTAMPTZ
```

**约束**:
- `user1_id < user2_id` - 确保唯一性
- `UNIQUE(user1_id, user2_id)` - 防止重复会话

### messages 表

```sql
id               UUID PRIMARY KEY
conversation_id  UUID
sender_id        UUID
content          TEXT
attachments      TEXT[]
message_type     TEXT ('text' | 'image' | 'location' | 'system')
read             BOOLEAN
read_at          TIMESTAMPTZ
metadata         JSONB
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

---

## 🔒 安全策略

### RLS 策略

**conversations**:
- 用户只能查看自己参与的会话
- 用户只能创建自己参与的会话
- 用户只能更新自己参与的会话

**messages**:
- 用户只能查看自己会话中的消息
- 用户只能在自己的会话中发送消息
- 用户只能删除自己发送的消息

---

## 🎯 集成示例

### 在报告详情页添加"联系"按钮

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { getOrCreateConversation } from '@/lib/messaging'
import { useRouter } from 'next/navigation'

export function ContactButton({ 
  itemOwnerId, 
  currentUserId, 
  pinId 
}: { 
  itemOwnerId: string
  currentUserId: string
  pinId: string 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleContact() {
    setLoading(true)
    const { data: conversationId } = await getOrCreateConversation(
      currentUserId,
      itemOwnerId,
      pinId
    )

    if (conversationId) {
      router.push(`/messages?conversation=${conversationId}`)
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleContact} disabled={loading}>
      <MessageCircle className="h-4 w-4 mr-2" />
      Contact Owner
    </Button>
  )
}
```

---

## 🧪 测试

### 手动测试步骤

1. **创建会话**
   - 用户 A 打开一个报告
   - 点击"联系"按钮
   - 验证会话创建成功

2. **发送消息**
   - 用户 A 发送文本消息
   - 验证消息出现在聊天窗口

3. **实时更新**
   - 用户 B 在另一个浏览器登录
   - 用户 B 回复消息
   - 验证用户 A 实时收到消息

4. **未读消息**
   - 用户 A 登出
   - 用户 B 发送多条消息
   - 用户 A 重新登录
   - 验证未读徽章显示正确数字

5. **图片分享**
   - 点击图片图标
   - 选择图片上传
   - 验证图片显示在聊天中

6. **标记已读**
   - 打开有未读消息的会话
   - 验证未读徽章消失

---

## 📈 性能考虑

### 优化建议

1. **分页加载** - 默认加载最近 50 条消息
2. **虚拟滚动** - 大量消息时使用虚拟列表
3. **图片压缩** - 上传前压缩图片
4. **连接池** - Realtime 连接复用
5. **缓存** - 会话列表缓存

### 监控指标

- 消息发送延迟
- 实时更新延迟
- 未读消息准确性
- 图片上传成功率
- WebSocket 连接稳定性

---

## 🐛 已知限制

1. **群聊** - 当前只支持 1对1，不支持群聊
2. **消息编辑** - 不支持编辑已发送的消息
3. **消息删除** - 只能删除自己的消息
4. **已读回执** - 只有布尔值，没有精确时间
5. **打字指示器** - 未实现"正在输入..."

---

## 🔮 未来增强

### 短期（1-2周）
- [ ] 打字指示器
- [ ] 消息编辑/删除
- [ ] 消息搜索
- [ ] 表情符号选择器

### 中期（1-2月）
- [ ] 语音消息
- [ ] 视频通话
- [ ] 文件分享（PDF, DOC等）
- [ ] 消息引用/回复

### 长期（3-6月）
- [ ] 群聊支持
- [ ] 消息加密
- [ ] 消息备份
- [ ] 跨设备同步

---

## ✅ 完成检查清单

### 数据库
- [x] 创建 conversations 表
- [x] 创建 messages 表
- [x] 配置 RLS 策略
- [x] 创建优化函数
- [x] 添加索引

### 后端
- [x] 会话管理 API
- [x] 消息操作 API
- [x] 实时订阅
- [x] 图片上传

### 前端
- [x] 会话列表组件
- [x] 聊天窗口组件
- [x] 实时更新
- [x] 响应式设计

### 部署
- [ ] 应用数据库迁移
- [ ] 创建 Storage bucket
- [ ] 配置 Storage RLS
- [ ] 集成到应用
- [ ] 测试功能

---

**直接消息系统已准备就绪！** 🎉

按照本指南应用迁移并集成到您的应用中。
