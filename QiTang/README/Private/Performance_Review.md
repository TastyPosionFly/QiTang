# 演出浏览模块（Performance Browsing）接口设计与论文说明

本模块负责系统演出的推荐、热度、评论与媒体外链等浏览与交互功能，**整合人工推荐与自动榜单，实现多维度智能热点推荐，为用户提供个性化浏览体验。**  
支持“首页推荐”、“热度榜排行”、“评论互动”、“直播/回放链”等主要功能。特别适用于论文系统说明与创新点阐释。

---

## 一、系统分层与推荐算法亮点说明

- **Controller（接口层）**：仅负责接收HTTP请求、参数解析与转发至Service，所有业务规则/推荐算法下沉到Service层。
- **Service（业务层）**：
    - **推荐聚合服务**通过`RecommendationAggregationService`，优先融合人工（编辑/管理员设定）推荐和自动热度榜，解决冷启动与实时热门兼顾的问题。
    - 热度数据基于浏览量、分享量、评论数、售出票量、实际到场人数等多指标加权计算（可论文重点描述算法公式与权重设定）。
    - 支持推荐轮播、置顶推荐、热榜补位多种展现形式，“人工+自动”结合。
- **DAO/Repository（数据访问层）**：统一数据存储、索引优化、批量提取与聚合，保证推荐与榜单高速处理。
- **DTO/VO（数据传输对象/卡片）**：卡片式轻量输出，包含演出简要信息、统计数据、推荐标签等，适合前端高并发分页与流式加载。

---

## 二、推荐算法与论文创新点

### 1. 混合推荐算法实现（论文重点）

> 推荐逻辑采用**两阶段聚合算法**：首先获取当前有效的**人工推荐**（优先级最高），若数量不足则自动补充**热度榜**（基于数据统计加权值降序排序），并合理去重，确保用户体验既有权威编辑推荐，也不遗漏实时热门。
>
> 热度分`HotScore`的计算公式（可直接用于论文描述）：
>
> ```
> HotScore = ���览量*0.1 + 分享数*2 + 评论数*3 + 售获票*10 + 到场核销*20
> ```
>
> 针对演出状态/更新时间，老内容引入时间衰减机制，避免长久霸榜（如超过7天热度减半）。  
> 该算法充分融合传统编辑运营与数据驱动个性化推荐，提升实际应用与论文理论创新价值。

**论文推荐描述举例：**
> “本系统采用人工推荐与自动热度榜结合的聚合算法。人工推荐保证内容质量与专业性，热度榜根据用户行为数据计算，公式为各项关键指标的加权和（浏览、分享、评论、购票、到场等）。数量不够时自动补充热门项，有效解决了冷启动、权威性与个性化的多重需求。”

---

## 三、主要接口设计说明与示例（参数与返回数据）

### 1. 获取混合推荐列表

```
GET /api/recommendation/list?type=1&limit=5
```

**请求参数说明：**
- `type`: 推荐位置（1-首页轮播、2-列表置顶）
- `limit`: 推荐数量（如5条）

**返回数据示例：**
```json
[
  {
    "id": 101,
    "title": "盛夏专场音乐会",
    "description": "毕业生专属年度巨献...",
    "posterUrl": "http://example.com/poster.jpg",
    "categoryId": 2,
    "publishStatus": 1,
    "statusDesc": "已发布",
    "createTime": "2026-06-01T08:10:23",
    "viewCount": 500,
    "shareCount": 67,
    "commentCount": 22,
    "hotScore": 1340.0,
    "recommendationTag": "官方推荐"
  },
  {
    "id": 102,
    "title": "光影电影回顾展",
    "description": "回顾经典光影，探寻心灵印象。",
    "posterUrl": "http://example.com/mov.jpg",
    "categoryId": 3,
    "publishStatus": 1,
    "statusDesc": "已发布",
    "createTime": "2026-06-03T19:20:38",
    "viewCount": 200,
    "shareCount": 5,
    "commentCount": 3,
    "hotScore": 351.5,
    "recommendationTag": "热度飙升"
  }
]
```

---

### 2. 上报浏览/分享量（埋点数据接口，方便论文举例用户行为反馈）

```
POST /api/recommendation/stats/view/101
POST /api/recommendation/stats/share/101
```
**请求参数：**
- 路径变量 `performanceId`。

**返回示例：**
```json
{ "success": true, "message": "上报成功" }
```

---

### 3. 评论管理接口

**发表评论**
```
POST /api/comment/post
Content-Type: application/json
```
```json
{
  "performanceId": 101,
  "content": "太震撼了！音乐好听，氛围超��"
}
```

**返回示例：**
```json
{ "success": true, "message": "评论成功" }
```

**获取评论列表**
```
GET /api/comment/list?performanceId=101&page=0&size=10
```
**返回示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "content": "太震撼了！音乐好听，氛围超棒",
      "status": 1,
      "createTime": "2026-06-01T21:23:10",
      "userId": 6003,
      "nickname": "王同学",
      "avatarUrl": "http://example.com/u.png"
    }
    // ...分页内容
  ]
}
```

---

### 4. 媒体外链管理

**添加外链**
```
POST /api/media/add
Content-Type: application/json
```
```json
{
  "performanceId": 101,
  "type": 2,
  "platform": 1,
  "externalKey": "https://www.bilibili.com/video/BV1...',
  "title": "直播现场",
  "sortOrder": 1
}
```

**返回：**
```json
{ "success": true, "message": "外链上传成功" }
```

**获取外链列表**
```
GET /api/media/list?performanceId=101
```
```json
{
  "success": true,
  "data": [
    {
      "id": 1501,
      "performanceId": 101,
      "type": 2,
      "typeName": "在线直播",
      "platform": 1,
      "platformName": "Bilibili",
      "externalKey": "https://www.bilibili.com/video/BV1...",
      "title": "直播现场",
      "sortOrder": 1
    }
    // ...
  ]
}
```

---

## 四、错误响应标准

所有接口均标准返回：
```json
{ "success": false, "message": "错误信息" }
```
便于前后端一致处理与论文接口对比。

---

## 五、论文写作推荐表达

- **推荐算法创新性与实用结合**：聚合人工推荐与热度榜单，兼顾运营权威与数据个性，算法公��权重可调，适应不同数据场景。
- **高性能与易扩展结构**：分页、批量、索引优化，支持高并发下服务可用性。
- **交互与埋点闭环**：用户行为上报直接反馈热度，支持论文数据流分析、行为建模论证。
- **丰富内容互动支持**：评论模块防刷、分页与状态审核；媒体外链支持主流平台、一键直达直播/回放。
- **错误与安全标准规范**：所有异常处理标准统一，方便论文接口文档和安全性分析。

**论文推荐描述举例：**
> “本系统浏览模块通过‘人工优先+自动补位’混合推荐算法，实现内容权威性与数据驱动个性化的高效融合。综合HotScore权重公式确保热门内容及时进入榜单，新内容冷启动由运营推荐保障。用户所有行为自动埋点，行为数据实时反馈至推荐与热门逻辑，评论互动与外链功能丰富，形成完整的信息流闭环，极大提升了系统的交互性与科学性。”

---

如需详细数据结构、算法实现代码或论文图示，欢迎结合本说明内容使用或补充沟通！