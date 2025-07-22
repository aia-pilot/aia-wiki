import {computed, nextTick} from 'vue';
import type {
  LinkSpec,
  LinkStyle,
  ComputedLink,
  Point,
  RequiredLinkStyle
} from '../types';
import {AStarPathfinder, generateDebugPoints} from '../utils/pathfinder';

/**
 * 提取SVG路径中的点坐标
 * @param pathString SVG路径字符串
 * @returns 路径点数组
 */
export function extractPathPoints(pathString: string): Point[] {
  const points: Point[] = [];
  const matches = pathString.match(/[ML]\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g);

  if (!matches) return points;

  matches.forEach(match => {
    const [_, x, y] = match.match(/[ML]\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/) || [];
    if (x && y) {
      points.push({x: parseFloat(x), y: parseFloat(y)});
    }
  });

  return points;
}

/**
 * 获取连线箭头的方向
 * @param link 计算后的连线
 * @param position 箭头位置（起点或终点）
 * @returns 箭头方向角度
 */
export function getArrowOrient(link: ComputedLink, position: 'start' | 'end'): string {
  const points = extractPathPoints(link.path);

  if (points.length < 2) return 'auto';

  // 确定方向点
  let p1: Point, p2: Point;

  if (position === 'end') {
    // 对于终点箭头，取最后两个点
    p1 = points[points.length - 2]!;
    p2 = points[points.length - 1]!;
  } else {
    // 对于起点箭头，取前两个点
    p1 = points[0]!;
    p2 = points[1]!;
  }

  // 计算方向角度
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // 判断是水平还是垂直方向
  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平方向
    return dx > 0 ? '0' : '180';
  } else {
    // 垂直方向
    return dy > 0 ? '90' : '270';
  }
}

/**
 * 获取连线端点坐标
 * @param link 计算后的连线
 * @param position 端点位置（起点或终点）
 * @returns 端点坐标
 */
export function getLinkEndpoint(link: ComputedLink, position: 'start' | 'end'): Point {
  const pathPoints = extractPathPoints(link.path);

  if (pathPoints.length === 0) {
    return {x: 0, y: 0};
  }

  if (position === 'start') {
    return pathPoints[0]!;
  } else {
    return pathPoints[pathPoints.length - 1]!;
  }
}

/**
 * 平滑路径，添加圆角效果
 * @param pathPoints 原始路径点
 * @param cornerRadius 圆角半径
 * @returns 平滑后的SVG路径字符串
 */
function createSmoothPath(pathPoints: Point[], cornerRadius: number = 10): string {
  if (pathPoints.length < 2) return '';

  // 提前验证数组，确保所有元素都存在
  if (pathPoints.some(point => point === undefined)) {
    return '';
  }

  if (pathPoints.length === 2) {
    // 如果只有两个点，则直接连接
    return `M ${pathPoints[0]!.x} ${pathPoints[0]!.y} L ${pathPoints[1]!.x} ${pathPoints[1]!.y}`;
  }

  let path = `M ${pathPoints[0]!.x} ${pathPoints[0]!.y} `;

  for (let i = 1; i < pathPoints.length - 1; i++) {
    const prev = pathPoints[i - 1]!;
    const curr = pathPoints[i]!;
    const next = pathPoints[i + 1]!;

    // 计算方向向量
    const vec1 = {x: curr.x - prev.x, y: curr.y - prev.y};
    const vec2 = {x: next.x - curr.x, y: next.y - curr.y};

    // 计算单位向量长度
    const len1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
    const len2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);

    // 避免除以零
    if (len1 === 0 || len2 === 0) {
      path += `L ${curr.x} ${curr.y} `;
      continue;
    }

    // 计算单位向量
    const unitVec1 = {x: vec1.x / len1, y: vec1.y / len1};
    const unitVec2 = {x: vec2.x / len2, y: vec2.y / len2};

    // 确保圆角半径不超过线段长度的一半
    const radius = Math.min(cornerRadius, len1 / 2, len2 / 2);

    // 计算圆角的起点和终点
    const cornerStart = {
      x: curr.x - unitVec1.x * radius,
      y: curr.y - unitVec1.y * radius
    };

    const cornerEnd = {
      x: curr.x + unitVec2.x * radius,
      y: curr.y + unitVec2.y * radius
    };

    // 添加到路径
    path += `L ${cornerStart.x} ${cornerStart.y} Q ${curr.x} ${curr.y}, ${cornerEnd.x} ${cornerEnd.y} `;
  }

  // 添加最后一个点
  const last = pathPoints[pathPoints.length - 1]!;
  path += `L ${last.x} ${last.y}`;

  return path;
}

/**
 * 使用链接路径计算 Composable
 * 负责计算所有连线的路径和样式
 */
