# 会话总结：伪 3D 卷轴动作游戏开发

**日期：** 2026-03-17  
**项目：** 伪 3D 卷轴动作游戏 (Cutting Game)  
**平台：** 移动端 (iOS/Android) - Web 原型  
**技术栈：** Vite + TypeScript + Three.js

---

## 1. 项目概述

### 1.1 核心玩法
- 4 通道垂直卷轴 + 动作打击（射击/斩击）
- 分层推进机制：清空当前层后下一层才能下落
- 胜利条件：限定时间内清空所有层级敌人
- 失败条件：时间结束时仍有存活敌人

### 1.2 操作方式
| 操作 | 输入方式 | 判定 | 特性 |
|------|----------|------|------|
| 射击 | 单指点击 | 点状/小范围圆形 | 单体伤害 |
| 斩击 | 手指滑动 | 轨迹线性/多边形 | 穿透 AOE |

### 1.3 敌人类型
| 敌人 | 占位 | 弱点 | 备注 |
|------|------|------|------|
| 重装战士 | 1 格 | 弱斩击 (200%) | 高血量 |
| 轻装武士 | 1 格 | 弱射击 (200%) | 低血量 |
| BOSS 大名 | 2 格 | 无弱点 | QTE 机制 |

---

## 2. 已完成工作

### 2.1 项目初始化 ✅
- Vite + TypeScript + Three.js 项目搭建
- 目录结构创建
- 依赖安装 (three.js)

### 2.2 核心系统 ✅
- **CylinderWorld.ts**: 3D 滚筒场景，4 通道布局标记
- **LayerSystem.ts**: 层级管理系统，支持多层敌人管理
- **EnemyBase.ts**: 敌人基类，包含涌现动画、伤害计算、血条逻辑
- **InputManager.ts**: 输入管理器，支持触摸/鼠标，检测点击和滑动
- **AttackSystem.ts**: 攻击判定系统（射击圆形检测、斩击线段检测）
- **GameManager.ts**: 游戏主逻辑，状态管理、游戏循环
- **ConfigManager.ts**: 配置加载与管理
- **Types.ts**: 数据类型定义

### 2.3 配置文件 ✅
- `combat_config.json`: 战斗全局配置
- `enemy_templates.json`: 敌人模板定义
- `level_001.json`: 第一关配置

---

## 3. 遇到的问题与解决方案

### 3.1 Vite 缓存问题
**问题描述：**
浏览器控制台报错：`The requested module '/src/data/Types.ts' does not provide an export named 'AttackType'`

**原因分析：**
- Vite 的模块缓存机制导致即使源文件已更新，浏览器仍加载旧版本
- Types.ts 文件被多次修改，缓存未正确失效

**尝试的解决方案：**
1. 清除 `node_modules/.vite` 缓存目录
2. 使用 `--force` 参数重启 Vite
3. 修改 Types.ts 文件内容强制刷新
4. 浏览器硬刷新 (Ctrl+Shift+R)

**当前状态：**
问题仍存在，需要进一步排查。可能是以下原因：
- 浏览器 Service Worker 缓存
- Vite 预构建缓存未完全清除
- 某些文件引用路径问题

### 3.2 开发服务器运行状态
**说明：** Vite 开发服务器是持续运行的进程，这是正常行为。关闭终端或按 Ctrl+C 会停止服务器。

---

## 4. 当前项目结构

```
cutting-game/
├── index.html                 # 入口 HTML
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 配置
├── public/
│   ├── configs/
│   │   ├── combat_config.json      # 战斗配置
│   │   ├── enemy_templates.json    # 敌人模板
│   │   └── level_001.json          # 第一关配置
│   └── models/                # 3D 模型资源
├── src/
│   ├── main.ts                # 入口文件
│   ├── data/
│   │   ├── Types.ts           # 类型定义
│   │   └── ConfigManager.ts   # 配置管理
│   ├── core/
│   │   ├── GameManager.ts     # 游戏管理器
│   │   └── InputManager.ts    # 输入管理器
│   ├── scene/
│   │   └── CylinderWorld.ts   # 3D 滚筒场景
│   ├── combat/
│   │   ├── LayerSystem.ts     # 层级系统
│   │   ├── Enemy/
│   │   │   └── EnemyBase.ts   # 敌人基类
│   │   └── Attack/
│   │       └── AttackSystem.ts # 攻击判定
│   └── assets/                # 资源文件
└── plans/                     # 策划文档
```

---

## 5. 待完成任务

### 5.1 紧急修复 🔴
- [ ] **修复模块导入错误**: 解决 `AttackType` 导出问题
- [ ] **修复画面不显示**: 仅显示 UI，3D 场景未渲染

### 5.2 功能完善
- [ ] 实现战斗反馈 UI（血条、伤害数字、特效）
- [ ] 实现 BOSS QTE 机制
- [ ] 实现游戏流程 UI（胜利/失败画面）
- [ ] 实现敌人具体类型（重装战士/轻装武士/BOSS 独立类）
- [ ] 完善敌人实例化逻辑（LayerSystem 中创建敌人）

### 5.3 优化与扩展
- [ ] 对象池管理（血条、特效）
- [ ] 加载真实 3D 模型替代占位几何体
- [ ] 添加音效系统
- [ ] 关卡编辑器开发

---

## 6. 关键代码片段

### 6.1 类型定义 (Types.ts)
```typescript
export type AttackType = 'SHOOT' | 'SLASH';
export type WeaknessType = 'NONE' | 'SLASH' | 'SHOOT';
export type QTEType = 'circle' | 'line';
```

### 6.2 滚筒世界坐标计算 (CylinderWorld.ts)
```typescript
public getLanePosition(lane: number, distance: number): THREE.Vector3 {
  const laneWidth = this.config.height / 4;
  const laneCenter = (lane - 2.5) * laneWidth;
  const angle = laneCenter / this.config.radius;
  
  return new THREE.Vector3(
    Math.sin(angle) * this.config.radius,
    Math.cos(angle) * this.config.radius,
    distance
  );
}
```

### 6.3 攻击判定 (AttackSystem.ts)
```typescript
// 射击判定：点到点距离检测
private checkShootHit(point: THREE.Vector3, enemy: EnemyBase): boolean {
  const enemyPos = enemy.getPosition();
  const distance = point.distanceTo(enemyPos);
  return distance < this.config.shootRange;
}

// 斩击判定：点到线段距离检测
private checkSlashHit(points: THREE.Vector3[], enemy: EnemyBase): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const distance = this.pointToSegmentDistance(enemyPos, points[i], points[i + 1]);
    if (distance < this.config.slashRange) return true;
  }
  return false;
}
```

---

## 7. 启动说明

### 7.1 开发环境启动
```bash
cd cutting-game
npm install    # 首次运行
npm run dev    # 启动开发服务器
```

### 7.2 访问地址
- 本地：http://localhost:5173/
- 如果端口被占用，Vite 会自动使用其他端口（如 5174、5175）

### 7.3 故障排除
1. **模块导入错误**: 按 Ctrl+Shift+R 硬刷新浏览器
2. **拒绝连接**: 确认开发服务器正在运行
3. **画面不显示**: 检查浏览器控制台错误信息

---

## 8. 下一步行动计划

1. **立即修复**: 彻底清除所有缓存，重新构建项目
2. **验证基础功能**: 确保 3D 场景正常渲染
3. **完成核心战斗**: 实现敌人实例化和攻击反馈
4. **测试与迭代**: 验证游戏流程

---

**文档生成时间：** 2026-03-17T14:08:00+08:00
