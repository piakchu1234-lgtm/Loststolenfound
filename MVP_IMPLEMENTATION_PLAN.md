# 🎯 MVP 实施计划 - 1 周冲刺

**目标**: 添加 3 个核心功能使应用完整  
**时间**: 5 个工作日  
**开始日期**: 2026-07-03

---

## 📋 功能清单

### ✅ 功能 1: 智能物品匹配算法（第 1-2 天）

#### 当前状态
- 基础 `findPotentialMatches()` 在 `lib/matching.ts`
- 只检查相反类别和时间范围
- 无相似度评分

#### 目标状态
- 多维度匹配评分系统
- 关键词相似度分析
- 位置距离评分
- 时间接近度评分
- 综合匹配分数（0-100）
- 自动通知匹配

#### 技术实现

**文件修改**:
1. `lib/matching.ts` - 增强匹配逻辑
2. `app/page.tsx` - 显示匹配分数
3. `supabase/migrations/` - 添加匹配表

**新功能**:
```typescript
interface MatchScore {
  matchId: string
  lostItemId: string
  foundItemId: string
  keywordScore: number      // 0-100
  locationScore: number     // 0-100  
  timeScore: number         // 0-100
  categoryMatch: boolean
  overallScore: number      // 加权平均
  confidence: 'high' | 'medium' | 'low'
}
```

**算法逻辑**:

1. **关键词匹配** (40% 权重)
   - 提取关键词（颜色、品牌、物品类型）
   - 计算文本相似度（Levenshtein 距离）
   - 分数：匹配关键词数 / 总关键词数 * 100

2. **位置匹配** (30% 权重)
   - 计算地理距离（Haversine 公式）
   - 分数：max(0, 100 - (距离km * 10))
   - < 1km = 90-100分，< 5km = 50-90分

3. **时间匹配** (20% 权重)
   - 报告时间差（小时）
   - 分数：max(0, 100 - (时间差天 * 5))
   - 同一天 = 95-100分，7天内 = 65-95分

4. **类别匹配** (10% 权重)
   - 必须匹配相反类别
   - lost_property ↔ found_property
   - missing_pet ↔ found_pet

**综合分数**:
```
overallScore = (keywordScore * 0.4) + 
               (locationScore * 0.3) + 
               (timeScore * 0.2) +
               (categoryMatch ? 10 : 0)
```

**置信度等级**:
- High: score >= 70
- Medium: score >= 50
- Low: score < 50

#### 数据库更改

**新表: potential_matches**
```sql
CREATE TABLE potential_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id UUID REFERENCES MapPin(id) ON DELETE CASCADE,
  found_item_id UUID REFERENCES MapPin(id) ON DELETE CASCADE,
  keyword_score INTEGER,
  location_score INTEGER,
  time_score INTEGER,
  overall_score INTEGER,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'claimed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lost_item_id, found_item_id)
);

CREATE INDEX idx_matches_lost ON potential_matches(lost_item_id, overall_score DESC);
CREATE INDEX idx_matches_found ON potential_matches(found_item_id, overall_score DESC);
CREATE INDEX idx_matches_score ON potential_matches(overall_score DESC, status);
```

#### UI 改进

**匹配通知徽章**:
- 在报告详情显示"X 个潜在匹配"
- 按分数排序显示匹配列表
- 高置信度匹配突出显示
- 点击查看匹配详情对比

**匹配对比视图**:
```
┌─────────────────────────────────────┐
│  您的报告        vs    潜在匹配     │
├─────────────────────────────────────┤
│  [图片]              [图片]         │
│  蓝色钱包            黑色钱包        │
│  中央车站            Malvern站       │
│  6月15日             6月16日         │
│                                     │
│  匹配分数: 78% (高置信度)           │
│  ✓ 位置相近 (2.3km)                │
│  ✓ 时间接近 (1天)                   │
│  ⚠ 颜色不完全匹配                   │
│                                     │
│  [联系失主]  [不是我的]             │
└─────────────────────────────────────┘
```

#### 测试场景

1. **完美匹配** (90-100分)
   - 同一位置、同一天、关键词完全匹配
   - 预期：立即通知两方

