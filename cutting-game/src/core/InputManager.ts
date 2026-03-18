import * as THREE from 'three';
import { AttackTypeValue } from '../data/Types';

/** 攻击类型 */
export type AttackType = 'SHOOT' | 'SLASH';

/** 点击事件数据 */
export interface ClickEventData {
  type: AttackType;
  point: THREE.Vector3;  // 3D 世界坐标点击位置
  normal: THREE.Vector3; // 点击面法线
}

/** 滑动事件数据 */
export interface SlashEventData {
  type: AttackType;
  points: THREE.Vector3[]; // 滑动轨迹点 (3D 世界坐标)
}

/** 输入事件 */
export type InputEvent = ClickEventData | SlashEventData;

/** 输入事件回调 */
export type InputCallback = (data: InputEvent) => void;

/**
 * 输入管理器
 * 处理触摸/鼠标输入，检测点击和滑动
 */
export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.Camera;
  
  private callbacks: InputCallback[] = [];
  
  // 输入状态
  private isPointerDown: boolean = false;
  private pointerStartPos: { x: number; y: number } | null = null;
  private pointerCurrentPos: { x: number; y: number } | null = null;
  
  // 滑动轨迹
  private slashTrail: THREE.Vector3[] = [];
  
  // 阈值
  private readonly SLASH_THRESHOLD = 50; // 像素 - 超过此距离算滑动
  private readonly TRAIL_SAMPLE_INTERVAL = 0.05; // 秒 - 轨迹采样间隔
  
  private lastSampleTime: number = 0;

  constructor(canvas: HTMLCanvasElement, camera: THREE.Camera) {
    this.canvas = canvas;
    this.camera = camera;
    
    this.setupEventListeners();
  }

  /** 设置事件监听 */
  private setupEventListeners(): void {
    // 触摸事件
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    
    // 鼠标事件
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  /** 获取指针位置 */
  private getPointerPosition(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  /** 将屏幕坐标转换为 3D 射线 */
  private getRayFromScreen(x: number, y: number): THREE.Raycaster {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((x - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((y - rect.top) / rect.height) * 2 + 1;
    
    console.log('getRayFromScreen: screenPos=(' + x + ',' + y + '), rect=(' + rect.left + ',' + rect.top + ',' + rect.width + ',' + rect.height + '), ndc=(' + ndcX.toFixed(2) + ',' + ndcY.toFixed(2) + ')');
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    
    console.log('getRayFromScreen: rayOrigin=(' + raycaster.ray.origin.x.toFixed(2) + ',' + raycaster.ray.origin.y.toFixed(2) + ',' + raycaster.ray.origin.z.toFixed(2) + '), rayDir=(' + raycaster.ray.direction.x.toFixed(2) + ',' + raycaster.ray.direction.y.toFixed(2) + ',' + raycaster.ray.direction.z.toFixed(2) + ')');
    
    return raycaster;
  }

  /** 射线与圆柱世界相交检测 */
  private intersectCylinder(raycaster: THREE.Raycaster, cylinderRadius: number = 10): THREE.Vector3 | null {
    // 与圆柱体进行精确相交检测
    // 圆柱体沿 X 轴横放（经过 rotateZ(PI/2) 旋转），中心在原点
    // 圆柱方程：y^2 + z^2 = radius^2
    
    const ray = raycaster.ray;
    const origin = ray.origin;
    const direction = ray.direction;
    
    console.log('intersectCylinder: origin=(' + origin.x + ',' + origin.y + ',' + origin.z + '), direction=(' + direction.x + ',' + direction.y + ',' + direction.z + ')');
    
    // 圆柱方程：y^2 + z^2 = radius^2 (沿 X 轴的无限圆柱)
    // 射线方程：P = origin + t * direction
    
    // 代入得：(oy + t*dy)^2 + (oz + t*dz)^2 = r^2
    // 展开：oy^2 + 2*t*oy*dy + t^2*dy^2 + oz^2 + 2*t*oz*dz + t^2*dz^2 = r^2
    // 整理：t^2*(dy^2 + dz^2) + t*(2*oy*dy + 2*oz*dz) + (oy^2 + oz^2 - r^2) = 0
    
    const a = direction.y * direction.y + direction.z * direction.z;
    const distFromAxis = Math.sqrt(origin.y * origin.y + origin.z * origin.z);
    
    console.log('intersectCylinder: a=' + a.toFixed(4) + ' (dy^2+dz^2), distFromAxis=' + distFromAxis.toFixed(2) + ', cylinderRadius=' + cylinderRadius);
    
    // 处理 a = 0 的情况（射线与圆柱轴线平行，即沿 X 轴方向）
    if (a < 0.0001) {
      console.log('intersectCylinder: a is too small, ray parallel to cylinder axis (X-axis)');
      // 射线几乎平行于 X 轴，检查是否在圆柱内部
      if (distFromAxis <= cylinderRadius) {
        // 在圆柱内部，返回原点投影到圆柱表面的点
        return new THREE.Vector3(
          origin.x,
          origin.y,
          origin.z
        );
      }
      return null;
    }
    
    const ox = origin.x;
    const oy = origin.y;
    const oz = origin.z;
    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;
    
    console.log('intersectCylinder: oy^2+oz^2=' + (oy * oy + oz * oz) + ', r^2=' + (cylinderRadius * cylinderRadius));
    
    const b = 2 * (oy * dy + oz * dz);
    const c = oy * oy + oz * oz - cylinderRadius * cylinderRadius;
    
    console.log('intersectCylinder: b=' + b + ' (calc: 2*(' + oy + '*' + dy + '+' + oz + '*' + dz + '))');
    console.log('intersectCylinder: c=' + c + ' (calc: ' + (oy * oy) + '+' + (oz * oz) + '-' + (cylinderRadius * cylinderRadius) + ')');
    
    const discriminant = b * b - 4 * a * c;
    console.log('intersectCylinder quadratic: a=' + a.toFixed(4) + ', b=' + b.toFixed(4) + ', c=' + c.toFixed(4) + ', discriminant=' + discriminant.toFixed(4));
    console.log('intersectCylinder: 4ac=' + (4 * a * c).toFixed(4) + ', b^2=' + (b * b).toFixed(4));
    
    if (discriminant < 0) {
      console.log('intersectCylinder: no intersection (discriminant < 0)');
      return null; // 无交点
    }
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    console.log('intersectCylinder t values:', { t1, t2 });
    
    // 选择最近的正面交点
    let t = t1 > 0.001 ? t1 : (t2 > 0.001 ? t2 : -1);
    
    if (t < 0) {
      console.log('intersectCylinder: intersection behind camera');
      return null; // 交点在相机后面
    }
    
    const intersection = new THREE.Vector3()
      .copy(origin)
      .add(direction.clone().multiplyScalar(t));
    
    console.log('intersectCylinder intersection:', { x: intersection.x, y: intersection.y, z: intersection.z });
    
    // 检查交点是否在圆柱的有效高度范围内
    // 圆柱沿 X 轴，高度范围是 X 坐标 [-10, 10]
    const cylinderHeight = 20;
    if (Math.abs(intersection.x) > cylinderHeight / 2) {
      console.log('intersectCylinder: intersection outside cylinder height range (x=' + intersection.x + ')');
      return null; // 交点超出圆柱高度范围
    }
    
    return intersection;
  }

  // ========== 触摸事件处理 ==========
  
  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getPointerPosition(touch.clientX, touch.clientY);
    
    this.isPointerDown = true;
    this.pointerStartPos = pos;
    this.pointerCurrentPos = pos;
    this.slashTrail = [];
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isPointerDown) return;
    
    const touch = e.touches[0];
    this.pointerCurrentPos = this.getPointerPosition(touch.clientX, touch.clientY);
    
    // 采样轨迹点
    const now = performance.now() / 1000;
    if (now - this.lastSampleTime >= this.TRAIL_SAMPLE_INTERVAL) {
      this.sampleTrailPoint();
      this.lastSampleTime = now;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isPointerDown) return;
    
    this.isPointerDown = false;
    this.handleInputEnd();
  }

  // ========== 鼠标事件处理 ==========
  
  private onMouseDown(e: MouseEvent): void {
    const pos = this.getPointerPosition(e.clientX, e.clientY);
    
    console.log('InputManager: onMouseDown at', pos);
    
    this.isPointerDown = true;
    this.pointerStartPos = pos;
    this.pointerCurrentPos = pos;
    this.slashTrail = [];
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isPointerDown) return;
    
    this.pointerCurrentPos = this.getPointerPosition(e.clientX, e.clientY);
    
    // 采样轨迹点
    const now = performance.now() / 1000;
    if (now - this.lastSampleTime >= this.TRAIL_SAMPLE_INTERVAL) {
      this.sampleTrailPoint();
      this.lastSampleTime = now;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.isPointerDown) return;
    
    this.isPointerDown = false;
    this.handleInputEnd();
  }

  // ========== 输入处理逻辑 ==========
  
  /** 采样轨迹点 */
  private sampleTrailPoint(): void {
    if (!this.pointerCurrentPos) return;
    
    const point = this.screenToWorld(this.pointerCurrentPos.x, this.pointerCurrentPos.y);
    if (point) {
      this.slashTrail.push(point);
    }
  }

  /** 处理输入结束 */
  private handleInputEnd(): void {
    console.log('InputManager: handleInputEnd', {
      hasStartPos: !!this.pointerStartPos,
      hasCurrentPos: !!this.pointerCurrentPos
    });
    
    if (!this.pointerStartPos || !this.pointerCurrentPos) {
      this.pointerStartPos = null;
      this.pointerCurrentPos = null;
      return;
    }
    
    // 计算移动距离
    const dx = this.pointerCurrentPos.x - this.pointerStartPos.x;
    const dy = this.pointerCurrentPos.y - this.pointerStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    console.log('InputManager: distance =', distance, 'threshold =', this.SLASH_THRESHOLD);
    
    if (distance >= this.SLASH_THRESHOLD) {
      // 滑动 - 斩击
      console.log('InputManager: SLASH');
      this.emitSlashEvent();
    } else {
      // 点击 - 射击
      console.log('InputManager: SHOOT');
      this.emitClickEvent();
    }
    
    this.pointerStartPos = null;
    this.pointerCurrentPos = null;
    this.slashTrail = [];
  }

  /** 屏幕坐标转世界坐标 */
  private screenToWorld(x: number, y: number): THREE.Vector3 | null {
    const raycaster = this.getRayFromScreen(x, y);
    console.log('InputManager: screenToWorld', { x, y, rayOrigin: raycaster.ray.origin, rayDirection: raycaster.ray.direction });
    // 与圆柱体相交检测（半径 10，与 CylinderWorld 配置一致）
    const result = this.intersectCylinder(raycaster, 10);
    console.log('InputManager: intersectCylinder result:', result);
    return result;
  }

  /** 发射点击事件 */
  private emitClickEvent(): void {
    console.log('=== emitClickEvent START ===');
    const posDebug = this.pointerStartPos ? `{x:${this.pointerStartPos.x}, y:${this.pointerStartPos.y}}` : 'null';
    console.log('InputManager: emitClickEvent pointerStartPos=' + posDebug);
    
    if (!this.pointerStartPos) {
      console.log('InputManager: emitClickEvent - no pointerStartPos');
      return;
    }
    
    console.log('InputManager: about to call screenToWorld');
    const point = this.screenToWorld(this.pointerStartPos.x, this.pointerStartPos.y);
    console.log('InputManager: screenToWorld returned ' + (point ? '{x:' + point.x + ',y:' + point.y + ',z:' + point.z + '}' : 'null'));
    if (!point) {
      console.log('InputManager: emitClickEvent - screenToWorld returned null');
      return;
    }
    
    console.log('InputManager: emitClickEvent - point:', point);
    console.log('=== emitClickEvent END ===');
    
    const event: ClickEventData = {
      type: 'SHOOT',
      point,
      normal: new THREE.Vector3(0, 0, 1)
    };
    
    this.notifyCallbacks(event);
  }

  /** 发射滑动事件 */
  private emitSlashEvent(): void {
    if (this.slashTrail.length < 2) return;
    
    const event: SlashEventData = {
      type: 'SLASH',
      points: this.slashTrail
    };
    
    this.notifyCallbacks(event);
  }

  /** 注册输入回调 */
  public onInput(callback: InputCallback): void {
    this.callbacks.push(callback);
  }

  /** 通知所有回调 */
  private notifyCallbacks(event: InputEvent): void {
    for (const callback of this.callbacks) {
      callback(event);
    }
  }

  /** 销毁 */
  public dispose(): void {
    this.canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.callbacks = [];
  }
}
