import { EnemyBase } from './Enemy/EnemyBase';
import type { LayerConfig } from '../data/Types';
import { CylinderWorld } from '../scene/CylinderWorld';
import { ConfigManager } from '../data/ConfigManager';

/**
 * 层级系统
 * 管理多层敌人的生成、推进和交互
 */
export class LayerSystem {
  private readonly world: CylinderWorld;
  
  // 所有层级的敌人
  private layers: Map<number, EnemyBase[]> = new Map();
  
  // 当前可交互的层级
  private currentLayerIndex: number = 1;
  
  // 总层数
  private totalLayers: number = 0;

  constructor(world: CylinderWorld) {
    this.world = world;
  }

  /** 初始化层级 */
  public initialize(layerConfigs: LayerConfig[]): void {
    this.totalLayers = layerConfigs.length;
    this.currentLayerIndex = 1;
    
    // 清空现有层
    this.clearAllLayers();
    
    // 创建所有层
    for (const layerConfig of layerConfigs) {
      this.createLayer(layerConfig);
    }
    
    // 设置第一层为可交互
    this.updateLayerInteractions();
  }

  /** 创建单个层级 */
  private createLayer(layerConfig: LayerConfig): void {
    const enemies: EnemyBase[] = [];
    const configManager = ConfigManager.getInstance();
    
    for (const enemyInstance of layerConfig.Enemies) {
      // 从配置管理器获取敌人模板
      const template = configManager.getEnemyTemplate(enemyInstance.EnemyID);
      
      if (!template) {
        console.warn(`敌人模板不存在：${enemyInstance.EnemyID}`);
        continue;
      }
      
      // 获取位置
      const position = this.world.getLanePosition(
        enemyInstance.StartLane,
        this.getLayerDistance(layerConfig.LayerIndex)
      );
      
      // 创建敌人实例
      const enemy = new EnemyBase(template, position);
      enemies.push(enemy);
      
      // 更新敌人方向，使其垂直于滚筒表面
      enemy.updateOrientation(this.world.getRadius());
      
      // 添加到场景
      this.world.scene.add(enemy.mesh);
    }
    
    this.layers.set(layerConfig.LayerIndex, enemies);
  }

  /** 获取层级距离 */
  private getLayerDistance(layerIndex: number): number {
    // 第一层最近，后续层依次远离
    const baseDistance = 5;
    const layerSpacing = 8;
    return baseDistance + (layerIndex - 1) * layerSpacing;
  }

  /** 更新层级交互状态 */
  private updateLayerInteractions(): void {
    for (const [layerIndex, enemies] of this.layers.entries()) {
      const isInteractable = layerIndex === this.currentLayerIndex;
      for (const enemy of enemies) {
        enemy.setLayer(layerIndex, isInteractable);
        if (isInteractable) {
          enemy.startEmergence();
        }
      }
    }
  }

  /** 检查当前层是否清空 */
  public isCurrentLayerCleared(): boolean {
    const currentEnemies = this.layers.get(this.currentLayerIndex) || [];
    return currentEnemies.every(enemy => !enemy.isAlive());
  }

  /** 推进到下一层 */
  public advanceToNextLayer(): boolean {
    if (this.currentLayerIndex >= this.totalLayers) {
      return false; // 已经是最后一层
    }
    
    // 将当前层敌人从场景移除并销毁
    const currentEnemies = this.layers.get(this.currentLayerIndex) || [];
    for (const enemy of currentEnemies) {
      this.world.scene.remove(enemy.mesh);
      enemy.dispose();
    }
    
    // 推进层级
    this.currentLayerIndex++;
    
    // 更新交互状态
    this.updateLayerInteractions();
    
    return true;
  }

  /** 获取当前层所有存活敌人 */
  public getCurrentLayerEnemies(): EnemyBase[] {
    const enemies = this.layers.get(this.currentLayerIndex) || [];
    return enemies.filter(enemy => enemy.isAlive());
  }

  /** 获取所有存活敌人 (用于检查胜利条件) */
  public getAllAliveEnemies(): EnemyBase[] {
    const allEnemies: EnemyBase[] = [];
    for (const enemies of this.layers.values()) {
      for (const enemy of enemies) {
        if (enemy.isAlive()) {
          allEnemies.push(enemy);
        }
      }
    }
    return allEnemies;
  }

  /** 检查是否所有层都清空 */
  public areAllLayersCleared(): boolean {
    for (const enemies of this.layers.values()) {
      for (const enemy of enemies) {
        if (enemy.isAlive()) {
          return false;
        }
      }
    }
    return true;
  }

  /** 获取当前层级索引 */
  public getCurrentLayerIndex(): number {
    return this.currentLayerIndex;
  }

  /** 获取总层数 */
  public getTotalLayers(): number {
    return this.totalLayers;
  }

  /** 清空所有层 */
  public clearAllLayers(): void {
    for (const enemies of this.layers.values()) {
      for (const enemy of enemies) {
        this.world.scene.remove(enemy.mesh);
        enemy.dispose();
      }
    }
    this.layers.clear();
  }

  /** 更新 */
  public update(deltaTime: number): void {
    // 更新所有敌人
    for (const enemies of this.layers.values()) {
      for (const enemy of enemies) {
        enemy.update(deltaTime);
      }
    }
    
    // 检查是否需要推进
    if (this.isCurrentLayerCleared()) {
      this.advanceToNextLayer();
    }
  }
}
