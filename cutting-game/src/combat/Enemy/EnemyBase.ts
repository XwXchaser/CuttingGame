import * as THREE from 'three';
import type { EnemyTemplate, HitboxConfig } from '../../data/Types';

/** 攻击类型 */
export type AttackType = 'SHOOT' | 'SLASH';

/**
 * 敌人基类
 * 所有敌人类型的基类，处理通用逻辑
 */
export class EnemyBase {
  public readonly template: EnemyTemplate;
  public readonly mesh: THREE.Group;
  
  protected currentHP: number;
  protected isDead: boolean = false;
  
  // 层级相关
  protected layerIndex: number = 1;
  protected isInteractable: boolean = false;
  
  // 涌现动画
  protected emergenceProgress: number = 0;
  protected emergenceSpeed: number = 2.0;
  protected isEmerging: boolean = true;
  
  // Hitbox
  protected hitbox: HitboxConfig;
  
  // 可视化血条
  protected hpBar: THREE.Group | null = null;
  protected hpBarTimer: number = 0;

  constructor(template: EnemyTemplate, position: THREE.Vector3) {
    this.template = template;
    this.currentHP = template.BaseHP;
    this.hitbox = { ...template.Hitbox_Default };
    
    // 创建敌人模型组
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    
    // 创建临时视觉表示 (占位图)
    this.createVisualRepresentation();
  }