2. **好匹配** (70-89分)
   - 附近位置、几天内、大部分关键词匹配
   - 预期：显示在匹配列表顶部

3. **可能匹配** (50-69分)
   - 同一区域、一周内、部分关键词匹配
   - 预期：显示但标记为"可能"

4. **低匹配** (<50分)
   - 不显示，避免噪音

---

### ✅ 功能 2: 认领验证流程（第 3 天）

#### 当前状态
- 用户可以评论和投票
- 无认领机制
- 无验证流程

#### 目标状态
- "认领此物品"按钮
- 多步骤验证流程
- 双方确认系统
- 安全交换协调

#### 技术实现

**文件修改**:
1. `app/page.tsx` - 添加认领 UI
2. `supabase/migrations/` - 添加认领表

**新表: claims**
```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID REFERENCES MapPin(id) ON DELETE CASCADE,
  claimer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  claimer_evidence TEXT NOT NULL,
  claimer_photos TEXT[], -- 验证照片 URLs
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  owner_response TEXT,
  meeting_location TEXT,
  meeting_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_pin ON claims(pin_id, status);
CREATE INDEX idx_claims_user ON claims(claimer_id, status);
```

#### 认领流程

**步骤 1: 认领请求**
```
用户点击 "认领此物品"
↓
弹出表单:
- "请描述此物品的具体特征"
- "上传所有权证明（可选照片）"
- "选择方便的交换地点"
- [提交认领]
```

**步骤 2: 失主审核**
```
失主收到通知
↓
查看认领详情:
- 认领者的描述
- 证明照片
- 用户信誉评分
↓
决策:
[批准认领] 或 [拒绝] 或 [需要更多信息]
```

**步骤 3: 交换协调**
```
认领批准后
↓
系统提供:
- 推荐的安全交换地点
- 日程调度工具
- 直接消息功能
↓
双方确认见面
```

**步骤 4: 完成确认**
```
见面后
↓
失主确认: "物品已归还" ✓
认领者确认: "物品已收到" ✓
↓
系统更新:
- 报告状态 → "resolved"
- 增加双方信誉分
- 显示成功故事
```

#### UI 组件

**认领按钮**（仅非失主可见）:
```tsx
{!isOwner && pin.status === 'open' && (
  <Button onClick={() => setShowClaimDialog(true)}>
    <Check className="h-4 w-4" />
    认领此物品
  </Button>
)}
```

**认领对话框**:
```tsx
<Dialog open={showClaimDialog}>
  <DialogTitle>认领此物品</DialogTitle>
  <DialogDescription>
    为了验证所有权，请提供以下信息：
  </DialogDescription>
  
  <Label>描述物品的独特特征</Label>
  <Textarea 
    placeholder="例如：钱包里有我的驾照，姓名是..."
    value={claimEvidence}
    onChange={(e) => setClaimEvidence(e.target.value)}
  />
  
  <Label>上传所有权证明（可选）</Label>
  <Input type="file" accept="image/*" multiple />
  
  <Label>选择交换地点</Label>
  <Select>
    <option>Malvern East 警察局</option>
    <option>Chadstone 购物中心</option>
    <option>Central Park Cafe</option>
  </Select>
  
  <DialogFooter>
    <Button onClick={submitClaim}>提交认领</Button>
  </DialogFooter>
</Dialog>
```

**失主审核视图**:
```tsx
<Card className="border-orange-200">
  <CardHeader>
    <Badge variant="warning">待审核认领</Badge>
    <h3>{claimerName} 认领了您的报告</h3>
  </CardHeader>
  <CardContent>
    <p><strong>他们的描述:</strong></p>
    <p>{claimEvidence}</p>
    
    {claimPhotos.length > 0 && (
      <div className="grid grid-cols-2 gap-2">
        {claimPhotos.map(photo => (
          <Image src={photo} alt="证明" />
        ))}
      </div>
    )}
    
    <div className="flex gap-2 mt-4">
      <Button onClick={() => approveClaim(claimId)}>
        批准认领
      </Button>
      <Button variant="outline" onClick={() => requestMoreInfo(claimId)}>
        需要更多信息
      </Button>
      <Button variant="destructive" onClick={() => rejectClaim(claimId)}>
        拒绝
      </Button>
    </div>
  </CardContent>
</Card>
```

