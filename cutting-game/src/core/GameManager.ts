import * as THREE from 'three';
import { CylinderWorld } from '../scene/CylinderWorld';
import { InputManager, InputEvent, SlashEventData, ClickEventData, AttackType } from './InputManager';
import { LayerSystem } from '../combat/LayerSystem';
import { ConfigManager } from '../data/ConfigManager';
import type { CombatConfig } from '../data/Types';
import { GameStateValue } from '../data/Types';
import { AttackSystem, AttackResult } from '../combat/Attack/AttackSystem';

/**
 * 游戏管理器
 * 统筹游戏核心逻辑
 */
export class GameManager {
  private readonly container: HTMLElement;
  
  // 核心系统
  private world: CylinderWorld | null = null;
  private inputManager: InputManager | null = null;
  private layerSystem: LayerSystem | null = null;
  private attackSystem: AttackSystem | null = null;
  private configManager: ConfigManager;
  
  // 游戏状态
  private gameState: string = 'IDLE';
  private timeRemaining: number = 0;
  private currentLevelID: string = '';
  
  // 战斗配置
  private combatConfig: CombatConfig | null = null;
  
  // UI 元素
  private timerElement: HTMLElement | null = null;
  private layerIndicatorElement: HTMLElement | null = null;
  
  // 渲染循环
  private lastTime: number = 0;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.configManager = ConfigManager.getInstance();
  }

  /** 初始化游戏 */
  public async initialize(): Promise<void> {
    console.log('GameManager: Initializing...');
    
    // 加载配置
    await this.configManager.loadCombatConfig();
    await this.configManager.loadEnemyTemplates();
    
    this.combatConfig = this.configManager.getCombatConfig();
    
    // 创建 3D 世界
    this.world = new CylinderWorld(this.container);
    
    // 创建输入管理器
    this.inputManager = new InputManager(
      this.world.renderer.domElement,
      this.world.camera
    );
    
    // 注册输入回调
    this.inputManager.onInput((event) => this.handleInput(event));
    
    // 创建层级系统
    this.layerSystem = new LayerSystem(this.world);
    
    // 创建攻击系统
    if (this.combatConfig) {
      this.attackSystem = new AttackSystem(
        this.world.scene,
        this.world.camera,
        this.combatConfig
      );
    }
    
    // 获取 UI 元素
    this.timerElement = document.getElementById('timer');
    this.layerIndicatorElement = document.getElementById('layer-indicator');
    
    console.log('GameManager: Initialization complete');
  }

  /** 开始关卡 */
  public async startLevel(levelID: string): Promise<boolean> {
    console.log(`GameManager: Starting level ${levelID}`);
    
    // 加载关卡配置
    const levelConfig = await this.configManager.loadLevelConfig(levelID);
    if (!levelConfig) {
      console.error(`GameManager: Failed to load level ${levelID}`);
      return false;
    }
    
    this.currentLevelID = levelID;
    
    // 初始化层级系统
    if (this.layerSystem) {
      this.layerSystem.initialize(levelConfig.Layers);
    }
    
    // 设置时间
    this.timeRemaining = levelConfig.TimeLimit;
    
    // 更新状态
    this.gameState = 'PLAYING';
    this.lastTime = performance.now() / 1000;
    
    // 开始游戏循环
    this.startGameLoop();
    
    console.log(`GameManager: Level ${levelID} started`);
    return true;
  }

  /** 处理输入 */
  private handleInput(event: InputEvent): void {
    if (this.gameState !== GameStateValue.PLAYING) return;
    
    switch (event.type) {
      case 'SHOOT':
        this.handleShoot(event);
        break;
      case 'SLASH':
        this.handleSlash(event);
        break;
    }
  }

  /** 处理射击 */
  private handleShoot(event: ClickEventData): void {
    console.log('GameManager: Shoot at', event.point);
    
    if (!this.layerSystem || !this.attackSystem) return;
    
    const enemies = this.layerSystem.getCurrentLayerEnemies();
    const result = this.attackSystem.performShoot(event.point, enemies);
    
    if (result.hitEnemies.length > 0) {
      console.log(`Shoot hit ${result.hitEnemies.length} enemies`);
    }
  }

  /** 处理斩击 */
  private handleSlash(event: SlashEventData): void {
    console.log('GameManager: Slash with', event.points.length, 'points');
    
    if (!this.layerSystem || !this.attackSystem) return;
    
    const enemies = this.layerSystem.getCurrentLayerEnemies();
    const result = this.attackSystem.performSlash(event.points, enemies);
    
    // 可视化轨迹 (调试用)
    this.attackSystem.visualizeSlashTrail(event.points);
    
    if (result.hitEnemies.length > 0) {
      console.log(`Slash hit ${result.hitEnemies.length} enemies`);
    }
  }

  /** 开始游戏循环 */
  private startGameLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.lastTime = performance.now() / 1000;
    this.gameLoop();
  }

  /** 游戏循环 */
  private gameLoop = (): void => {
    const now = performance.now() / 1000;
    const deltaTime = Math.min(now - this.lastTime, 0.1); // 限制最大 deltaTime
    this.lastTime = now;
    
    if (this.gameState === GameStateValue.PLAYING) {
      this.update(deltaTime);
    }
    
    if (this.world) {
      this.world.render();
    }
    
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  /** 更新游戏逻辑 */
  private update(deltaTime: number): void {
    // 更新剩余时间
    this.timeRemaining -= deltaTime;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.checkDefeat();
    }
    
    // 更新层级系统
    if (this.layerSystem) {
      this.layerSystem.update(deltaTime);
      
      // 检查胜利条件
      if (this.layerSystem.areAllLayersCleared()) {
        this.handleVictory();
      }
    }
    
    // 更新 UI
    this.updateUI();
  }

  /** 更新 UI */
  private updateUI(): void {
    if (this.timerElement) {
      this.timerElement.textContent = this.timeRemaining.toFixed(1);
    }
    
    if (this.layerIndicatorElement && this.layerSystem) {
      const current = this.layerSystem.getCurrentLayerIndex();
      const total = this.layerSystem.getTotalLayers();
      this.layerIndicatorElement.textContent = `Layer ${current} / ${total}`;
    }
  }

  /** 检查胜利 */
  private handleVictory(): void {
    console.log('GameManager: Victory!');
    this.gameState = 'VICTORY';
    // TODO: 显示胜利 UI
  }

  /** 检查失败 */
  private checkDefeat(): void {
    if (this.gameState !== 'PLAYING') return;
    
    if (this.layerSystem && !this.layerSystem.areAllLayersCleared()) {
      console.log('GameManager: Defeat - Time expired');
      this.gameState = 'DEFEAT';
      // TODO: 显示失败 UI
    }
  }

  /** 暂停游戏 */
  public pause(): void {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
    }
  }

  /** 恢复游戏 */
  public resume(): void {
    if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.lastTime = performance.now() / 1000;
    }
  }

  /** 停止游戏 */
  public stop(): void {
    this.gameState = 'IDLE';
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /** 获取剩余时间 */
  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /** 获取游戏状态 */
  public getGameState(): string {
    return this.gameState;
  }

  /** 销毁 */
  public dispose(): void {
    this.stop();
    
    if (this.inputManager) {
      this.inputManager.dispose();
      this.inputManager = null;
    }
    
    if (this.layerSystem) {
      this.layerSystem.clearAllLayers();
      this.layerSystem = null;
    }
    
    if (this.world) {
      this.world.dispose();
      this.world = null;
    }
  }
}