export function useLinkPathCalculation(
  props: {
    obstacles: HTMLElement[] | DOMRect[],
    links: LinkSpec[],
    container: HTMLElement | undefined,
    padding: number,
    gridSize: number,
    styles: Record<string, LinkStyle>,
    debug: boolean,
    smoothPath?: boolean, // 是否使用平滑路径
    cornerRadius?: number // 圆角半径
  },
  defaultLinkStyle: RequiredLinkStyle,
  emit: (event: 'debug:path', points: Point[]) => void
) {
  // 计算所有连线
  const computedLinks = computed(() => {
    const containerRect = props.container?.getBoundingClientRect() || null;
    if (!containerRect) return [];

    const links: ComputedLink[] = [];
    const allPathPoints: Point[] = [];

    // 创建寻路器实例
    const finder = new AStarPathfinder(
      containerRect.width,
      containerRect.height,
      props.gridSize
    );

    // 先重置网格
    finder.resetGrid();

    // 设置所有障碍物
    finder.setObstacles(props.obstacles, containerRect, props.padding, true);

    for (const link of props.links) {
      const style = {...defaultLinkStyle, ...(link.style || {}), ...props.styles[link.id]};

      try {
        const fromRect = link.from.getBoundingClientRect();
        const toRect = link.to.getBoundingClientRect();

        // 计算原始起点和终点
        const rawStartPoint = {
          x: fromRect.left - containerRect.left + (fromRect.width / 2),
          y: fromRect.top - containerRect.top + (fromRect.height / 2)
        };

        const rawEndPoint = {
          x: toRect.left - containerRect.left + (toRect.width / 2),
          y: toRect.top - containerRect.top + (toRect.height / 2)
        };

        // 将起点和终点规范化到网格中心点
        const startPoint = {
          x: Math.floor(rawStartPoint.x / props.gridSize) * props.gridSize + props.gridSize / 2,
          y: Math.floor(rawStartPoint.y / props.gridSize) * props.gridSize + props.gridSize / 2
        };

        const endPoint = {
          x: Math.floor(rawEndPoint.x / props.gridSize) * props.gridSize + props.gridSize / 2,
          y: Math.floor(rawEndPoint.y / props.gridSize) * props.gridSize + props.gridSize / 2
        };

        // 将当前连线的起点和终点设为非障碍
        finder.setObstacles([link.from, link.to], containerRect, props.padding, false);

        // 使用规范化的点进行寻路
        const gridPath = finder.findPath(startPoint, endPoint);
        if (gridPath.length === 0) continue;

        // 将当前连线的起点和终点恢复为障碍（为了不影响后续连线的计算）
        finder.setObstacles([link.from, link.to], containerRect, props.padding, true);

        // 构建最终路径
        let finalPath = [];

        // 如果路径只有两个点，则直接使用规范化的起点和终点
        if (gridPath.length <= 2) {
          finalPath = [startPoint, endPoint];
        } else {
          // 使用规范化的起点和终点，以及中间的网格路径点
          finalPath = gridPath;
        }

        // 过滤掉处于fromRect和toRect元素中的点，这样连线始终从元素边缘开始和结束
        // 计算元素在容器内的相对坐标
        const fromRectLocal = {
          left: fromRect.left - containerRect.left,
          right: fromRect.right - containerRect.left,
          top: fromRect.top - containerRect.top,
          bottom: fromRect.bottom - containerRect.top
        };
        const toRectLocal = {
          left: toRect.left - containerRect.left,
          right: toRect.right - containerRect.left,
          top: toRect.top - containerRect.top,
          bottom: toRect.bottom - containerRect.top
        };

        // 过滤掉位于起点和终点元素内的路径点
        finalPath = finalPath.filter(p => {
          const isInFromRect = p.x >= fromRectLocal.left && p.x <= fromRectLocal.right &&
            p.y >= fromRectLocal.top && p.y <= fromRectLocal.bottom;
          const isInToRect = p.x >= toRectLocal.left && p.x <= toRectLocal.right &&
            p.y >= toRectLocal.top && p.y <= toRectLocal.bottom;
          return !(isInFromRect || isInToRect);
        });


        // 生成路径字符串
        let pathString: string;

        // 根据是否平滑路径使用不同的生成方法
        if (props.smoothPath) {
          // 使用平滑路径算法
          pathString = createSmoothPath(finalPath, props.cornerRadius || 10);
        } else {
          // 使用传统的折线路径
          pathString = `M ${finalPath[0]!.x} ${finalPath[0]!.y} ` +
            finalPath.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        }

        links.push({
          id: link.id,
          path: pathString,
          style,
          spec: link
        });

        // 收集调试路径点
        if (props.debug) {
          const debugPoints = generateDebugPoints(finalPath, props.gridSize);
          allPathPoints.push(...debugPoints);
        }
      } catch (error) {
        console.warn('Failed to compute path for link:', link.id, error);
      }
    }

    // 调试模式下发送路径点
    if (props.debug && allPathPoints.length > 0) {
      nextTick(() => {
        emit('debug:path', allPathPoints);
      });
    }

    return links;
  });

  return {
    computedLinks,
    getArrowOrient,
    getLinkEndpoint
  };
}
