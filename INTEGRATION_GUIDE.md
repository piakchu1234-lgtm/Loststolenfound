# 🔧 主页面集成指南 - 匹配系统

**文件**: `app/page.tsx`  
**目的**: 集成智能匹配系统到现有的主页面

---

## 📋 需要的修改

### 1. 添加导入语句

在文件顶部的导入部分（约第 1-71 行），添加：

```typescript
// 在现有导入后添加
import { TrendingUp } from "lucide-react"  // 如果还没有
import { MatchList } from "@/components/match-list"
import { MatchComparison } from "@/components/match-comparison"
import { 
  getMatchesForPin, 
  type PotentialMatch 
} from "@/lib/matching-enhanced"
```

**位置**: 在第 56 行 `import { findPotentialMatches, type MatchPin } from "@/lib/matching"` 之后

**注意**: 现有的 `@/lib/matching` 导入可以保留（向后兼容）或替换为新的 `@/lib/matching-enhanced`

---

### 2. 添加状态管理

在组件内部的状态声明部分（约第 150-300 行），添加：

```typescript
// 在现有状态后添加
const [matches, setMatches] = useState<PotentialMatch[]>([])
const [showMatches, setShowMatches] = useState(false)
const [selectedMatch, setSelectedMatch] = useState<PotentialMatch | null>(null)
const [matchesLoading, setMatchesLoading] = useState(false)
```

**位置**: 在其他 useState 声明之后，约第 200-250 行区域

---

### 3. 添加获取匹配的函数

在组件内部的函数定义区域（约第 400-1000 行），添加：

```typescript
// 获取当前 pin 的匹配
async function fetchMatchesForPin(pinId: string) {
  if (!pinId) return
  
  try {
    setMatchesLoading(true)
    const response = await fetch(`/api/matches?pinId=${pinId}`)
    
    if (!response.ok) {
      console.error('[fetchMatchesForPin] API error')
      return
    }
    
    const data = await response.json()
    setMatches(data.matches || [])
  } catch (err) {
    console.error('[fetchMatchesForPin] Exception:', err)
    setMatches([])
  } finally {
    setMatchesLoading(false)
  }
}

// 处理匹配查看
function handleViewMatch(match: PotentialMatch) {
  setSelectedMatch(match)
  setShowMatches(false)
  
  // 标记为已查看
  fetch('/api/matches', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: match.id, status: 'viewed' })
  }).catch(err => console.error('[handleViewMatch] Error:', err))
}

// 处理匹配拒绝
function handleRejectMatch(matchId: string) {
  fetch('/api/matches', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, status: 'rejected' })
  })
  .then(() => {
    setMatches(prev => prev.filter(m => m.id !== matchId))
    setSelectedMatch(null)
  })
  .catch(err => console.error('[handleRejectMatch] Error:', err))
}

// 处理联系匹配
function handleContactMatch(match: PotentialMatch) {
  // 目前暂时关闭对比视图，打开评论
  setSelectedMatch(null)
  // 可以在这里添加直接消息功能（未来实现）
  alert('Contact feature coming soon! For now, use the comments section.')
}
```

**位置**: 在现有的 async function 定义之后，约第 600-800 行区域

---

### 4. 添加 useEffect 监听 selectedPin 变化

在现有的 useEffect hooks 区域（约第 500-600 行），添加：

```typescript
// 当选中的 pin 变化时，获取匹配
useEffect(() => {
  if (selectedPin?.id) {
    fetchMatchesForPin(selectedPin.id)
  } else {
    setMatches([])
    setShowMatches(false)
    setSelectedMatch(null)
  }
}, [selectedPin?.id])
```

**位置**: 在其他 useEffect 之后

---

### 5. 在 Pin 详情抽屉中添加匹配按钮

在 pin 详情抽屉的内容区域（约第 1700-1900 行），找到显示报告详情的地方，添加匹配按钮。

**查找位置**: 搜索 "selectedPin" 和 "Sheet" 或 "drawer"，找到显示报告详细信息的部分

**添加代码**:

```typescript
{/* 在报告详情的按钮区域添加 */}
{matches.length > 0 && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowMatches(true)}
    className="gap-2"
  >
    <TrendingUp className="h-4 w-4" />
    <span>{matches.length} Potential Match{matches.length > 1 ? 'es' : ''}</span>
    {matches.some(m => m.confidence === 'high' && m.status === 'pending') && (
      <Badge variant="destructive" className="ml-1">
        {matches.filter(m => m.confidence === 'high' && m.status === 'pending').length}
      </Badge>
    )}
  </Button>
)}

{matchesLoading && (
  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
    <Loader2 className="h-3 w-3 animate-spin" />
    Searching for matches...
  </div>
)}
```

