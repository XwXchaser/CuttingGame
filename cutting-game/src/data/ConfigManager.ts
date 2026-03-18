import type { CombatConfig, EnemyTemplate, LevelConfig } from './Types';

/** 配置管理器 - 负责加载和管理游戏配置 */
export class ConfigManager {
  private static instance: ConfigManager;
  
  private combatConfig: CombatConfig | null = null;
  private enemyTemplates: Map<string, EnemyTemplate> = new Map();
  private levelConfigs: Map<string, LevelConfig> = new Map();

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /** 加载战斗配置 */
  public async loadCombatConfig(): Promise<CombatConfig | null> {
    if (this.combatConfig) {
      return this.combatConfig;
    }

    try {
      const response = await fetch('configs/combat_config.json');
      this.combatConfig = await response.json();
      return this.combatConfig;
    } catch (error) {
      console.error('加载战斗配置失败:', error);
      return null;
    }
  }

  /** 获取战斗配置 */
  public getCombatConfig(): CombatConfig | null {
    return this.combatConfig;
  }

  /** 加载敌人模板 */
  public async loadEnemyTemplates(): Promise<Map<string, EnemyTemplate>> {
    if (this.enemyTemplates.size > 0) {
      return this.enemyTemplates;
    }

    const response = await fetch('configs/enemy_templates.json');
    const templates: EnemyTemplate[] = await response.json();
    
    for (const template of templates) {
      this.enemyTemplates.set(template.ID, template);
    }
    
    return this.enemyTemplates;
  }

  /** 获取敌人模板 */
  public getEnemyTemplate(enemyID: string): EnemyTemplate | undefined {
    return this.enemyTemplates.get(enemyID);
  }

  /** 加载关卡配置 */
  public async loadLevelConfig(levelID: string): Promise<LevelConfig | null> {
    // 检查缓存
    if (this.levelConfigs.has(levelID)) {
      return this.levelConfigs.get(levelID) || null;
    }

    try {
      // 将 LV_001 转换为 level_001.json
      const fileName = levelID.toLowerCase().replace('lv_', 'level_') + '.json';
      const response = await fetch(`configs/${fileName}`);
      
      if (!response.ok) {
        console.warn(`关卡配置不存在：${fileName}`);
        return null;
      }
      
      const config: LevelConfig = await response.json();
      this.levelConfigs.set(levelID, config);
      return config;
    } catch (error) {
      console.error(`加载关卡配置失败：${levelID}`, error);
      return null;
    }
  }
}
