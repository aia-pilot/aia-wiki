<template>
  <svg
    ref="svgRef"
    class="orthogonal-link-layer"
    :style="svgStyles"
    @click="handleSvgClick"
  >
    <path
      v-for="link in computedLinks"
      :key="link.id"
      :d="link.path"
      :stroke="link.style.color"
      :stroke-width="link.style.strokeWidth"
      :stroke-dasharray="link.style.dashed ? '5,5' : 'none'"
      :marker-end="link.style.arrow === 'end' || link.style.arrow === 'both' ? `url(#arrowhead-${link.id}-end)` : ''"
      :marker-start="link.style.arrow === 'both' ? `url(#arrowhead-${link.id}-start)` : ''"
      fill="none"
      :data-link-id="link.id"
      class="link-path"
      @click.stop="handleLinkClick(link.spec)"
      @dblclick.stop="handleLinkDblClick(link.spec)"
      @mouseenter="handleLinkHover(link.spec)"
    />

    <!-- 连线起点和终点坐标标签 -->
    <g v-for="link in computedLinks" :key="`coords-${link.id}`" class="coord-labels">
      <!-- 起点坐标标签 -->
      <text
        :x="getLinkEndpoint(link, 'start').x + 5"
        :y="getLinkEndpoint(link, 'start').y - 5"
        class="coord-label"
        :fill="link.style.color"
        font-size="10">
        [{{ Math.round(getLinkEndpoint(link, 'start').x) }},{{ Math.round(getLinkEndpoint(link, 'start').y) }}]
      </text>

      <!-- 终点坐标标签 -->
      <text
        :x="getLinkEndpoint(link, 'end').x + 5"
        :y="getLinkEndpoint(link, 'end').y - 5"
        class="coord-label"
        :fill="link.style.color"
        font-size="10">
        [{{ Math.round(getLinkEndpoint(link, 'end').x) }},{{ Math.round(getLinkEndpoint(link, 'end').y) }}]
      </text>
    </g>

    <!-- 箭头标记定义 -->
    <defs>
      <!-- 终点箭头 -->
      <marker
        v-for="link in computedLinks"
        v-if="computedLinks.length > 0"
        :key="`arrowhead-${link.id}-end`"
        :id="`arrowhead-${link.id}-end`"
        :markerWidth="link?.style?.dashed ? '8' : '10'"
        :markerHeight="link?.style?.dashed ? '8' : '10'"
        :refX="link?.style?.dashed ? '8' : '10'"
        refY="5"
        :orient="getArrowOrient(link, 'end')"
        markerUnits="userSpaceOnUse"
      >
        <polygon
          :points="link?.style?.dashed ? '0 0, 8 5, 0 10' : '0 0, 10 5, 0 10'"
          :fill="link?.style?.color || defaultLinkStyle.color"
        />
      </marker>

      <!-- 起点箭头 -->
      <marker
        v-for="link in computedLinks.filter((l) => l.style.arrow === 'both')"
        :key="`arrowhead-${link.id}-start`"
        :id="`arrowhead-${link.id}-start`"
        :markerWidth="link?.style?.dashed ? '8' : '10'"
        :markerHeight="link?.style?.dashed ? '8' : '10'"
        refX="0"
        refY="5"
        :orient="getArrowOrient(link, 'start')"
        markerUnits="userSpaceOnUse"
      >
        <polygon
          :points="link?.style?.dashed ? '8 0, 0 5, 8 10' : '10 0, 0 5, 10 10'"
          :fill="link?.style?.color || defaultLinkStyle.color"
        />
      </marker>
    </defs>
  </svg>
</template>

<script setup lang="ts">
import {ref, computed, watch, onMounted, onUnmounted, nextTick} from 'vue'
import type {Ref} from 'vue'

import Debug from 'debug'

const debug = Debug('aia:orthogonal-link-layer')

// 类型定义
interface LinkSpec {
  id: string
  from: HTMLElement
  to: HTMLElement
  label?: string
  type?: 'solid' | 'dashed' | 'conditional'
}

interface LinkStyle {
  color?: string
  dashed?: boolean
  arrow?: 'none' | 'end' | 'both'
  strokeWidth?: number
  zIndex?: number
}

interface Point {
  x: number
  y: number
}

interface GridCell {
  x: number
  y: number
  blocked: boolean
}

interface ComputedLink {
  id: string
  path: string
  style: Required<LinkStyle>
  spec: LinkSpec
}

// Props
interface Props {
  obstacles: HTMLElement[]
  links: LinkSpec[]
  container: HTMLElement | undefined
  padding?: number
  gridSize?: number
  styles?: Record<string, LinkStyle>
  debug?: boolean // 新增调试模式标志
}