**具体位置建议**:
- 在 "Share" 按钮附近
- 或在报告标题下方的操作按钮组中
- 约第 1750-1850 行区域

---

### 6. 添加匹配列表 Sheet

在组件的 JSX 返回部分底部（约第 2900-3000 行），在其他 Dialog/Sheet 之后添加：

```typescript
{/* Matches Sheet */}
{showMatches && selectedPin && (
  <Sheet open={showMatches} onOpenChange={setShowMatches}>
    <SheetContent 
      side="right" 
      className="w-full sm:w-[400px] p-0 overflow-hidden flex flex-col"
    >
      <MatchList
        pinId={selectedPin.id}
        onClose={() => setShowMatches(false)}
        onMatchSelect={handleViewMatch}
      />
    </SheetContent>
  </Sheet>
)}
```

**位置**: 在现有的 Dialog/Sheet 组件之后，return 语句的末尾附近

---

### 7. 添加匹配对比 Dialog

紧接着匹配列表 Sheet 之后添加：

```typescript
{/* Match Comparison Dialog */}
{selectedMatch && selectedPin && (
  <Dialog 
    open={!!selectedMatch} 
    onOpenChange={(open) => !open && setSelectedMatch(null)}
  >
    <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
      <MatchComparison
        match={selectedMatch}
        currentPinId={selectedPin.id}
        onBack={() => {
          setSelectedMatch(null)
          setShowMatches(true)
        }}
        onContact={() => handleContactMatch(selectedMatch)}
        onReject={() => handleRejectMatch(selectedMatch.id)}
      />
    </DialogContent>
  </Dialog>
)}
```

**位置**: 在匹配列表 Sheet 之后

---

## 🎨 可选：添加匹配通知徽章

如果想在主界面显示全局匹配通知，可以在顶部导航栏添加：

```typescript
{/* 在 NotificationBell 附近 */}
{session && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      // 显示用户所有匹配的视图
      // 可以导航到 /matches 页面或打开一个全局匹配列表
    }}
  >
    <TrendingUp className="h-5 w-5" />
    {/* 可以添加徽章显示未查看的匹配数量 */}
  </Button>
)}
```

---

## 📝 完整修改摘要

| 步骤 | 位置 | 修改类型 | 行数 |
|------|------|----------|------|
| 1 | 顶部导入 | 添加 | ~4 行 |
| 2 | 状态声明 | 添加 | ~4 行 |
| 3 | 函数定义 | 添加 | ~60 行 |
| 4 | useEffect | 添加 | ~10 行 |
| 5 | Pin 详情按钮 | 添加 | ~15 行 |
| 6 | Sheet 组件 | 添加 | ~10 行 |
| 7 | Dialog 组件 | 添加 | ~15 行 |

**总计**: 约 **120 行新代码**

---

## 🧪 测试清单

完成修改后，测试以下功能：

### 基本功能
- [ ] 打开任何报告详情
- [ ] 看到 "X Potential Matches" 按钮（如果有匹配）
- [ ] 点击按钮打开匹配列表
- [ ] 匹配按置信度分组显示

### 匹配列表
- [ ] 高置信度匹配显示在顶部
- [ ] 每个匹配卡片显示图片、标题、距离、时间
- [ ] 点击 "View Details" 打开对比视图
- [ ] 点击 X 拒绝匹配

### 匹配对比
- [ ] 并排显示两个报告
- [ ] 显示匹配分数分解
- [ ] 显示评分进度条
- [ ] "Contact" 按钮工作
- [ ] "Reject" 按钮工作
- [ ] "Back" 按钮返回列表

### 边缘情况
- [ ] 没有匹配时不显示按钮
- [ ] 加载时显示加载状态
- [ ] 错误时显示友好消息

---

## 🚀 下一步

完成这些修改后：

1. ✅ **第 2 天完成** - 匹配系统完全可用
2. ⏭️ **开始第 3 天** - 认领流程
3. ⏭️ **开始第 4 天** - 安全地点

---

## 💡 需要帮助？

**选项 1**: 我可以直接修改 `app/page.tsx` 文件（风险：大文件，可能需要多次编辑）

**选项 2**: 您根据这个指南手动修改（推荐，因为您了解代码结构）

**选项 3**: 我们先测试其他部分（先应用数据库迁移）

---

**您想怎么做？告诉我您的选择！** 🤔