#### 通知系统

**新认领通知**（发送给失主）:
```
🔔 有人认领了您的报告！

[用户名] 认领了 "[物品标题]"

他们提供的信息:
"[认领证据]"

[查看并审核认领]
```

**认领批准通知**（发送给认领者）:
```
✅ 您的认领已批准！

失主已批准您对 "[物品标题]" 的认领。

下一步:
- 协调见面时间
- 选择安全交换地点
- 准备身份证明

[查看详情并安排见面]
```

#### 安全措施

1. **验证要求**:
   - 认领者必须是已验证邮箱
   - 需要描述 > 50 字符
   - 可选但鼓励上传照片

2. **防止滥用**:
   - 每用户每报告只能认领 1 次
   - 速率限制：每天 5 个认领
   - 多次拒绝降低信誉分

3. **隐私保护**:
   - 批准前不显示联系信息
   - 可选择匿名认领
   - 报告可选择"需要验证才能认领"

---

### ✅ 功能 3: 安全交换地点数据库（第 4 天）

#### 当前状态
- 无安全地点建议
- 用户自行协调见面

#### 目标状态
- Malvern East 的安全地点列表
- 地图上的可视化标记
- 推荐系统
- 按距离排序

#### 技术实现

**新表: safe_locations**
```sql
CREATE TABLE safe_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('police_station', 'shopping_center', 'public_space', 'cafe', 'library')),
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  hours TEXT, -- 例如 "24/7" 或 "9am-5pm Mon-Fri"
  description TEXT,
  facilities TEXT[], -- ['parking', 'cctv', 'security', 'indoor']
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safe_locations_type ON safe_locations(type);
CREATE INDEX idx_safe_locations_coords ON safe_locations(latitude, longitude);
```

#### 预填充数据

**Malvern East 安全地点**:
```sql
INSERT INTO safe_locations (name, type, address, latitude, longitude, hours, facilities) VALUES
  ('Malvern East Police Station', 'police_station', '1395 Malvern Rd, Malvern East VIC 3145', -37.8742, 145.0603, '24/7', ARRAY['parking', 'cctv', 'security']),
  
  ('Chadstone Shopping Centre', 'shopping_center', '1341 Dandenong Rd, Chadstone VIC 3148', -37.8862, 145.0830, '9am-5:30pm Daily', ARRAY['parking', 'cctv', 'security', 'indoor', 'food']),
  
  ('Central Park Shopping Centre', 'shopping_center', '14 Clarendon St, Malvern East VIC 3145', -37.8755, 145.0669, '9am-6pm Daily', ARRAY['parking', 'cctv', 'indoor']),
  
  ('Darling Station', 'public_space', 'Darling Railway Station, Malvern East VIC 3145', -37.8708, 145.0650, '24/7', ARRAY['cctv', 'lighting', 'public']),
  
  ('Lloyd Street Reserve', 'public_space', 'Lloyd St, Malvern East VIC 3145', -37.8722, 145.0592, 'Daylight hours', ARRAY['parking', 'lighting']),
  
  ('Central Park Cafe', 'cafe', '18 Waverley Rd, Malvern East VIC 3145', -37.8761, 145.0681, '7am-4pm Daily', ARRAY['indoor', 'public']),
  
  ('Malvern Library', 'library', '1082 Malvern Rd, Malvern VIC 3144', -37.8644, 145.0314, '10am-6pm Mon-Fri', ARRAY['parking', 'cctv', 'indoor']),
  
  ('Stonnington City Council', 'public_space', '311 Glenferrie Rd, Malvern VIC 3144', -37.8635, 145.0267, '8:30am-5pm Mon-Fri', ARRAY['parking', 'security', 'indoor']);
```

#### UI 集成