  /** 创建视觉表示 (占位用几何体) */
  protected createVisualRepresentation(): void {
    // 使用不同颜色的盒子代表不同敌人
    const color = this.getEnemyColor();
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color,
      transparent: true,
      opacity: 0.8
    });
    
    const body = new THREE.Mesh(geometry, material);
    body.castShadow = true;
    body.position.y = 1; // 站在地面上
    this.mesh.add(body);
    
    // 添加方向指示器（指向玩家/相机方向）
    const indicatorGeometry = new THREE.ConeGeometry(0.3, 0.5, 4);
    const indicatorMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.y = 2.2;
    indicator.rotation.x = Math.PI; // 指向玩家
    this.mesh.add(indicator);
    
    // 添加弱点标记（顶部）
    const weaknessMarkerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const weaknessMarkerMaterial = new THREE.MeshStandardMaterial({ 
      color: this.template.WeaknessType === 'SLASH' ? 0x00ff00 : 0xff0000 
    });
    const weaknessMarker = new THREE.Mesh(weaknessMarkerGeometry, weaknessMarkerMaterial);
    weaknessMarker.position.y = 2.5;
    this.mesh.add(weaknessMarker);
  }

  /** 更新敌人方向，使其垂直于滚筒表面 */
  public updateOrientation(radius: number = 10): void {
    // 计算敌人在圆柱表面的法线方向
    const pos = this.mesh.position;
    
    // 圆柱体经过 rotateZ(π/2) 旋转后沿 X 轴横放
    // 圆柱表面法线在 YZ 平面内（从 X 轴指向外）
    // 法线方向是从 (pos.x, 0, 0) 指向敌人位置的向量，即 (0, y, z) 方向
    const normal = new THREE.Vector3(0, pos.y, pos.z).normalize();
    
    // 使用 lookAt 方法让敌人面向相机
    // 首先重置旋转
    this.mesh.rotation.set(0, 0, 0);
    
    // 让敌人 Y 轴沿着法线方向
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    this.mesh.setRotationFromQuaternion(quaternion);
    
    // 计算敌人到相机的方向
    const cameraPos = new THREE.Vector3(0, 15, 25);
    const toCamera = new THREE.Vector3().subVectors(cameraPos, pos).normalize();
    
    // 敌人需要面向相机，但 Y 轴已经沿着法线方向
    // 我们需要找到一个旋转，使得：
    // 1. Y 轴沿着法线方向
    // 2. 敌人的正面（-Z 轴）尽可能面向相机
    
    // 使用叉乘计算敌人的 X 轴方向（垂直于 Y 轴和 toCamera 方向）
    const right = new THREE.Vector3().crossVectors(normal, toCamera).normalize();
    
    // 如果 right 向量太小（法线和 toCamera 几乎平行），使用备用方案
    if (right.length() < 0.001) {
      // 法线和 toCamera 几乎平行，使用 X 轴作为参考
      right.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize();
    }
    
    // 计算敌人的前向（Z 轴）
    const forward = new THREE.Vector3().crossVectors(right, normal);
    
    // 创建旋转矩阵
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(right, normal, forward);
    this.mesh.setRotationFromMatrix(matrix);
  }

  /** 获取敌人颜色 (根据类型) */
  protected getEnemyColor(): number {
    switch (this.template.WeaknessType) {
      case 'SLASH':
        return 0xff4444; // 红色 - 弱斩击
      case 'SHOOT':
        return 0x4444ff; // 蓝色 - 弱射击
      default:
        return 0x8844ff; // 紫色 - BOSS
    }
  }

  /** 设置层级 */
  public setLayer(layerIndex: number, isInteractable: boolean): void {
    this.layerIndex = layerIndex;
    this.isInteractable = isInteractable;
    
    // 更新透明度
    const opacity = isInteractable ? 1.0 : 0.4;
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshStandardMaterial).transparent = true;
        (child.material as THREE.MeshStandardMaterial).opacity = opacity;
      }
    });
  }

  /** 开始涌现动画 */
  public startEmergence(): void {
    this.isEmerging = true;
    this.emergenceProgress = 0;
    this.mesh.scale.set(0, 0, 0);
  }

  /** 更新涌现动画 */
  protected updateEmergence(deltaTime: number): void {
    if (!this.isEmerging) return;
    
    this.emergenceProgress += deltaTime * this.emergenceSpeed;
    
    if (this.emergenceProgress >= 1) {
      this.emergenceProgress = 1;
      this.isEmerging = false;
      this.mesh.scale.set(1, 1, 1);
    } else {
      // 正弦曲线涌现效果
      const scale = Math.sin(this.emergenceProgress * Math.PI / 2);
      this.mesh.scale.set(scale, scale, scale);
    }
  }

  /** 承受伤害 */
  public takeDamage(amount: number, attackType: AttackType): boolean {
    if (this.isDead || !this.isInteractable) return false;
    
    // 计算弱点倍率
    let multiplier = 1.0;
    if (attackType === 'SLASH') {
      multiplier = this.template.DamageMult_Slash;
    } else if (attackType === 'SHOOT') {
      multiplier = this.template.DamageMult_Shoot;
    }
    
    const finalDamage = amount * multiplier;
    this.currentHP -= finalDamage;
    
    // 显示被击中的视觉反馈
    this.showHitEffect();
    
    // 显示血条
    this.showHPBar();
    
    // 检查是否死亡
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.isDead = true;
      this.onDeath();
      return true; // 击杀
    }
    
    return false; // 未击杀
  }

  /** 显示被击中的视觉反馈 */
  protected showHitEffect(): void {
    // 闪烁效果：将敌人变为白色，然后恢复原色
    const flashDuration = 0.1; // 秒
    const originalColors: Map<THREE.Mesh, number> = new Map();
    
    // 保存原始颜色并设置为白色
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        originalColors.set(child, material.color.getHex());
        material.color.setHex(0xffffff); // 白色闪烁
      }
    });
    
    // 恢复原始颜色
    setTimeout(() => {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && originalColors.has(child)) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.color.setHex(originalColors.get(child)!);
        }
      });
    }, flashDuration * 1000);
  }

  /** 显示血条 */
  protected showHPBar(): void {
    this.hpBarTimer = 0.5; // 显示 0.5 秒
    // TODO: 实现血条 UI
  }

  /** 死亡回调 */
  protected onDeath(): void {
    // 播放死亡特效
    // 暂时使用隐藏方式，后续应该播放动画
    this.mesh.visible = false;
  }

  /** 更新 */
  public update(deltaTime: number): void {
    this.updateEmergence(deltaTime);
    
    // 更新血条计时器
    if (this.hpBarTimer > 0) {
      this.hpBarTimer -= deltaTime;
      if (this.hpBarTimer <= 0 && this.hpBar) {
        this.hpBar.visible = false;
      }
    }
  }

  /** 检查是否可交互 */
  public canInteract(): boolean {
    return this.isInteractable && !this.isDead;
  }

  /** 检查是否存活 */
  public isAlive(): boolean {
    return !this.isDead;
  }

  /** 检查是否完成涌现 */
  public hasEmerged(): boolean {
    return !this.isEmerging;
  }

  /** 获取 Hitbox */
  public getHitbox(): HitboxConfig {
    return this.hitbox;
  }

  /** 获取当前位置 */
  public getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  /** 销毁 */
  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
