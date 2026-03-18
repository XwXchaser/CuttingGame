# 伪 3D 卷轴动作游戏 - 开发计划 (v2.0 - Web 原型版)

## 项目概述

- **游戏类型**: 3D 滚筒卷轴动作游戏 (类"别踩白块"4 通道 + 动作打击)
- **目标平台**: Web 浏览器 (移动端 Safari/Chrome)
- **核心玩法**: 射击 (点击) / 斩击 (划动) 消灭下落敌人，分层推进机制
- **视觉风格**: 真 3D 滚筒场景，类似"动物森友会"的透视效果

---

## 技术选型

### 核心库
- **Three.js**: 3D 渲染引擎
- **TypeScript**: 类型安全的 JavaScript 超集
- **Vite**: 构建工具 (热更新、打包)

### 理由
1. Three.js 提供完整的 3D 场景支持，可实现真正的滚筒地形
2. TypeScript 提供类型安全，便于后期迁移到 Unity
3. Vite 提供快速开发和热更新
4. Web 原型可快速验证玩法，后续可打包为 H5 或迁移到原生引擎

---

## 核心视觉机制：滚筒场景 (Cylindrical World)

### 设计概念
```
                    ┌─────────────────┐
                    │   玩家视角       │
                    ────────┬────────┘
                             │
              近处 ──────────┼────────── 远处 (地平线)
                    第 1 层   │   第 3 层 (仅露顶部)
                    (不透明) │   (半透明，从地面涌现)
                             │
                    ═════════╪═════════  "地面" 滚筒表面
                            / \
                           /   \
                          /     \
                    滚筒曲面 (敌人沿曲面移动)
```

### 实现方案
1. **滚筒几何体**: 创建圆柱形地面 (CylinderGeometry)，玩家视角看向圆柱侧面
2. **敌人涌现**: 敌人从圆柱远端 (地平线) 生成，沿圆柱表面向玩家移动
3. **透视遮挡**: 利用 3D 相机透视，远处敌人自然被地面遮挡，仅露出顶部
4. **层级控制**: 
   - 第 1 层 (近处): 完全不透明，可交互
   - 第 2 层 (中距离): 半透明，不可交互
   - 第 3 层 (远处/地平线): 半透明，从地面"长出来"的效果

### Three.js 实现要点
```typescript
// 滚筒地面
const cylinder = new THREE.Mesh(
  new THREE.CylinderGeometry(radius, radius, height, radialSegments),
  material
);
cylinder.rotation.z = Math.PI / 2; // 横放圆柱

// 相机位置
camera.position.set(0, cameraHeight, cameraDistance);
camera.lookAt(0, 0, 0);

// 敌人沿圆柱表面移动
enemy.position.y = Math.sin(angle) * radius;
enemy.position.z = Math.cos(angle) * radius;
```

---

## 开发阶段划分

### 阶段一：核心战斗原型 (Core Combat Prototype)

#### 1.1 项目搭建
- [ ] 初始化 Vite + TypeScript + Three.js 项目
- [ ] 配置开发服务器和构建脚本
- [ ] 创建基础目录结构

#### 1.2 3D 场景搭建
- [ ] 创建 Three.js 渲染器、相机、场景
- [ ] 创建滚筒地面 (圆柱几何体)
- [ ] 设置相机位置和视角 (模拟动森视角)
- [ ] 添加基础光照 (环境光 + 平行光)
- [ ] 实现 4 通道标记 (可视化通道分界线)

#### 1.3 层级系统 (Layer System)
- [ ] 实现多层敌人容器管理
- [ ] 实现层级推进逻辑 (清空当前层 -> 下一层下落)
- [ ] 实现层级透明度控制 (当前层不透明，后续层半透明)
- [ ] 实现非当前层输入屏蔽
- [ ] 实现敌人沿圆柱表面移动 (弧形轨迹)

#### 1.4 敌人系统
- [ ] 创建敌人基类 (EnemyBase)
- [ ] 实现敌人类型：
  - [ ] 重装战士 (1 格，弱斩击)
  - [ ] 轻装武士 (1 格，弱射击)
  - [ ] BOSS 大名 (2 格，无弱点)
- [ ] 实现弱点克制系统 (斩击/射击伤害倍率)
- [ ] 实现敌人占位检测 (1 格/2 格)
- [ ] 实现敌人"涌现"动画 (从地平线升起)

#### 1.5 玩家输入与判定
- [ ] 实现点击输入检测 (射击) - 支持移动端触摸
- [ ] 实现滑动输入检测 (斩击) - 轨迹采样
- [ ] 实现 3D 射线检测 (Raycasting) - 点击转 3D 坐标
- [ ] 实现射击判定 (点状/小范围圆形)
- [ ] 实现斩击判定 (轨迹多边形与 Hitbox 相交检测)
- [ ] 实现 Hitbox 碰撞检测系统

#### 1.6 战斗反馈
- [ ] 实现动态血条系统 (受伤显示，0.5 秒隐藏)
- [ ] 实现伤害数字特效 (3D 文字/精灵)
- [ ] 实现敌人死亡特效 (粒子系统)
- [ ] 实现命中反馈 (闪光/震动)

#### 1.7 BOSS 机制
- [ ] 实现 BOSS QTE 系统 (随机间隔生成标志)
- [ ] 实现 QTE UI 显示 (○=斩击，—=射击)
- [ ] 实现 QTE 判定 (限时完成对应操作)
- [ ] 实现 QTE 成功/失败反馈
- [ ] 实现 QTE 期间普通攻击兼容

