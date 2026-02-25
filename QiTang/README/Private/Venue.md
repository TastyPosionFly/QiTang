# 校园演出订票系统 - 场地（Venue）模块接口设计与使用说明

本模块为系统的场地（剧院、礼堂等）管理后端服务，**基于 Spring Boot Controller + Service + JPA 分层架构，支持场地信息管理、开放时段配置、屏蔽特殊日期与演出同步取消等核心能力**。本说明涵盖主要接口用法、参数结构及论文级设计亮点与研究价值总结。

---

## 一、系统分层设计简介

- **Controller（接口层）**：仅负责接收HTTP请求、参数解析、权限判定和响应包装，所有核心业务逻辑下沉至Service。
- **Service（业务层）**：组织参数校验、数据库操作、数据脱敏、图片处理、开放时段和屏蔽流程等所有关键业务。
- **DAO/Repository（数据访问层）**：面向实体的标准JPA增删查改接口，代码简洁易维护。
- **DTO（数据传输对象）**：基于业务场景对响应字段、图片、管理员信息进行脱敏与定制，保证敏感数据不外泄。
- **工具类（Util）**：包含图片文件、URL处理、JSON校验、资源物理清理等。

---

## 二、主要业务逻辑说明

- **场地创建/更新/删除**：仅超级管理员可操作，强制图片与设备信息校验，场地资源物理与逻辑双重删除；
- **场地开放时段管理**：支持周别开放/休息规则，批量设置并校验时间段合理性，逻辑严格避免空值或时段冲突；
- **场地屏蔽及演出同步取消**：管理员可屏蔽指定日期，并自动取消对应演出场次，事务保证同步与数据一致性；
- **高可拓展图片管理**：封面/轮播图支持文件与URL混合上传，落地本地存储方便统一资源管理，突破分布式部署障碍；
- **权限模型灵活安全**：用户分为超级管理员、场地管理员、普通用户，权限粒度可扩展适应更复杂场景。

---

## 三、接口使用说明概览

### 1. 创建场地

```
POST /api/venues
Content-Type: multipart/form-data
```
**请求数据（CreateVenueDto）：**

```json
{
  "name": "文艺剧院",
  "description": "学校大型演出场地",
  "address": "校区东路16号",
  "coverImageUrl": "http://example.com/cover.jpg",   // 或用coverImageFile文件流
  "photoUrlList": ["http://example.com/photo1.jpg", "http://example.com/photo2.jpg"], // 或用photoFiles文件流列表
  "capacity": 900,
  "type": 1,
  "equipmentInfo": "{\"灯光\":\"LED\",\"音响\":\"BOSE\"}",
  "managerId": 66
}
```
- 图片上传请通过`coverImageFile`（单文件）、`photoFiles[]`（多文件）提交。

**响应示例：**
```json
{ "success": true, "message": "创建场地成功: 文艺剧院" }
```
#### 设计说明
- 超级管理员专属，图片必需，设备信息格式强校验，图片自动下载入本地并落库，资料安全脱敏。

---

### 2. 获取场地详情