const props = withDefaults(defineProps<Props>(), {
  padding: 6,
  gridSize: 10,
  styles: () => ({}),
  debug: false
})

// Emits
const emit = defineEmits<{
  'link:click': [link: LinkSpec]
  'link:hover': [link: LinkSpec]
  'link:dblclick': [link: LinkSpec]
  'debug:path': [points: Point[]] // 新增调试路径点事件
}>()

// Refs
const svgRef = ref<SVGElement>()
const resizeObserver = ref<ResizeObserver>()

// 默认样式
const defaultLinkStyle: Required<LinkStyle> = {
  color: '#666',
  dashed: false,
  arrow: 'end',
  strokeWidth: 2,
  zIndex: 1
}

// SVG 样式
const svgStyles = computed(() => {
  const containerRect = props.container?.getBoundingClientRect() || null;
  if (!containerRect) return undefined

  const svgSyles = {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${containerRect.width}px`,
    height: `${containerRect.height}px`,
    pointerEvents: 'none',
    zIndex: 1000
  } as const

  debug('svgStyles', svgSyles)
  return svgSyles
})

// A* 算法实现
class AStarPathfinder {
  private grid: GridCell[][]
  private width: number
  private height: number
  private gridSize: number

  constructor(width: number, height: number, gridSize: number) {
    this.width = Math.ceil(width / gridSize)
    this.height = Math.ceil(height / gridSize)
    this.gridSize = gridSize
    this.grid = this.createGrid()
  }

  private createGrid(): GridCell[][] {
    const grid: GridCell[][] = []
    for (let y = 0; y < this.height; y++) {
      grid[y] = []
      for (let x = 0; x < this.width; x++) {
        grid[y]![x] = {x, y, blocked: false}
      }
    }
    return grid
  }

  setObstacles(obstacles: HTMLElement[], containerRect: DOMRect, padding: number) {
    // 重置网格
    this.grid.forEach(row => {
      row.forEach(cell => {
        cell.blocked = false
      })
    })

    // 设置障碍物
    obstacles.forEach(obstacle => {
      const rect = obstacle.getBoundingClientRect()
      const left = rect.left - containerRect.left - padding
      const top = rect.top - containerRect.top - padding
      const right = rect.right - containerRect.left + padding
      const bottom = rect.bottom - containerRect.top + padding

      const startX = Math.max(0, Math.floor(left / this.gridSize))
      const startY = Math.max(0, Math.floor(top / this.gridSize))
      const endX = Math.min(this.width - 1, Math.ceil(right / this.gridSize))
      const endY = Math.min(this.height - 1, Math.ceil(bottom / this.gridSize))

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          if (y >= 0 && y < this.height && x >= 0 && x < this.width && this.grid[y]) {
            this.grid[y]![x]!.blocked = true
          }
        }
      }
    })
  }

  findPath(start: Point, end: Point): Point[] {
    const startGrid = {
      x: Math.floor(start.x / this.gridSize),
      y: Math.floor(start.y / this.gridSize)
    }
    const endGrid = {
      x: Math.floor(end.x / this.gridSize),
      y: Math.floor(end.y / this.gridSize)
    }

    // 确保起点和终点���在障碍物内
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
      // 如果终�����在障碍物内，尝试找到附近非障碍的点
      const nearbyPoints = this.findNearbyNonBlockedPoint(endGrid);
      if (nearbyPoints) {
        endGrid.x = nearbyPoints.x;
        endGrid.y = nearbyPoints.y;
      }
    }

    // 简化的A*算法 - 使用曼哈顿距离启发式
    const openSet = [startGrid]
    const closedSet = new Set<string>()
    const gScore = new Map<string, number>()
    const fScore = new Map<string, number>()
    const cameFrom = new Map<string, Point>()

    const key = (p: Point) => `${p.x},${p.y}`
    const heuristic = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

    gScore.set(key(startGrid), 0)
    fScore.set(key(startGrid), heuristic(startGrid, endGrid))

    while (openSet.length > 0) {
      // ��到 f 值最小的节点
      let current = openSet.reduce((min, node) =>
        (fScore.get(key(node)) || Infinity) < (fScore.get(key(min)) || Infinity) ? node : min
      )

      if (current.x === endGrid.x && current.y === endGrid.y) {
        // 重构路径
        const path = [end]
        let temp = current
        while (cameFrom.has(key(temp))) {
          temp = cameFrom.get(key(temp))!
          path.unshift({
            x: temp.x * this.gridSize + this.gridSize / 2,
            y: temp.y * this.gridSize + this.gridSize / 2
          })
        }
        path.unshift(start)
        return path
      }

      openSet.splice(openSet.indexOf(current), 1)
      closedSet.add(key(current))

      // 检查邻居（只考虑正交方向��
      const neighbors = [
        {x: current.x - 1, y: current.y},
        {x: current.x + 1, y: current.y},
        {x: current.x, y: current.y - 1},
        {x: current.x, y: current.y + 1}
      ]

      for (const neighbor of neighbors) {
        // 检查边界
        if (neighbor.x < 0 || neighbor.x >= this.width ||
          neighbor.y < 0 || neighbor.y >= this.height) {
          continue
        }

        // 检查是否被阻挡（避障逻辑）
        if (this.grid[neighbor.y]?.[neighbor.x]?.blocked) {
          continue
        }

        // 检查是否已经在关闭集合中
        if (closedSet.has(key(neighbor))) {
          continue
        }

        const tentativeG = (gScore.get(key(current)) || 0) + 1

        if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor)
        } else if (tentativeG >= (gScore.get(key(neighbor)) || Infinity)) {
          continue
        }

        cameFrom.set(key(neighbor), current)
        gScore.set(key(neighbor), tentativeG)
        fScore.set(key(neighbor), tentativeG + heuristic(neighbor, endGrid))
      }
    }

    // 如果找不到路径，返回直线
    return [start, end]
  }

  private findNearbyNonBlockedPoint(gridPoint: { x: number, y: number }): Point | null {
    // 在网格中查找与给定点相邻的非阻塞点
    const directions = [
      {x: -1, y: 0}, // 左
      {x: 1, y: 0},  // 右
      {x: 0, y: -1}, // 上
      {x: 0, y: 1}   // 下
    ]

    for (const dir of directions) {
      const neighborX = gridPoint.x + dir.x
      const neighborY = gridPoint.y + dir.y

      if (neighborX >= 0 && neighborX < this.width &&
        neighborY >= 0 && neighborY < this.height &&
        !this.grid[neighborY]?.[neighborX]?.blocked) {
        // 找到一个相邻的非阻塞点
        return {x: neighborX, y: neighborY}
      }
    }

    return null
  }
}

// 添加调试路径生成函数，用于可视化算法运行
function generateDebugPoints(path: Point[], gridSize: number): Point[] {
  if (!path || path.length <= 2) return path;

  // 生成网格中心点（用于可视化路径的寻路过程）
  const debugPoints: Point[] = [];

  // 保留原始起点和终点
  debugPoints.push(path[0]);

  // 对中间点进行网格化，确保包含算法���际计算的路径点
  for (let i = 1; i < path.length - 1; i++) {
    const gridX = Math.floor(path[i].x / gridSize);
    const gridY = Math.floor(path[i].y / gridSize);

    // 添加网格中心点，这才是 A* 算法实际计算的点
    debugPoints.push({
      x: gridX * gridSize + gridSize / 2,
      y: gridY * gridSize + gridSize / 2
    });
  }

  // 保留原始终点
  debugPoints.push(path[path.length - 1]);

  return debugPoints;
}

// 路径计算
const pathfinder = computed(() => {
  const containerRect = props.container?.getBoundingClientRect() || null;
  if (!containerRect) return null

  const finder = new AStarPathfinder(
    containerRect.width,
    containerRect.height,
    props.gridSize
  )

  // 收集所有连线的起点和终点节点，这些不应该被当作障碍物
  const connectionElements: HTMLElement[] = [];
  props.links.forEach(link => {
    connectionElements.push(link.from);
    connectionElements.push(link.to);
  });

  // 设置障碍物时排除连线的端点
  finder.setObstacles(props.obstacles, containerRect, props.padding);
  return finder
})

const computedLinks = computed(() => {
  const containerRectValue = props.container?.getBoundingClientRect() || null;
  if (!containerRectValue) return []

  const results: ComputedLink[] = []

  // 调试模式下收集所有路径点
  const allPathPoints: Point[] = [];
  const finder = new AStarPathfinder(
    containerRectValue.width,
    containerRectValue.height,
    props.gridSize
  );
  for (const link of props.links) {
    const style = {...defaultLinkStyle, ...props.styles[link.id]}

    try {
      const fromRect = link.from.getBoundingClientRect()
      const toRect = link.to.getBoundingClientRect()

      // 计算原始起点和终点
      const rawStartPoint = {
        x: fromRect.left - containerRectValue.left + (fromRect.width / 2),
        y: fromRect.top - containerRectValue.top + (fromRect.height / 2)
      }

      const rawEndPoint = {
        x: toRect.left - containerRectValue.left + (toRect.width / 2),
        y: toRect.top - containerRectValue.top + (toRect.height / 2)
      }

      // 将起点和终点规范化到网格中心点
      const startPoint = {
        x: Math.floor(rawStartPoint.x / props.gridSize) * props.gridSize + props.gridSize / 2,
        y: Math.floor(rawStartPoint.y / props.gridSize) * props.gridSize + props.gridSize / 2
      }

      const endPoint = {
        x: Math.floor(rawEndPoint.x / props.gridSize) * props.gridSize + props.gridSize / 2,
        y: Math.floor(rawEndPoint.y / props.gridSize) * props.gridSize + props.gridSize / 2
      }

      // 创建不包含当前连线起止点的障碍物列表
      const filteredObstacles = props.obstacles.filter(obstacle =>
        obstacle !== link.from && obstacle !== link.to
      );

      // 设置障碍物，排除起止点元素
      finder.setObstacles(filteredObstacles, containerRectValue, props.padding);

      // 使用规范化的点进行寻路
      const gridPath = finder.findPath(startPoint, endPoint)
      if (gridPath.length === 0) continue

      // 构建最终路径：使用规范化的起点和终点
      let finalPath = [];

      // 如果路径只有两个点，则直接使用规范化的起点和终点
      if (gridPath.length <= 2) {
        finalPath = [startPoint, endPoint];
      } else {
        // 使用规范化的起点和终点，以及中间的网格路径点
        finalPath = gridPath;
      }

      const pathString = `M ${finalPath[0]!.x} ${finalPath[0]!.y} ` +
        finalPath.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')

      results.push({
        id: link.id,
        path: pathString,
        style,
        spec: link
      })

      // 收集所有路径点用于调试
      if (props.debug) {
        // 获取更多详细的调试路径点
        const debugPoints = generateDebugPoints(finalPath, props.gridSize);
        allPathPoints.push(...debugPoints);
      }
    } catch (error) {
      console.warn('Failed to compute path for link:', link.id, error)
    }
  }

  // 调试模式下发送所有路径点
  if (props.debug && allPathPoints.length > 0) {
    nextTick(() => {
      emit('debug:path', allPathPoints)
    })
  }

  return results
})

// 获取箭头方向
const getArrowOrient = (link: ComputedLink, position: 'start' | 'end'): string => {
  // 解析路径中的点序列
  const dStr = link.path;
  const points: Point[] = [];

  // 提取所���点的坐标
  const matches = dStr.match(/[ML]\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g);
  if (!matches) return 'auto'; // 默认方向

  matches.forEach(match => {
    const [_, x, y] = match.match(/[ML]\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/) || [];
    if (x && y) {
      points.push({x: parseFloat(x), y: parseFloat(y)});
    }
  });

  if (points.length < 2) return 'auto';

  // 确定方向点
  let p1: Point, p2: Point;

  if (position === 'end') {
    // 对于终点箭头，取最后两个点
    p1 = points[points.length - 2];
    p2 = points[points.length - 1];
  } else {
    // 对于起点箭头，取前两个点
    p1 = points[0];
    p2 = points[1];
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

// 获取连线端点坐标
const getLinkEndpoint = (link: ComputedLink, position: 'start' | 'end'): Point => {
  // 从路径字符串中提取坐标点
  const pathPoints = extractPathPoints(link.path);

  // 根据位置返回对应的端点
  if (position === 'start') {
    return pathPoints[0] || { x: 0, y: 0 };
  } else {
    return pathPoints[pathPoints.length - 1] || { x: 0, y: 0 };
  }
}

// 从SVG路径中提取点
const extractPathPoints = (pathString: string): Point[] => {
  const points: Point[] = [];
  const matches = pathString.match(/[ML]\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g);

  if (!matches) return points;

  matches.forEach(match => {
    const [_, x, y] = match.match(/[ML]\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/) || [];
    if (x && y) {
      points.push({ x: parseFloat(x), y: parseFloat(y) });
    }
  });

  return points;
}

// 事件处理
const handleSvgClick = (_event: MouseEvent) => {
  // SVG 点击事件
}

const handleLinkClick = (link: LinkSpec) => {
  emit('link:click', link)
}

const handleLinkDblClick = (link: LinkSpec) => {
  emit('link:dblclick', link)
}

const handleLinkHover = (link: LinkSpec) => {
  emit('link:hover', link)
}

// 生命周期
onMounted(() => {
  // ��听容器大小变化
  if (props.container) {
    resizeObserver.value = new ResizeObserver(() => {
      // 触发重新计算 - 只需要强制更新一下即可
      nextTick()
    })
    resizeObserver.value.observe(props.container)
  }
})

onUnmounted(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
})
</script>

<style scoped>
.orthogonal-link-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1000;
}

.link-path {
  pointer-events: stroke;
  cursor: pointer;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.link-path:hover {
  stroke-width: 3;
}

.coord-label {
  user-select: none;
  pointer-events: none;
}
</style>