**地图上的安全地点标记**:
```tsx
// 在 Map 组件中添加
{safeLocations.map(location => (
  <Marker
    key={location.id}
    latitude={location.latitude}
    longitude={location.longitude}
  >
    <div className="relative">
      {/* 绿色标记表示安全地点 */}
      <div className="h-8 w-8 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center">
        <ShieldCheck className="h-4 w-4 text-white" />
      </div>
      
      {/* 悬停显示名称 */}
      <div className="absolute bottom-full mb-2 px-2 py-1 bg-white rounded shadow-lg text-xs whitespace-nowrap">
        {location.name}
      </div>
    </div>
  </Marker>
))}
```

**安全地点列表（侧边栏）**:
```tsx
<div className="p-4 border-t">
  <h3 className="font-semibold flex items-center gap-2">
    <ShieldCheck className="h-4 w-4 text-green-600" />
    推荐安全交换地点
  </h3>
  
  {nearestSafeLocations.map(loc => (
    <Card key={loc.id} className="mt-2 p-3 cursor-pointer hover:bg-green-50">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
          {getTypeIcon(loc.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{loc.name}</p>
          <p className="text-xs text-gray-600">{loc.address}</p>
          <p className="text-xs text-gray-500">{loc.hours}</p>
          <p className="text-xs text-green-600 font-medium mt-1">
            {calculateDistance(userLocation, loc)} away
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => flyToLocation(loc)}>
          查看
        </Button>
      </div>
      
      {/* 设施图标 */}
      <div className="flex gap-2 mt-2">
        {loc.facilities.map(facility => (
          <Badge key={facility} variant="secondary" className="text-xs">
            {facilityLabels[facility]}
          </Badge>
        ))}
      </div>
    </Card>
  ))}
</div>
```

**认领对话框中的地点选择器**:
```tsx
<Label>选择交换地点</Label>
<Select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
  <option value="">选择安全地点...</option>
  <optgroup label="警察局（最安全）">
    {safeLocations.filter(l => l.type === 'police_station').map(l => (
      <option value={l.id}>
        {l.name} - {l.distance}
      </option>
    ))}
  </optgroup>
  <optgroup label="购物中心">
    {safeLocations.filter(l => l.type === 'shopping_center').map(l => (
      <option value={l.id}>
        {l.name} - {l.distance}
      </option>
    ))}
  </optgroup>
  <optgroup label="公共场所">
    {safeLocations.filter(l => l.type === 'public_space').map(l => (
      <option value={l.id}>
        {l.name} - {l.distance}
      </option>
    ))}
  </optgroup>
</Select>

{/* 显示选中地点的详情 */}
{selectedLocation && (
  <Card className="mt-2 p-3 bg-green-50">
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-5 w-5 text-green-600" />
      <div>
        <p className="font-medium">{selectedLocationData.name}</p>
        <p className="text-sm text-gray-600">{selectedLocationData.address}</p>
        <p className="text-sm text-gray-600">营业时间: {selectedLocationData.hours}</p>
      </div>
    </div>
  </Card>
)}
```

#### 辅助功能

**距离计算**:
```typescript
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): string {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}
```

**推荐逻辑**:
```typescript
function recommendSafeLocation(
  userLocation: {lat: number, lng: number},
  itemLocation: {lat: number, lng: number}
): SafeLocation[] {
  // 1. 计算中点
  const midpoint = {
    lat: (userLocation.lat + itemLocation.lat) / 2,
    lng: (userLocation.lng + itemLocation.lng) / 2
  };
  
  // 2. 找到距离中点最近的地点
  const withDistances = safeLocations.map(loc => ({
    ...loc,
    distance: calculateDistance(midpoint.lat, midpoint.lng, loc.latitude, loc.longitude)
  }));
  
  // 3. 按优先级排序
  return withDistances
    .sort((a, b) => {
      // 警察局优先
      if (a.type === 'police_station' && b.type !== 'police_station') return -1;
      if (b.type === 'police_station' && a.type !== 'police_station') return 1;
      // 然后按距离
      return a.distance - b.distance;
    })
    .slice(0, 5); // 显示前 5 个
}
```

---

## 📅 每日详细计划