```
GET /api/venues/{id}
```
**请求数据：**
- 无参数，仅路径变量。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "文艺剧院",
    "description": "...",
    "address": "...",
    "coverImage": "http://xxx/cover.jpg",
    "photoList": [
      { "id": "uuid1", "url": "http://xxx/photo1.jpg", "originalName": "file1.jpg" },
      { "id": "uuid2", "url": "http://xxx/photo2.jpg", "originalName": "file2.jpg" }
    ],
    "capacity": 900,
    "type": 1,
    "equipmentInfo": { "灯光": "LED", "音响": "BOSE" },
    "status": 1,
    "manager": { "id": 66, "name": "张三", "avatarUrl": "...", "phone": "13200000000" }
  }
}
```
#### 设计说明
- 响应结构脱敏，图片路径自动前缀拼接，管理员信息安全可用。

---

### 3. 场地列表查询

```
GET /api/venues
```
**请求数据（查询参数可选）：**
```json
{
  "name": "大剧院",
  "type": 1,
  "status": 1
}
```
（实际为QueryString参数，如：`/api/venues?name=大剧院&type=1&status=1`）

**响应结构同详情。**

---

### 4. 更新场地信息

```
POST /api/venues/update
Content-Type: multipart/form-data
```
**请求数据（UpdateVenueDto）：**

```json
{
  "id": 123,
  "name": "新名称",             // 可选
  "description": "新描述",      // 可选
  "address": "新地址",         // 可选
  "capacity": 1000,            // 可选
  "type": 2,                   // 可选
  "status": 1,                 // 可选
  "coverImageUrl": "http://xxx/newcover.jpg",  // 或coverImageFile文件
  "newPhotoUrlList": ["http://xxx/photo3.jpg"],         // 新增轮播图URL
  "newPhotoFiles": [附件],                                   // 新增轮播图文件
  "deletePhotoIds": ["uuid1"],                         // 要删除的图片ID
  "replacePhotoMap": "{\"uuid-old-1\":0}",             // 替换图片JSON（ID对应附件索引）
  "replaceFiles": [附件],                                  // 替换用的新文件
  "equipmentInfo": "{\"舞台\":\"新布局\"}",           // 可选
  "managerId": 77                                     // 可选
}
```

**响应示例：**
```json
{ "success": true, "message": "保存成功，但部分操作未生效：图片上传失败" }
```

---

### 5. 删除场地

```
DELETE /api/venues/{id}/delete
```
**请求数据：**
- 无参数，仅路径变量。

**响应示例：**
```json
{ "success": true, "message": "场地及相关资源已成功删除" }
```
---

### 6. 批量设置开放时间

```
POST /api/venues/{venueId}/hours
Content-Type: application/json
```
**请求数据（List<OpeningHoursDto>）：**
```json
[
  {
    "dayOfWeek": 1,
    "isClosed": false,
    "openTime": "08:30:00",
    "closeTime": "21:30:00"
  },
  {
    "dayOfWeek": 7,
    "isClosed": true
  }
]
```

**响应示例：**
```json
{ "success": true, "message": "设置成功" }
```

---

### 7. 屏蔽场馆并取消当天演出

```
POST /api/venues/block
Content-Type: application/json
```
**请求数据（BlockVenueRequestDto）：**

```json
{
  "venueId": 123,
  "blockedDate": "2026-02-10",
  "reason": "设备检修"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "venueId": 123,
    "blockedDate": "2026-02-10",
    "reason": "设备检修",
    "canceledPerformancesCount": 2,
    "message": "场馆 (ID: 123) 已屏蔽日期 2026-02-10，并取消了 2 场演出"
  }
}
```
---

### 8. 获取场地开放与屏蔽信息

```
GET /api/venues/{venueId}/hours-and-blocks
```
**请求数据：**
- 无参数，仅路径变量。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "openingHours": [
      { "dayOfWeek": 1, "isClosed": false, "openTime": "08:30:00", "closeTime": "21:30:00" }
    ],
    "blockedDates": ["2026-02-10", "2026-02-24"]
  }
}
```
---

## 四、错误响应约定

所有接口均返回统一结构：
```json
{ "success": false, "message": "错误信息" }
```
前端可统一异常处理，便于论文接口结构论证。

---

## 五、设计亮点与论文写作推荐表述

- **分层架构清晰**：Controller零业务，所有流程在Service，DAO专注数据操作，DTO安全封装响应，方便论文模块分割。
- **图片与资源统一规范管理**：所有上传资源自动本地化存储，支持URL和文件两种来源，图片管理流程可全文详细说明。
- **权限模型灵活扩展**：支持超级管理员、场地管理员分级管理，权限判断全部落在业务层，工程可控。
- **批量/事务/自动修复**：批量设置与屏蔽流程均有事务控制，失败部分不影响其余记录，体现工程健壮性。
- **开放与屏蔽机制**：系统支持场地一周灵活开放规则和特殊日期屏蔽，自动同步取消活动，场景更贴近实际应用。
- **错误与警告友好**：部分操作失败返回警告，提升用��体验和系统工程质量。
- **资源物理清理机制**：软删除结合定时任务彻底清理无用图片与数据，保证安全与空间利用率。

**论文推荐描述举例：**
> “场地管理模块采用分层架构及批量事务机制，充分保证数据一致性和操作安全性，资源存储与权限模型灵活可拓展。所有图片与开放屏蔽机制、错误警告体系的设计，兼顾工程实际与论文理论阐释需求。”

---

如需详细字段列表、数据结构、内部流程代码或更多论文模块论证素材，可直接参考本接口文档/源码注释或补充沟通！