#### 1.8 游戏流程
- [ ] 实现关卡限时系统 (倒计时 UI)
- [ ] 实现胜利条件检测 (清空所有层)
- [ ] 实现失败条件检测 (时间归零仍有存活敌人)
- [ ] 实现游戏结束 UI (胜利/失败画面)
- [ ] 实现重新开始功能

#### 1.9 数据配置
- [ ] 创建敌人模板配置 (JSON)
- [ ] 创建关卡配置 (JSON)
- [ ] 实现配置加载系统
- [ ] 实现全局战斗配置

---

## 项目目录结构

```
CuttingGames/
├── src/
│   ├── core/
│   │   ├── GameLoop.ts          # 游戏主循环
│   │   ├── InputManager.ts      # 输入管理 (点击/滑动)
│   │   ── EventBus.ts          # 事件总线
│   ├── scene/
│   │   ├── Scene3D.ts           # Three.js 场景封装
│   │   ├── CylinderWorld.ts     # 滚筒世界
│   │   └── CameraController.ts  # 相机控制
│   ├── combat/
│   │   ├── LayerSystem.ts       # 层级系统
│   │   ├── Enemy/
│   │   │   ├── EnemyBase.ts     # 敌人基类
│   │   │   ├── HeavyWarrior.ts  # 重装战士
│   │   │   ├── LightSamurai.ts  # 轻装武士
│   │   │   └── BossDaimyo.ts    # BOSS 大名
│   │   ├── Attack/
│   │   │   ├── ShootAttack.ts   # 射击判定
│   │   │   └── SlashAttack.ts   # 斩击判定
│   │   ── QTE/
│   │       ── QTEManager.ts    # QTE 管理
│   ├── ui/
│   │   ├── HUD.ts               # 游戏内 UI
│   │   ├── HPBar.ts             # 血条
│   │   └── GameOverScreen.ts    # 结算画面
│   ├── data/
│   │   ├── EnemyTemplate.ts     # 敌人配置
│   │   └── LevelConfig.ts       # 关卡配置
│   └── main.ts                  # 入口文件
├── public/
│   └── configs/                 # JSON 配置文件
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 核心数据结构

### EnemyTemplate (敌人模板)
```json
{
  "ID": "enemy_heavy_001",
  "Name": "重装战士",
  "BaseHP": 100.0,
  "LaneWidth": 1,
  "WeaknessType": "SLASH",
  "DamageMult_Slash": 2.0,
  "DamageMult_Shoot": 1.0,
  "Hitbox_Default": {
    "OffsetX": 0.1,
    "OffsetY": 0.1,
    "Width": 0.8,
    "Height": 0.8
  },
  "ModelPath": "models/enemy_heavy.glb"
}
```

### LevelConfig (关卡配置)
```json
{
  "LevelID": "LV_005",
  "TimeLimit": 60.0,
  "TotalLayers": 3,
  "Layers": [
    {
      "LayerIndex": 1,
      "Enemies": [
        {
          "EnemyID": "boss_daimyo_001",
          "StartLane": 2,
          "CustomHitbox": null
        }
      ]
    }
  ]
}
```

### CombatConfig (战斗配置)
```json
{
  "Player_Damage_Slash": 25.0,
  "Player_Damage_Shoot": 20.0,
  "Hitbox_Settings": {
    "Slash_Base_Range": 0.3,
    "Shoot_Base_Range": 0.15,
    "Enable_Multi_Hit": true
  },
  "Feedback_Settings": {
    "HP_Bar_Duration": 0.5,
    "HP_Bar_Refresh": true
  },
  "Boss_QTE_Settings": {
    "Interval_Min": 3.0,
    "Interval_Max": 6.0,
    "Duration_Min": 2.0,
    "Duration_Max": 3.0,
    "Crit_Multiplier": 2.0
  }
}
```

---

## 关键技术实现

### 1. 滚筒世界坐标转换
```typescript
// 将通道索引转换为圆柱表面坐标
function getLanePosition(lane: number, distance: number): THREE.Vector3 {
  const laneWidth = cylinderRadius * (Math.PI / 2) / 4; // 4 通道均分 90 度
  const angleOffset = (lane - 1.5) * laneWidth / cylinderRadius;
  
  return new THREE.Vector3(
    0,
    Math.sin(angleOffset) * cylinderRadius,
    Math.cos(angleOffset) * cylinderRadius - distance
  );
}
```

### 2. 斩击轨迹检测
```typescript
// 采集滑动轨迹点，构建多边形
function detectSlashHit(trailPoints: Vector2[], enemyHitbox: Rectangle): boolean {
  // 将 2D 屏幕坐标转换为 3D 世界坐标
  // 进行多边形 - 矩形相交检测
  return polygonIntersectsRect(trailPolygon, enemyHitbox);
}
```

### 3. 敌人涌现效果
```typescript
// 敌人从地平线"长出来"
function updateEmergence(enemy: Enemy, deltaTime: number) {
  if (enemy.emergenceProgress < 1) {
    enemy.emergenceProgress += deltaTime * enemy.emergenceSpeed;
    enemy.scale.y = Math.sin(enemy.emergenceProgress * Math.PI / 2);
  }
}
```

---

## 下一步行动

确认后切换到 **Code 模式** 开始实施：

1. 初始化 Vite + TypeScript + Three.js 项目
2. 搭建 3D 滚筒场景
3. 实现核心战斗循环
