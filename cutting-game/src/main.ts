import './style.css';
import { GameManager } from './core/GameManager';

/**
 * 伪 3D 卷轴动作游戏 - 主入口
 * 
 * 核心玩法：
 * - 4 通道垂直卷轴
 * - 点击射击 / 滑动斩击
 * - 分层推进机制
 */

// 游戏容器
const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  // 创建游戏管理器
  const gameManager = new GameManager(app);
  
  // 初始化并启动游戏
  (async () => {
    try {
      await gameManager.initialize();
      console.log('Game initialized successfully');
      
      // 开始第一关
      const started = await gameManager.startLevel('LV_001');
      if (started) {
        console.log('Level LV_001 started');
      } else {
        console.error('Failed to start level LV_001');
      }
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  })();
} else {
  console.error('Failed to find #app element');
}
