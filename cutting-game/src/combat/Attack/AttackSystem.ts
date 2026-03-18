import * as THREE from 'three';
import { EnemyBase } from '../Enemy/EnemyBase';
import type { CombatConfig } from '../../data/Types';

/** 攻击结果 */
export interface AttackResult {
  hitEnemies: EnemyBase[];      // 命中的敌人
  damage: number;               // 造成的伤害
  isCritical: boolean;          // 是否暴击 (QTE 成功)
}

/**
 * 攻击系统
 * 处理射击和斩击的判定逻辑
 */
export class AttackSystem {
  private combatConfig: CombatConfig;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera, combatConfig: CombatConfig) {
    this.scene = scene;
    this.camera = camera;
    this.combatConfig = combatConfig;
  }

  /** 更新配置 */
  public setConfig(config: CombatConfig): void {
    this.combatConfig = config;
  }

  /**
   * 执行射击攻击
   * @param point 射击目标点 (3D 世界坐标)
   * @param enemies 所有敌人
   */
  public performShoot(point: THREE.Vector3, enemies: EnemyBase[]): AttackResult {
    const result: AttackResult = {
      hitEnemies: [],
      damage: this.combatConfig.Player_Damage_Shoot,
      isCritical: false
    };

    const shootRange = this.combatConfig.Hitbox_Settings.Shoot_Base_Range;
    
    console.log(`Shoot at ${JSON.stringify(point)}`);
    
    // 可视化射击点（调试用）
    this.visualizeShootPoint(point);
    
    // 对每个可交互的敌人进行判定
    for (const enemy of enemies) {
      if (!enemy.canInteract()) continue;

      const enemyPos = enemy.getPosition();
      const hitbox = enemy.getHitbox();
      
      // 敌人身体中心点：mesh.position + (0, 1, 0)（因为身体从 mesh.position.y 向上延伸 2 单位，中心在 1 单位处）
      const enemyCenter = enemyPos.clone().add(new THREE.Vector3(0, 1, 0));
      
      // 使用 Box3 进行包围盒检测
      const enemyBox = new THREE.Box3();
      const halfWidth = hitbox.Width / 2;
      const halfHeight = hitbox.Height / 2;
      enemyBox.setFromCenterAndSize(
        enemyCenter,
        new THREE.Vector3(hitbox.Width, hitbox.Height, hitbox.Width)
      );
      
      // 计算 3D 空间距离
      const distance = point.distanceTo(enemyCenter);
      
      // 检测点是否在敌人包围盒内（考虑扩展范围）
      // 由于敌人在圆柱表面上，射击点也在圆柱表面上，需要更大的容错范围
      const expandRange = shootRange * 20 + 2; // 增加基础扩展值
      const expandedBox = enemyBox.clone().expandByScalar(expandRange);
      const isHit = expandedBox.containsPoint(point);
      
      const hitRange = Math.max(hitbox.Width, hitbox.Height) + expandRange;
      
      console.log(`Enemy at ${JSON.stringify(enemyPos)}, center: ${JSON.stringify(enemyCenter)}, distance: ${distance.toFixed(2)}, hitRange: ${hitRange.toFixed(2)}, isHit: ${isHit}`);

      // 使用包围盒检测
      if (isHit) {
        console.log(`Hit!`);
        enemy.takeDamage(result.damage, 'SHOOT');
        result.hitEnemies.push(enemy);
        
        // 如果启用多命中，继续检测其他敌人
        if (!this.combatConfig.Hitbox_Settings.Enable_Multi_Hit) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * 执行斩击攻击
   * @param points 滑动轨迹点数组
   * @param enemies 所有敌人
   */
  public performSlash(points: THREE.Vector3[], enemies: EnemyBase[]): AttackResult {
    const result: AttackResult = {
      hitEnemies: [],
      damage: this.combatConfig.Player_Damage_Slash,
      isCritical: false
    };

    if (points.length < 2) return result;

    const slashRange = this.combatConfig.Hitbox_Settings.Slash_Base_Range;

    // 对每个可交互的敌人进行判定
    for (const enemy of enemies) {
      if (!enemy.canInteract()) continue;

      const enemyPos = enemy.getPosition();
      const hitbox = enemy.getHitbox();
      
      // 使用 Hitbox 进行矩形判定（考虑 XZ 平面）
      const halfWidth = hitbox.Width / 2 + slashRange;
      const halfHeight = hitbox.Height / 2 + slashRange;
      
      // 检测敌人是否在斩击轨迹附近
      if (this.isPointNearLineStrip(enemyPos, points, slashRange) ||
          this.checkRectIntersectWithLine(enemyPos, halfWidth, halfHeight, points)) {
        enemy.takeDamage(result.damage, 'SLASH');
        result.hitEnemies.push(enemy);
      }
    }

    return result;
  }

  /**
   * 检测矩形与线条带的交叉
   */
  private checkRectIntersectWithLine(center: THREE.Vector3, halfWidth: number, halfHeight: number, linePoints: THREE.Vector3[]): boolean {
    for (let i = 0; i < linePoints.length - 1; i++) {
      const start = linePoints[i];
      const end = linePoints[i + 1];
      
      // 检测线段是否与矩形相交
      if (this.lineIntersectsRect(start, end, center, halfWidth, halfHeight)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检测线段是否与矩形相交
   */
  private lineIntersectsRect(lineStart: THREE.Vector3, lineEnd: THREE.Vector3, rectCenter: THREE.Vector3, halfWidth: number, halfHeight: number): boolean {
    // 矩形边界
    const minX = rectCenter.x - halfWidth;
    const maxX = rectCenter.x + halfWidth;
    const minZ = rectCenter.z - halfHeight;
    const maxZ = rectCenter.z + halfHeight;
    
    // Cohen-Sutherland 线段裁剪算法简化版
    // 检查线段端点是否在矩形内
    if (this.pointInRect(lineStart, minX, maxX, minZ, maxZ) ||
        this.pointInRect(lineEnd, minX, maxX, minZ, maxZ)) {
      return true;
    }
    
    // 检查线段是否与矩形边界相交
    // 左边界
    if (this.lineIntersectsVerticalLine(lineStart, lineEnd, minX, minZ, maxZ)) return true;
    // 右边界
    if (this.lineIntersectsVerticalLine(lineStart, lineEnd, maxX, minZ, maxZ)) return true;
    // 上边界
    if (this.lineIntersectsHorizontalLine(lineStart, lineEnd, minX, maxX, minZ)) return true;
    // 下边界
    if (this.lineIntersectsHorizontalLine(lineStart, lineEnd, minX, maxX, maxZ)) return true;
    
    return false;
  }

  /**
   * 检查点是否在矩形内
   */
  private pointInRect(point: THREE.Vector3, minX: number, maxX: number, minZ: number, maxZ: number): boolean {
    return point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ;
  }

  /**
   * 检测线段是否与垂直线相交
   */
  private lineIntersectsVerticalLine(lineStart: THREE.Vector3, lineEnd: THREE.Vector3, x: number, zMin: number, zMax: number): boolean {
    if (Math.abs(lineStart.x - lineEnd.x) < 0.0001) return false; // 垂直线
    
    const t = (x - lineStart.x) / (lineEnd.x - lineStart.x);
    if (t < 0 || t > 1) return false;
    
    const z = lineStart.z + t * (lineEnd.z - lineStart.z);
    return z >= zMin && z <= zMax;
  }

  /**
   * 检测线段是否与水平线相交
   */
  private lineIntersectsHorizontalLine(lineStart: THREE.Vector3, lineEnd: THREE.Vector3, xMin: number, xMax: number, z: number): boolean {
    if (Math.abs(lineStart.z - lineEnd.z) < 0.0001) return false; // 水平线
    
    const t = (z - lineStart.z) / (lineEnd.z - lineStart.z);
    if (t < 0 || t > 1) return false;
    
    const x = lineStart.x + t * (lineEnd.x - lineStart.x);
    return x >= xMin && x <= xMax;
  }

  /**
   * 检测点是否在线条带附近
   * @param point 检测点
   * @param linePoints 线条点数组
   * @param threshold 判定阈值
   */
  private isPointNearLineStrip(point: THREE.Vector3, linePoints: THREE.Vector3[], threshold: number): boolean {
    for (let i = 0; i < linePoints.length - 1; i++) {
      const start = linePoints[i];
      const end = linePoints[i + 1];
      
      // 计算点到线段的最短距离
      const distance = this.pointToSegmentDistance(point, start, end);
      
      if (distance <= threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * 计算点到线段的最短距离
   */
  private pointToSegmentDistance(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3): number {
    const segment = new THREE.Vector3().subVectors(end, start);
    const pointToStart = new THREE.Vector3().subVectors(point, start);
    
    const segmentLengthSq = segment.lengthSq();
    
    if (segmentLengthSq === 0) {
      return pointToStart.length();
    }
    
    // 计算投影参数 t
    let t = pointToStart.dot(segment) / segmentLengthSq;
    
    // 限制 t 在 [0, 1] 范围内
    t = Math.max(0, Math.min(1, t));
    
    // 计算线段上最近的点
    const closestPoint = new THREE.Vector3()
      .copy(start)
      .add(segment.multiplyScalar(t));
    
    return point.distanceTo(closestPoint);
  }

  /**
   * 可视化斩击轨迹 (调试用)
   */
  public visualizeSlashTrail(points: THREE.Vector3[], duration: number = 0.5): void {
    if (points.length < 2) return;

    const material = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    
    // 定时移除
    setTimeout(() => {
      this.scene.remove(line);
      geometry.dispose();
      material.dispose();
    }, duration * 1000);
  }

  /**
   * 可视化射击点 (调试用)
   */
  public visualizeShootPoint(point: THREE.Vector3, duration: number = 1.0): void {
    // 创建射击点标记（黄色小球）
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(point);
    this.scene.add(sphere);
    
    // 定时移除
    setTimeout(() => {
      this.scene.remove(sphere);
      geometry.dispose();
      material.dispose();
    }, duration * 1000);
  }
}
