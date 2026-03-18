import * as THREE from 'three';

/** 滚筒世界配置 */
export interface CylinderWorldConfig {
  radius: number;        // 滚筒半径
  height: number;        // 滚筒高度
  segments: number;      // 径向分段数
  cameraDistance: number;// 相机距离（从 X 轴正方向看向圆筒）
}

/** 默认配置 */
const DEFAULT_CONFIG: CylinderWorldConfig = {
  radius: 10,
  height: 20,
  segments: 32,
  cameraDistance: 30     // 相机距离 - 从 Z 轴负方向看向圆筒
};

/**
 * 滚筒世界 - 创建类似动森的 3D 卷轴场景
 * 敌人沿圆柱表面移动，从地平线涌现
 */
export class CylinderWorld {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  
  private cylinder: THREE.Mesh | null = null;
  private config: CylinderWorldConfig;
  
  // 通道标记线
  private laneLines: THREE.Group;

  constructor(container: HTMLElement, config: Partial<CylinderWorldConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // 天空蓝
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 50);

    // 创建相机 - 经典 4 通道卷轴游戏视角
    // 从圆筒一端（Z 轴负方向）看向圆筒，可以看到圆筒顶部和沿圆筒表面移动的敌人
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    // 摄像机在 Z 轴负方向，Y 轴上方，看向 Z 轴正方向
    this.camera.position.set(0, this.config.radius * 1.5, -this.config.cameraDistance);
    // 看向圆筒顶部中心
    this.camera.lookAt(0, this.config.radius, 0);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // 创建滚筒地面
    this.createCylinder();
    
    // 创建通道标记
    this.laneLines = new THREE.Group();
    this.createLaneLines();
    this.scene.add(this.laneLines);

    // 创建光照
    this.createLighting();

    // 处理窗口大小变化
    window.addEventListener('resize', () => this.onResize());
  }

  /** 创建滚筒地面 */
  private createCylinder(): void {
    // 圆柱几何体 - 横放
    const geometry = new THREE.CylinderGeometry(
      this.config.radius,
      this.config.radius,
      this.config.height,
      this.config.segments,
      1,
      true // 开放两端
    );

    // 旋转 90 度使圆柱横放
    geometry.rotateZ(Math.PI / 2);

    // 创建材质 - 草地绿色
    const material = new THREE.MeshStandardMaterial({
      color: 0x7cba3d,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide // 双面渲染
    });

    this.cylinder = new THREE.Mesh(geometry, material);
    this.cylinder.receiveShadow = true;
    this.scene.add(this.cylinder);
    
    console.log(`CylinderWorld: Cylinder created with radius=${this.config.radius}, height=${this.config.height}`);

    // 添加地面网格线帮助视觉深度
    const gridHelper = new THREE.GridHelper(20, 10, 0x5a9a2d, 0x5a9a2d);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.scale.z = this.config.radius / 10;
    this.scene.add(gridHelper);
  }

  /** 创建 4 通道标记线 */
  private createLaneLines(): void {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    
    // 4 通道，需要 3 条分隔线
    const laneWidth = this.config.height / 4;
    const startZ = -this.config.height / 2;
    
    for (let i = 1; i < 4; i++) {
      const z = startZ + i * laneWidth;
      
      // 创建沿圆柱表面的曲线
      const points = [];
      const segments = 20;
      const angleRange = Math.PI / 3; // 60 度可见范围
      
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * angleRange - angleRange / 2;
        const x = Math.sin(angle) * this.config.radius;
        const y = Math.cos(angle) * this.config.radius;
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.laneLines.add(line);
    }
  }

  /** 创建光照 */
  private createLighting(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 平行光 (太阳)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  /** 处理窗口大小变化 */
  private onResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  /** 获取通道中心位置 (3D 世界坐标) */
  public getLanePosition(lane: number, distance: number): THREE.Vector3 {
    // lane: 1-4, distance: 距离中心的距离 (正值远离玩家)
    const laneWidth = this.config.height / 4;
    const laneCenter = (lane - 2.5) * laneWidth; // 中心偏移
    
    // 计算圆柱表面角度
    const angle = laneCenter / this.config.radius;
    
    // 敌人应该站在圆柱顶部表面，Y 轴向上
    // 圆柱横放，顶部在 Y 正方向，所以 Y = radius, X = 0 附近
    return new THREE.Vector3(
      Math.sin(angle) * this.config.radius,
      Math.cos(angle) * this.config.radius,
      distance
    );
  }
  
  /** 获取圆柱表面法线方向（从原点指向表面点） */
  public getSurfaceNormal(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, 0).normalize();
  }

  /** 获取通道宽度 (世界单位) */
  public getLaneWidth(): number {
    return this.config.height / 4;
  }

  /** 获取滚筒半径 */
  public getRadius(): number {
    return this.config.radius;
  }

  /** 渲染 */
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** 销毁 */
  public dispose(): void {
    window.removeEventListener('resize', () => this.onResize());
    
    if (this.cylinder) {
      (this.cylinder.geometry as THREE.BufferGeometry).dispose();
      (this.cylinder.material as THREE.Material).dispose();
    }
    
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
