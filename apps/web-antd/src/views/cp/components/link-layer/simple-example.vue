<template>
  <div class="simple-example">
    <h2>OrthogonalLinkLayer 基础示例</h2>

    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showDebugGrid" />
          显示网格 ({{gridSize}}px)
        </label>
        <input type="range" v-model.number="gridSize" min="5" max="30" step="1" />
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showObstacleArea" />
          显示障碍区域
        </label>
        <input type="range" v-model.number="obstaclePadding" min="0" max="20" step="1" />
        <span>障碍物扩展: {{obstaclePadding}}px</span>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showPathfinding" />
          显示寻路过程
        </label>
      </div>
    </div>

    <div class="example-container">
      <!-- 画布容器 -->
      <div
        ref="containerRef"
        class="canvas"
        :style="{
          position: 'relative',
          width: '600px',
          height: '400px',
          border: '1px solid #ddd',
          background: '#fafafa'
        }"
      >
        <!-- 调试网格 -->
        <div v-if="showDebugGrid" class="debug-grid" :style="{ backgroundSize: `${gridSize}px ${gridSize}px` }"></div>

        <!-- 障碍区域可视化 -->
        <div
          v-if="showObstacleArea && containerRef"
          v-for="(bounds, idx) in obstacleBounds"
          :key="`obstacle-area-${idx}`"
          class="obstacle-area"
          :style="{
            left: `${bounds.left}px`,
            top: `${bounds.top}px`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`
          }"
        ></div>

        <!-- 节点 -->
        <div
          v-for="node in nodes"
          :key="node.id"
          ref="nodeRefs"
          class="node"
          :style="{
            position: 'absolute',
            left: node.x + 'px',
            top: node.y + 'px',
            width: '80px',
            height: '40px',
            background: node.color,
            border: '2px solid #333',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            zIndex: 10
          }"
          draggable="true"
          @dragstart="handleDragStart($event, node)"
          @drag="handleDrag($event, node)"
          @dragend="handleDragEnd($event, node)"
        >
          <div>
            {{ node.label }}<br/>
            <span class="coordinate-label">[{{ Math.round(node.x + 40) }},{{ Math.round(node.y + 20) }}]</span>
          </div>
        </div>

        <!-- 连线层 -->
        <OrthogonalLinkLayer
          v-if="containerRef"
          :obstacles="nodeRefs || []"
          :links="links"
          :container="containerRef"
          :padding="obstaclePadding"
          :grid-size="gridSize"
          :styles="linkStyles"
          :debug="showPathfinding"
          @link:click="handleLinkClick"
          @link:hover="handleLinkHover"
          @link:dblclick="handleLinkDblClick"
          @debug:path="capturePathDebugPoints"
        />

        <!-- 调试路径点 -->
        <div
          v-if="showPathfinding"
          v-for="(point, idx) in pathDebugPoints"
          :key="`path-point-${idx}`"
          class="path-debug-point"
          :style="{
            left: `${point.x - 2}px`,
            top: `${point.y - 2}px`
          }"
          :title="`点 ${idx}: ${point.x}, ${point.y}`"
        ></div>
      </div>
    </div>

    <!-- ���件日志 -->
    <div class="event-log">
      <h3>事件日志</h3>
      <div class="log-items">
        <div
          v-for="(event, index) in eventLog"
          :key="index"
          class="log-item"
          :class="event.type"
        >
          <span class="event-type">{{ event.type }}</span>
          <span class="event-message">{{ event.message }}</span>
          <span class="event-time">{{ event.time }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, watch, onMounted, nextTick} from 'vue'
import OrthogonalLinkLayer from './orthogonal-link-layer.vue'

// 类型定义
interface Node {
  id: string
  label: string
  x: number
  y: number
  color: string
}

interface LinkSpec {
  id: string
  from: HTMLElement
  to: HTMLElement
  label?: string
  type?: 'solid' | 'dashed' | 'conditional'
}

interface LinkStyle {
  color: string
  dashed: boolean
  arrow: 'none' | 'end' | 'both'
  strokeWidth: number
}

interface EventLog {
  type: string
  message: string
  time: string
}

interface ObstacleBound {
  left: number
  top: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

// 响应式数据
const containerRef = ref<HTMLElement>()
const nodeRefs = ref<HTMLElement[]>()
const eventLog = ref<EventLog[]>([])
const links = ref<LinkSpec[]>([])

// 拖拽相关状态
const dragData = ref<{node: Node | null, offsetX: number, offsetY: number}>({
  node: null,
  offsetX: 0,
  offsetY: 0
})

// 调试选项
const showDebugGrid = ref(false)
const showObstacleArea = ref(false)
const showPathfinding = ref(false)
const gridSize = ref(12)
const obstaclePadding = ref(8)
const pathDebugPoints = ref<Point[]>([])

// 节点数据
const nodes = ref<Node[]>([
  {id: 'start', label: '开始', x: 50, y: 50, color: '#28a745'},
  {id: 'process', label: '处理', x: 250, y: 100, color: '#007bff'},
  {id: 'decision', label: '决策', x: 450, y: 80, color: '#ffc107'},
  {id: 'end', label: '结束', x: 350, y: 250, color: '#dc3545'},
  {id: 'obstacle', label: '障碍', x: 200, y: 180, color: '#6c757d'}
])

// 计算障碍物边界
const obstacleBounds = computed<ObstacleBound[]>(() => {
  if (!containerRef.value || !nodeRefs.value) return []

  const containerRect = containerRef.value.getBoundingClientRect()
  const bounds: ObstacleBound[] = []

  nodeRefs.value.forEach(node => {
    const rect = node.getBoundingClientRect()
    bounds.push({
      left: rect.left - containerRect.left - obstaclePadding.value,
      top: rect.top - containerRect.top - obstaclePadding.value,
      width: rect.width + (obstaclePadding.value * 2),
      height: rect.height + (obstaclePadding.value * 2)
    })
  })

  return bounds
})

// 连线样式
const linkStyles: Record<string, LinkStyle> = {
  'start-to-process': {
    color: '#28a745',
    dashed: false,
    arrow: 'end',
    strokeWidth: 2
  },
  'process-to-decision': {
    color: '#007bff',
    dashed: false,
    arrow: 'end',
    strokeWidth: 2
  },
  'decision-to-end': {
    color: '#ffc107',
    dashed: true,
    arrow: 'end',
    strokeWidth: 3
  },
  'start-to-end': {
    color: '#dc3545',
    dashed: false,
    arrow: 'both',
    strokeWidth: 2
  }
}

// 方法
const addEvent = (type: string, message: string) => {
  eventLog.value.unshift({
    type,
    message,
    time: new Date().toLocaleTimeString()
  })

  // 限制日志条数
  if (eventLog.value.length > 20) {
    eventLog.value.pop()
  }
}

const handleLinkClick = (link: LinkSpec) => {
  addEvent('click', `点击了连线: ${link.id}`)
}

const handleLinkHover = (link: LinkSpec) => {
  addEvent('hover', `悬停连线: ${link.id}`)
}

const handleLinkDblClick = (link: LinkSpec) => {
  addEvent('dblclick', `双击连线: ${link.id}`)
}

// 节点拖拽
const handleDragStart = (event: DragEvent, node: Node) => {
  if (!event.dataTransfer || !containerRef.value) return

  // 标记为可移动
  event.dataTransfer.effectAllowed = 'move'

  // 存储节点和偏移量
  const container = containerRef.value.getBoundingClientRect()
  const offsetX = event.clientX - container.left - node.x
  const offsetY = event.clientY - container.top - node.y
  dragData.value = { node, offsetX, offsetY }

  addEvent('info', `开始拖动: ${node.label}`)
}

const handleDrag = (event: DragEvent, node: Node) => {
  if (!event.clientX || !event.clientY) return // 忽略无效位置
  if (!containerRef.value || dragData.value.node?.id !== node.id) return

  const container = containerRef.value.getBoundingClientRect()

  // 计算新位置（考虑容器边界和偏移量）
  const newX = Math.max(0, Math.min(
    container.width - 80, // 考虑节点宽度
    event.clientX - container.left - dragData.value.offsetX
  ))

  const newY = Math.max(0, Math.min(
    container.height - 40, // 考虑节点高度
    event.clientY - container.top - dragData.value.offsetY
  ))

  // 更新节点位置
  node.x = Math.round(newX)
  node.y = Math.round(newY)
}

const handleDragEnd = (event: DragEvent, node: Node) => {
  dragData.value = { node: null, offsetX: 0, offsetY: 0 }

  // 重新初始化连线（确保位置更新）
  initializeLinks()

  addEvent('info', `结束拖动: ${node.label} 到位置 (${node.x}, ${node.y})`)
}

// 路径调试
const capturePathDebugPoints = (points: Point[]) => {
  if (points.length === 0) {
    // 如果收到空数组，则清空现有点
    pathDebugPoints.value = []
    return
  }

  // 将新的路径点添加到现有点集合中
  // 使用 Map 确保点的唯一性 (基于坐标)
  const pointsMap = new Map<string, Point>();

  // 添加现有点
  pathDebugPoints.value.forEach(point => {
    pointsMap.set(`${point.x},${point.y}`, point);
  });

  // 添加新点
  points.forEach(point => {
    pointsMap.set(`${point.x},${point.y}`, point);
  });

  // 转换回数组
  pathDebugPoints.value = Array.from(pointsMap.values());

  // 记录事件
  if (points.length > 0) {
    addEvent('info', `接收到 ${points.length} 个路径点`);
  }
}

// 初始化连线
const initializeLinks = () => {
  nextTick(() => {
    if (nodeRefs.value && nodeRefs.value.length >= 5) {
      // 过滤掉障碍物节点
      const activeNodes = nodeRefs.value.filter(node =>
        !node.textContent?.includes('障碍')
      )

      if (activeNodes.length >= 4) {
        links.value = [
          {id: 'start-to-process', from: activeNodes[0]!, to: activeNodes[1]!},
          {id: 'process-to-decision', from: activeNodes[1]!, to: activeNodes[2]!},
          {id: 'decision-to-end', from: activeNodes[2]!, to: activeNodes[3]!},
          {id: 'start-to-end', from: activeNodes[0]!, to: activeNodes[3]!}
        ]
      }
    }
  })
}

// 监听参数变化
watch([gridSize, obstaclePadding], () => {
  // ��新计算连线
  nextTick(initializeLinks)
})

// 生命周期
onMounted(() => {
  initializeLinks()
  addEvent('info', '示例已初始化')
})
</script>

<style scoped>
.simple-example {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.example-container {
  margin: 20px 0;
}

.canvas {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.node {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
  user-select: none;
}

.node:hover {
  transform: scale(1.05);
}

.event-log {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.event-log h3 {
  margin: 0 0 15px 0;
  color: #495057;
}

.log-items {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: white;
  border-radius: 4px;
  border-left: 4px solid #dee2e6;
  font-size: 14px;
}

.log-item.click {
  border-left-color: #007bff;
}

.log-item.hover {
  border-left-color: #28a745;
}

.log-item.dblclick {
  border-left-color: #ffc107;
}

.log-item.info {
  border-left-color: #17a2b8;
}

.event-type {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
  color: #6c757d;
  min-width: 80px;
}

.event-message {
  flex: 1;
  margin: 0 10px;
  color: #495057;
}

.event-time {
  font-size: 12px;
  color: #6c757d;
  min-width: 80px;
  text-align: right;
}

/* 控制面板样式 */
.control-panel {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.control-group label {
  margin-right: 10px;
  color: #495057;
}

.control-group input[type="range"] {
  flex: 1;
  margin-left: 10px;
}

.control-group span {
  margin-left: 10px;
  color: #495057;
}

/* 调试网格 */
.debug-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
  z-index: 5;
}

/* 障碍区域 */
.obstacle-area {
  position: absolute;
  pointer-events: none;
  background: rgba(108, 117, 125, 0.3);
  border: 1px dashed rgba(108, 117, 125, 0.6);
  border-radius: 4px;
  z-index: 6;
}

/* 路径调试点 */
.path-debug-point {
  position: absolute;
  width: 4px;
  height: 4px;
  background-color: #dc3545;
  border-radius: 50%;
  pointer-events: none;
}

.coordinate-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}
</style>
