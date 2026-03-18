// ==================== 数据类型定义 ====================
// Updated: 2026-03-17T14:26:00
// Force recompile for Vite HMR - DO NOT REMOVE THIS COMMENT

// Runtime type markers (for Vite HMR compatibility)
// this is a this message
export const __TYPE_MARKERS__ = {
  EnemyTemplate: 'EnemyTemplate',
  LayerConfig: 'LayerConfig',
  EnemyInstance: 'EnemyInstance',
  LevelConfig: 'LevelConfig',
  CombatConfig: 'CombatConfig',
  HitboxConfig: 'HitboxConfig',
  QTEType: 'QTEType',
  WeaknessType: 'WeaknessType',
  AttackType: 'AttackType',
  GameState: 'GameState'
} as const;

/** 敌人弱点类型 */
export type WeaknessType = 'NONE' | 'SLASH' | 'SHOOT';

/** 攻击类型 */
export type AttackType = typeof AttackTypeValue[keyof typeof AttackTypeValue];

/** QTE 类型 */
export type QTEType = 'circle' | 'line';

/** 碰撞框配置 */
export interface HitboxConfig {
  OffsetX: number;   // 归一化 X 偏移 (0-1)
  OffsetY: number;   // 归一化 Y 偏移 (0-1)
  Width: number;     // 归一化宽度 (0-1)
  Height: number;    // 归一化高度 (0-1)
}

/** 敌人模板配置 */
export interface EnemyTemplate {
  ID: string;
  Name: string;
  BaseHP: number;
  LaneWidth: number;           // 占用列数 (1 或 2)
  WeaknessType: WeaknessType;
  DamageMult_Slash: number;    // 斩击伤害倍率
  DamageMult_Shoot: number;    // 射击伤害倍率
  Hitbox_Default: HitboxConfig;
  ModelPath?: string;          // 3D 模型路径 (可选)
  Speed?: number;              // 移动速度
}

/** 敌人实例配置 */
export interface EnemyInstance {
  EnemyID: string;
  StartLane: number;           // 起始列 (1-4)
  CustomHitbox?: HitboxConfig | null;
}

/** 层级配置 */
export interface LayerConfig {
  LayerIndex: number;
  Enemies: EnemyInstance[];
}

/** 关卡配置 */
export interface LevelConfig {
  LevelID: string;
  TimeLimit: number;           // 限时 (秒)
  TotalLayers: number;         // 总层数
  Layers: LayerConfig[];
}

/** 战斗配置 */
export interface CombatConfig {
  Player_Damage_Slash: number;
  Player_Damage_Shoot: number;
  Hitbox_Settings: {
    Slash_Base_Range: number;
    Shoot_Base_Range: number;
    Enable_Multi_Hit: boolean;
  };
  Feedback_Settings: {
    HP_Bar_Duration: number;
    HP_Bar_Refresh: boolean;
  };
  Boss_QTE_Settings: {
    Interval_Min: number;
    Interval_Max: number;
    Duration_Min: number;
    Duration_Max: number;
    Crit_Multiplier: number;
  };
}

/** 游戏状态 */
export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT';

/** 攻击类型枚举值（用于运行时） */
export const AttackTypeValue = {
  SHOOT: 'SHOOT' as const,
  SLASH: 'SLASH' as const
};

/** 敌人弱点类型枚举值（用于运行时） */
export const WeaknessTypeValue = {
  NONE: 'NONE' as const,
  SLASH: 'SLASH' as const,
  SHOOT: 'SHOOT' as const
};

/** 游戏状态枚举值（用于运行时） */
export const GameStateValue = {
  IDLE: 'IDLE' as const,
  PLAYING: 'PLAYING' as const,
  PAUSED: 'PAUSED' as const,
  VICTORY: 'VICTORY' as const,
  DEFEAT: 'DEFEAT' as const
};
