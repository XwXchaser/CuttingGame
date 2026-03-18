# 伪 3D 卷轴动作游戏 (Cutting Games)

## 项目概述

一款类"别踩白块"4 通道卷轴动作游戏，采用真 3D 滚筒场景，类似"动物森友会"的透视效果。

### 核心玩法
- **4 通道垂直卷轴**：敌人在 4 条通道上下落
- **射击 (点击)**：单点攻击，适合精准打击
- **斩击 (划动)**：范围攻击，可一次命中多个敌人
- **分层推进**：清空当前层后，下一层敌人才会下落并变为可攻击状态

### 视觉风格
- 真 3D 滚筒场景
- 敌人从"地平线"涌现
- 当前层敌人完全不透明，后续层半透明显示

---

## 技术栈

- **Three.js**: 3D 渲染引擎
- **TypeScript**: 类型安全的 JavaScript 超集
- **Vite**: 构建工具

---

## 开发指南

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

---

## 项目结构

```
cutting-game/
├── src/
│   ├── core/
│   │   ├── GameLoop.ts          # 游戏主循环
│   │   ├── InputManager.ts      # 输入管理 (点击/滑动)
│   │   └── GameManager.ts       # 游戏管理器
│   ├── scene/
│   │   └── CylinderWorld.ts     # 滚筒世界
│   ├── combat/
│   │   ├── Enemy/
│   │   │   └── EnemyBase.ts     # 敌人基类
│   │   ├── Attack/
│   │   │   ├── ShootAttack.ts   # 射击判定 (待实现)
│   │   │   └── SlashAttack.ts   # 斩击判定 (待实现)
│   │   ├── QTE/
│   │   │   └── QTEManager.ts    # QTE 管理 (待实现)
│   │   └── LayerSystem.ts       # 层级系统
│   ├── ui/
│   │   ├── HUD.ts               # 游戏内 UI (待实现)
│   │   └── HPBar.ts             # 血条 (待实现)
│   └── data/
│       ├── Types.ts             # 类型定义
│       ├── ConfigManager.ts     # 配置管理器
│       └── EnemyTemplate.ts     # 敌人模板 (待实现)
├── public/
│   └── configs/
│       ├── combat_config.json   # 战斗配置
│       ├── enemy_templates.json # 敌人模板
│       └── level_001.json       # 关卡 1 配置
└── index.html
```

---

## 配置文件说明

### combat_config.json
战斗全局配置，包含：
- 玩家斩击/射击伤害
- 判定范围设置
- 血条反馈设置
- BOSS QTE 设置

### enemy_templates.json
敌人模板定义，包含：
- 重装战士 (弱斩击)
- 轻装武士 (弱射击)
- BOSS 大名 (无弱点，2 格宽)

### level_XXX.json
关卡配置，包含：
- 关卡限时
- 总层数
- 每层敌人配置

---

## 当前进度

### 已完成
- [x] 项目初始化 (Vite + TypeScript + Three.js)
- [x] 目录结构创建
- [x] 3D 滚筒场景 (CylinderWorld)
- [x] 4 通道布局标记
- [x] 层级系统框架 (LayerSystem)
- [x] 敌人基类 (EnemyBase)
- [x] 输入管理器 (InputManager)
- [x] 游戏管理器 (GameManager)
- [x] 配置系统 (ConfigManager)
- [x] 配置文件 (JSON)

### 待实现
- [ ] 敌人具体类型 (重装战士/轻装武士/BOSS)
- [ ] 射击判定系统
- [ ] 斩击判定系统
- [ ] 战斗反馈 (血条/特效)
- [ ] BOSS QTE 机制
- [ ] 游戏流程 UI (倒计时/胜利/失败)
- [ ] 敌人实际生成逻辑

---

## 操作说明

| 操作 | 效果 |
|------|------|
| 点击/短触 | 射击 (单体攻击) |
| 滑动/长触移动 | 斩击 (范围攻击) |

---

## 开发注意事项

1. **判定逻辑**: 
   - 斩击需要实现多边形与矩形 Hitbox 的相交检测
   - 射击使用射线检测

2. **层级屏蔽**: 
   - 非当前层敌人的 Collider 和 InputReceiver 必须禁用

3. **性能优化**: 
   - 血条、特效需使用对象池管理
   - Hitbox 数据使用归一化坐标 (0-1)

---

## 许可证

MIT
