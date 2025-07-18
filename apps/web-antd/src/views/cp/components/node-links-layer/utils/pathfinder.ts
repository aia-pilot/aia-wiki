import type { GridCell, Point } from '../types';

/**
 * 定义四个正交方向：左、右、上、下
 */
const DIRECTIONS = [
  { x: -1, y: 0 },  // 左
  { x: 1, y: 0 },   // 右
  { x: 0, y: -1 },  // 上
  { x: 0, y: 1 }    // 下
];

/**
 * A* 寻路算法实现
 * 用于在网格中寻找两点之间的最优正交路径，避开障碍物
 */
export class AStarPathfinder {
  private grid: GridCell[][];
  private width: number;
  private height: number;
  private gridSize: number;

  /**
   * 创建一个新的 A* 寻路器
   * @param width 网格宽度
   * @param height 网格高度
   * @param gridSize 网格单元格大小
   */
  constructor(width: number, height: number, gridSize: number) {
    this.width = Math.ceil(width / gridSize);
    this.height = Math.ceil(height / gridSize);
    this.gridSize = gridSize;
    this.grid = this.createGrid();
  }

  /**
   * 创建空网格
   */
  private createGrid(): GridCell[][] {
    const grid: GridCell[][] = [];
    for (let y = 0; y < this.height; y++) {
      grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        grid[y]![x] = { x, y, blocked: false };
      }
    }
    return grid;
  }

  /**
   * 设置障碍物
   * @param obstacles 障碍物元素列表
   * @param containerRect 容器矩形
   * @param padding 障碍物周围的内边距
   */
  setObstacles(obstacles: HTMLElement[], containerRect: DOMRect, padding: number) {
    // 重置网格
    this.grid.forEach(row => {
      row.forEach(cell => {
        cell.blocked = false;
      });
    });

    // 设置障碍物
    obstacles.forEach(obstacle => {
      const rect = obstacle.getBoundingClientRect();
      const left = rect.left - containerRect.left - padding;
      const top = rect.top - containerRect.top - padding;
      const right = rect.right - containerRect.left + padding;
      const bottom = rect.bottom - containerRect.top + padding;

      const startX = Math.max(0, Math.floor(left / this.gridSize));
      const startY = Math.max(0, Math.floor(top / this.gridSize));
      const endX = Math.min(this.width - 1, Math.ceil(right / this.gridSize));
      const endY = Math.min(this.height - 1, Math.ceil(bottom / this.gridSize));

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          if (y >= 0 && y < this.height && x >= 0 && x < this.width && this.grid[y]) {
            this.grid[y]![x]!.blocked = true;
          }
        }
      }
    });
  }

  /**
   * 寻找从起点到终点的最优路径
   * @param start 起点坐标
   * @param end 终点坐标
   * @returns 路径点数组
   */
  findPath(start: Point, end: Point): Point[] {
    const startGrid = {
      x: Math.floor(start.x / this.gridSize),
      y: Math.floor(start.y / this.gridSize)
    };
    const endGrid = {
      x: Math.floor(end.x / this.gridSize),
      y: Math.floor(end.y / this.gridSize)
    };

    // 确保起点和终点不在障碍物内
    if (startGrid.y >= 0 && startGrid.y < this.height &&
        startGrid.x >= 0 && startGrid.x < this.width &&
        this.grid[startGrid.y]?.[startGrid.x]?.blocked) {
      // 如果起点在障碍物内，尝试找到附近非障碍的点
      const nearbyPoints = this.findNearbyNonBlockedPoint(startGrid);
      if (nearbyPoints) {
        startGrid.x = nearbyPoints.x;
        startGrid.y = nearbyPoints.y;
      }
    }

    if (endGrid.y >= 0 && endGrid.y < this.height &&
        endGrid.x >= 0 && endGrid.x < this.width &&
        this.grid[endGrid.y]?.[endGrid.x]?.blocked) {
      // 如果终点在障碍物内，尝试找到附近非障碍的点
      const nearbyPoints = this.findNearbyNonBlockedPoint(endGrid);
      if (nearbyPoints) {
        endGrid.x = nearbyPoints.x;
        endGrid.y = nearbyPoints.y;
      }
    }

    // A* 算法实现
    const openSet = [startGrid];
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, Point>();

    const key = (p: Point) => `${p.x},${p.y}`;
    const heuristic = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    gScore.set(key(startGrid), 0);
    fScore.set(key(startGrid), heuristic(startGrid, endGrid));

    while (openSet.length > 0) {
      // 找到 f 值最小的节点
      let current = openSet.reduce((min, node) =>
        (fScore.get(key(node)) || Infinity) < (fScore.get(key(min)) || Infinity) ? node : min
      );

      if (current.x === endGrid.x && current.y === endGrid.y) {
        // 重构路径
        const path = [end];
        let temp = current;
        while (cameFrom.has(key(temp))) {
          temp = cameFrom.get(key(temp))!;
          path.unshift({
            x: temp.x * this.gridSize + this.gridSize / 2,
            y: temp.y * this.gridSize + this.gridSize / 2
          });
        }
        path.unshift(start);
        return path;
      }

      openSet.splice(openSet.indexOf(current), 1);
      closedSet.add(key(current));

      // 检查邻居（只考虑正交方向）
      const neighbors = DIRECTIONS.map(dir => ({
        x: current.x + dir.x,
        y: current.y + dir.y
      }));

      for (const neighbor of neighbors) {
        // 检查边界
        if (neighbor.x < 0 || neighbor.x >= this.width ||
            neighbor.y < 0 || neighbor.y >= this.height) {
          continue;
        }

        // 检查是否被阻挡（避障逻辑）
        if (this.grid[neighbor.y]?.[neighbor.x]?.blocked) {
          continue;
        }

        // 检查是否已经在关闭集合中
        if (closedSet.has(key(neighbor))) {
          continue;
        }

        const tentativeG = (gScore.get(key(current)) || 0) + 1;

        if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        } else if (tentativeG >= (gScore.get(key(neighbor)) || Infinity)) {
          continue;
        }

        cameFrom.set(key(neighbor), current);
        gScore.set(key(neighbor), tentativeG);
        fScore.set(key(neighbor), tentativeG + heuristic(neighbor, endGrid));
      }
    }

    // 如果找不到路径，返回直线
    return [start, end];
  }

  /**
   * 在网格中查找与给定点相邻的非阻塞点
   * @param gridPoint 网格点
   * @returns 找到的非阻塞点，若未找到则返回null
   */
  private findNearbyNonBlockedPoint(gridPoint: { x: number, y: number }): Point | null {
    for (const dir of DIRECTIONS) {
      const neighborX = gridPoint.x + dir.x;
      const neighborY = gridPoint.y + dir.y;

      if (neighborX >= 0 && neighborX < this.width &&
          neighborY >= 0 && neighborY < this.height &&
          !this.grid[neighborY]?.[neighborX]?.blocked) {
        // 找到一个相邻的非阻��点
        return { x: neighborX, y: neighborY };
      }
    }

    return null;
  }
}

/**
 * 生成用于调试的路径点
 * @param path 原始路径点
 * @param gridSize 网格大小
 * @returns 调试用的路径点
 */
export function generateDebugPoints(path: Point[], gridSize: number): Point[] {
  if (!path || path.length <= 2) return path;

  // 生成网格中心点（用于可视化路径的寻路过程）
  const debugPoints: Point[] = [];

  // 保留原始起点
  debugPoints.push(path[0]!);

  // 对中间点网格化，确保包含算法实际计算的路径点
  for (let i = 1; i < path.length - 1; i++) {
    const gridX = Math.floor(path[i]!.x / gridSize);
    const gridY = Math.floor(path[i]!.y / gridSize);

    // 添加网格中心点，这才是 A* 算法实际计算的点
    debugPoints.push({
      x: gridX * gridSize + gridSize / 2,
      y: gridY * gridSize + gridSize / 2
    });
  }

  // 保留原始终点
  debugPoints.push(path[path.length - 1]!);

  return debugPoints;
}