### 第 1 天（星期一）：匹配算法 - 后端

**上午**（3-4 小时）:
- ✅ 创建数据库迁移
- ✅ 实现匹配评分算法
- ✅ 创建匹配生成函数
- ✅ 添加测试数据

**下午**（3-4 小时）:
- ✅ 创建 API 端点
- ✅ 实现自动匹配检测
- ✅ 添加通知触发器
- ✅ 单元测试

**产出**:
- `supabase/migrations/add_matching_system.sql`
- `lib/matching-enhanced.ts`
- `app/api/matches/route.ts`

---

### 第 2 天（星期二）：匹配算法 - 前端

**上午**（3-4 小时）:
- ✅ 匹配 UI 组件
- ✅ 匹配列表视图
- ✅ 匹配对比视图
- ✅ 匹配通知

**下午**（3-4 小时）:
- ✅ 集成到主页面
- ✅ 测试匹配流程
- ✅ UI 优化
- ✅ 移动端测试

**产出**:
- `components/match-list.tsx`
- `components/match-comparison.tsx`
- 更新的 `app/page.tsx`

---

### 第 3 天（星期三）：认领流程

**上午**（3-4 小时）:
- ✅ 创建认领表
- ✅ 认领对话框 UI
- ✅ 验证逻辑
- ✅ 照片上传

**下午**（3-4 小时）:
- ✅ 失主审核界面
- ✅ 批准/拒绝流程
- ✅ 状态更新
- ✅ 通知系统

**产出**:
- `supabase/migrations/add_claims_system.sql`
- `components/claim-dialog.tsx`
- `components/claim-review.tsx`
- `app/api/claims/route.ts`

---

### 第 4 天（星期四）：安全地点

**上午**（2-3 小时）:
- ✅ 创建安全地点表
- ✅ 预填充 Malvern East 数据
- ✅ 距离计算函数
- ✅ 推荐算法

**下午**（3-4 小时）:
- ✅ 地图标记
- ✅ 地点列表 UI
- ✅ 地点选择器
- ✅ 集成到认领流程

**产出**:
- `supabase/migrations/add_safe_locations.sql`
- `components/safe-location-map.tsx`
- `components/safe-location-picker.tsx`
- `lib/location-utils.ts`

---

### 第 5 天（星期五）：测试、修复和部署

**上午**（3-4 小时）:
- ✅ 端到端测试
- ✅ 修复发现的 bug
- ✅ 性能优化
- ✅ 移动端测试

**下午**（2-3 小时）:
- ✅ 最终代码审查
- ✅ 更新文档
- ✅ 部署到 Vercel
- ✅ 生产环境验证

**产出**:
- 修复的 bug 清单
- 更新的 README
- 生产部署

---

## ✅ 验收标准

### 功能 1: 匹配系统
- [ ] 用户报告丢失物品后自动显示潜在匹配
- [ ] 匹配分数准确反映相似度
- [ ] 高分匹配发送通知
- [ ] 用户可以查看详细对比
- [ ] 可以联系匹配的另一方

### 功能 2: 认领流程
- [ ] "认领此物品"按钮在适当位置显示
- [ ] 认领表单收集足够信息
- [ ] 失主收到认领通知
- [ ] 失主可以批准/拒绝认领
- [ ] 批准后双方可以协调交换
- [ ] 完成后报告状态更新

### 功能 3: 安全地点
- [ ] 地图上显示至少 8 个安全地点
- [ ] 地点按距离排序
- [ ] 可以选择地点作为见面地点
- [ ] 显示地点详细信息
- [ ] 计算距离准确

---

## 🐛 风险和缓解

### 风险 1: 匹配算法过于复杂
**缓解**: 从简单开始，迭代改进

### 风险 2: 时间不够
**缓解**: 优先核心路径，跳过额外功能

### 风险 3: 数据库性能
**缓解**: 添加适当索引，限制搜索范围

---

## 📞 每日签入

每天结束时回答：
1. 今天完成了什么？
2. 遇到了什么阻碍？
3. 明天的计划？

---

**准备好开始了吗？告诉我开始第 1 天的工作！** 🚀
