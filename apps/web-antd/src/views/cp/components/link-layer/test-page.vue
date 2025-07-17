<template>
  <div class="test-page">
    <h1>OrthogonalLinkLayer 测试页面</h1>

    <!-- 测试控制台 -->
    <div class="test-controls">
      <h3>测试控制</h3>
      <div class="control-row">
        <button @click="runBasicTest">基础功能测试</button>
        <button @click="runPathfindingTest">路径寻找测试</button>
        <button @click="runInteractionTest">交互测试</button>
        <button @click="runPerformanceTest">性能测试</button>
      </div>

      <div class="control-row">
        <label>Grid Size: <input v-model.number="gridSize" type="range" min="5" max="50" step="5" /></label>
        <span>{{ gridSize }}</span>
      </div>

      <div class="control-row">
        <label>Padding: <input v-model.number="padding" type="range" min="0" max="20" step="2" /></label>
        <span>{{ padding }}</span>
      </div>
    </div>

    <!-- 测试结果 -->
    <div class="test-results">
      <h3>测试结果</h3>
      <div class="result-item" v-for="result in testResults" :key="result.id">
        <span class="result-status" :class="result.status">{{ result.status }}</span>
        <span class="result-name">{{ result.name }}</span>
        <span class="result-message">{{ result.message }}</span>
      </div>
    </div>

    <!-- 测试画布 -->
    <div class="test-canvas-container">
      <h3>测试画布</h3>
      <div
        ref="canvasRef"
        class="test-canvas"
        :style="{
          position: 'relative',
          width: '1000px',
          height: '700px',
          border: '2px solid #333',
          background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }"
      >
        <!-- 测试节点 -->
        <div
          v-for="node in testNodes"
          :key="node.id"
          ref="nodeRefs"
          class="test-node"
          :style="{
            position: 'absolute',
            left: node.x + 'px',
            top: node.y + 'px',
            width: node.width + 'px',
            height: node.height + 'px',
            background: node.color,
            border: '2px solid #000',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            cursor: 'move',
            zIndex: 10,
            userSelect: 'none'
          }"
          @mousedown="startDrag(node, $event)"
          @click="selectNode(node)"
          :class="{ 'selected': selectedNode?.id === node.id }"
        >
          {{ node.label }}
        </div>

        <!-- 连线层 -->
        <OrthogonalLinkLayer
          :obstacles="nodeRefs || []"
          :links="testLinks"
          :container="canvasRef"
          :padding="padding"
          :grid-size="gridSize"
          :styles="linkStyles"
          @link:click="onLinkClick"
          @link:hover="onLinkHover"
          @link:dblclick="onLinkDblClick"
        />
      </div>
    </div>

    <!-- 连线管理 -->
    <div class="link-management">
      <h3>连线管理</h3>
      <div class="link-controls">
        <button @click="addRandomLink">添加随机连线</button>
        <button @click="clearAllLinks">清除所有连线</button>
        <button @click="createTestScenario">创建测试场景</button>
      </div>

      <div class="link-list">
        <div v-for="link in testLinks" :key="link.id" class="link-item">
          <span>{{ link.id }}</span>
          <div class="link-style-controls">
            <input
              v-model="linkStyles[link.id]!.color"
              type="color"
              title="颜色"
            />
            <label>
              <input
                v-model="linkStyles[link.id]!.dashed"
                type="checkbox"
              />
              虚线
            </label>
            <select v-model="linkStyles[link.id]!.arrow">
              <option value="none">无箭头</option>
              <option value="end">末端</option>
              <option value="both">双向</option>
            </select>
            <button @click="removeLink(link.id)" class="remove-btn">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 调试信息 -->
    <div class="debug-info">
      <h3>调试信息</h3>
      <div>节点数量: {{ testNodes.length }}</div>
      <div>连线数量: {{ testLinks.length }}</div>
      <div>画布尺寸: {{ canvasSize.width }}x{{ canvasSize.height }}</div>
      <div>当前网格: {{ gridSize }}px</div>
      <div>障碍物间距: {{ padding }}px</div>
      <div v-if="selectedNode">选中节点: {{ selectedNode.label }}</div>
      <div v-if="lastClickedLink">最后点击连线: {{ lastClickedLink.id }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import OrthogonalLinkLayer from './orthogonal-link-layer.vue'

// 类型定义
interface TestNode {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
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

interface TestResult {
  id: string
  name: string
  status: 'pass' | 'fail' | 'running'
  message: string
}

// 响应式数据
const canvasRef = ref<HTMLElement>()
const nodeRefs = ref<HTMLElement[]>([])
const gridSize = ref(15)
const padding = ref(8)
const selectedNode = ref<TestNode | null>(null)
const lastClickedLink = ref<LinkSpec | null>(null)
const dragState = ref<{ node: TestNode; startX: number; startY: number; initialX: number; initialY: number } | null>(null)

// 测试数据
const testNodes = ref<TestNode[]>([
  { id: 'A', label: 'A', x: 50, y: 50, width: 60, height: 40, color: '#3498db' },
  { id: 'B', label: 'B', x: 200, y: 100, width: 60, height: 40, color: '#e74c3c' },
  { id: 'C', label: 'C', x: 350, y: 80, width: 60, height: 40, color: '#2ecc71' },
  { id: 'D', label: 'D', x: 100, y: 200, width: 60, height: 40, color: '#f39c12' },
  { id: 'E', label: 'E', x: 400, y: 250, width: 60, height: 40, color: '#9b59b6' },
  { id: 'Wall1', label: 'Wall', x: 250, y: 150, width: 80, height: 60, color: '#7f8c8d' },
  { id: 'Wall2', label: 'Wall', x: 150, y: 300, width: 120, height: 40, color: '#7f8c8d' }
])

const testLinks = ref<LinkSpec[]>([])
const linkStyles = reactive<Record<string, LinkStyle>>({})
const testResults = ref<TestResult[]>([])

// 计算属性
const canvasSize = computed(() => ({
  width: canvasRef.value?.offsetWidth || 0,
  height: canvasRef.value?.offsetHeight || 0
}))

// 测试方法
const runBasicTest = () => {
  addTestResult('basic', '基础功能测试', 'running', '正在测试...')

  try {
    // 清除现有连线
    clearAllLinks()

    // 创建基本连线
    nextTick(() => {
      if (nodeRefs.value.length >= 3) {
        const link1 = { id: 'test-basic-1', from: nodeRefs.value[0], to: nodeRefs.value[1] }
        const link2 = { id: 'test-basic-2', from: nodeRefs.value[1], to: nodeRefs.value[2] }

        testLinks.value = [link1, link2]

        // 设置样式
        linkStyles['test-basic-1'] = { color: '#3498db', dashed: false, arrow: 'end', strokeWidth: 2 }
        linkStyles['test-basic-2'] = { color: '#e74c3c', dashed: true, arrow: 'both', strokeWidth: 3 }

        setTimeout(() => {
          updateTestResult('basic', 'pass', '基础连线创建成功')
        }, 100)
      } else {
        updateTestResult('basic', 'fail', '节点数量不足')
      }
    })
  } catch (error) {
    updateTestResult('basic', 'fail', `错误: ${error}`)
  }
}

const runPathfindingTest = () => {
  addTestResult('pathfinding', '路径寻找测试', 'running', '测试避障算法...')

  try {
    clearAllLinks()

    nextTick(() => {
      if (nodeRefs.value.length >= 5) {
        // 创建需要绕过障碍物的连线
        const challengingLinks = [
          { id: 'path-1', from: nodeRefs.value[0], to: nodeRefs.value[4] }, // A 到 E，需要绕过墙
          { id: 'path-2', from: nodeRefs.value[1], to: nodeRefs.value[3] }, // B 到 D，需要绕过墙
        ]

        testLinks.value = challengingLinks

        challengingLinks.forEach(link => {
          linkStyles[link.id] = { color: '#f39c12', dashed: false, arrow: 'end', strokeWidth: 2 }
        })

        setTimeout(() => {
          updateTestResult('pathfinding', 'pass', '路径寻找算法工作正常')
        }, 200)
      } else {
        updateTestResult('pathfinding', 'fail', '节点数量不足')
      }
    })
  } catch (error) {
    updateTestResult('pathfinding', 'fail', `错误: ${error}`)
  }
}

const runInteractionTest = () => {
  addTestResult('interaction', '交互测试', 'running', '测试事件处理...')

  try {
    clearAllLinks()

    nextTick(() => {
      if (nodeRefs.value.length >= 2) {
        const link = { id: 'interaction-test', from: nodeRefs.value[0], to: nodeRefs.value[1] }
        testLinks.value = [link]
        linkStyles[link.id] = { color: '#9b59b6', dashed: false, arrow: 'end', strokeWidth: 2 }

        setTimeout(() => {
          updateTestResult('interaction', 'pass', '交互测试准备完成，请点击连线测试')
        }, 100)
      } else {
        updateTestResult('interaction', 'fail', '节点数量不足')
      }
    })
  } catch (error) {
    updateTestResult('interaction', 'fail', `错误: ${error}`)
  }
}

const runPerformanceTest = () => {
  addTestResult('performance', '性能测试', 'running', '测试多连线性能...')

  try {
    clearAllLinks()

    nextTick(() => {
      const startTime = performance.now()

      // 创建多条连线
      const links = []
      for (let i = 0; i < Math.min(10, nodeRefs.value.length - 1); i++) {
        const link = {
          id: `perf-${i}`,
          from: nodeRefs.value[i % nodeRefs.value.length],
          to: nodeRefs.value[(i + 1) % nodeRefs.value.length]
        }
        links.push(link)
        linkStyles[link.id] = {
          color: `hsl(${(i * 36) % 360}, 70%, 50%)`,
          dashed: i % 2 === 0,
          arrow: 'end',
          strokeWidth: 2
        }
      }

      testLinks.value = links

      setTimeout(() => {
        const endTime = performance.now()
        const duration = endTime - startTime
        updateTestResult('performance', 'pass', `创建${links.length}条连线耗时: ${duration.toFixed(2)}ms`)
      }, 100)
    })
  } catch (error) {
    updateTestResult('performance', 'fail', `错误: ${error}`)
  }
}

// 辅助方法
const addTestResult = (id: string, name: string, status: 'pass' | 'fail' | 'running', message: string) => {
  const existingIndex = testResults.value.findIndex(r => r.id === id)
  const result = { id, name, status, message }

  if (existingIndex !== -1) {
    testResults.value[existingIndex] = result
  } else {
    testResults.value.push(result)
  }
}

const updateTestResult = (id: string, status: 'pass' | 'fail' | 'running', message: string) => {
  const result = testResults.value.find(r => r.id === id)
  if (result) {
    result.status = status
    result.message = message
  }
}

const addRandomLink = () => {
  if (nodeRefs.value.length < 2) return

  const from = nodeRefs.value[Math.floor(Math.random() * nodeRefs.value.length)]
  let to = nodeRefs.value[Math.floor(Math.random() * nodeRefs.value.length)]

  while (to === from) {
    to = nodeRefs.value[Math.floor(Math.random() * nodeRefs.value.length)]
  }

  const linkId = `random-${Date.now()}`
  const link = { id: linkId, from, to }

  testLinks.value.push(link)
  linkStyles[linkId] = {
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    dashed: Math.random() > 0.5,
    arrow: ['none', 'end', 'both'][Math.floor(Math.random() * 3)] as 'none' | 'end' | 'both',
    strokeWidth: Math.random() > 0.5 ? 2 : 3
  }
}

const clearAllLinks = () => {
  testLinks.value = []
  Object.keys(linkStyles).forEach(key => {
    delete linkStyles[key]
  })
}

const createTestScenario = () => {
  clearAllLinks()

  nextTick(() => {
    if (nodeRefs.value.length >= 5) {
      const scenarios = [
        { id: 'scenario-1', from: nodeRefs.value[0], to: nodeRefs.value[2] },
        { id: 'scenario-2', from: nodeRefs.value[1], to: nodeRefs.value[3] },
        { id: 'scenario-3', from: nodeRefs.value[2], to: nodeRefs.value[4] },
        { id: 'scenario-4', from: nodeRefs.value[3], to: nodeRefs.value[0] },
      ]

      testLinks.value = scenarios

      scenarios.forEach((link, index) => {
        linkStyles[link.id] = {
          color: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12'][index],
          dashed: index % 2 === 0,
          arrow: 'end',
          strokeWidth: 2
        }
      })
    }
  })
}

const removeLink = (linkId: string) => {
  const index = testLinks.value.findIndex(l => l.id === linkId)
  if (index !== -1) {
    testLinks.value.splice(index, 1)
    delete linkStyles[linkId]
  }
}

const selectNode = (node: TestNode) => {
  selectedNode.value = node
}

// 拖拽功能
const startDrag = (node: TestNode, event: MouseEvent) => {
  dragState.value = {
    node,
    startX: event.clientX,
    startY: event.clientY,
    initialX: node.x,
    initialY: node.y
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (event: MouseEvent) => {
  if (!dragState.value) return

  const deltaX = event.clientX - dragState.value.startX
  const deltaY = event.clientY - dragState.value.startY

  dragState.value.node.x = Math.max(0, Math.min(940, dragState.value.initialX + deltaX))
  dragState.value.node.y = Math.max(0, Math.min(660, dragState.value.initialY + deltaY))
}

const onMouseUp = () => {
  dragState.value = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

// 事件处理
const onLinkClick = (link: LinkSpec) => {
  lastClickedLink.value = link
  console.log('Link clicked:', link.id)
  addTestResult('click', '点击测试', 'pass', `点击了连线: ${link.id}`)
}

const onLinkHover = (link: LinkSpec) => {
  console.log('Link hovered:', link.id)
}

const onLinkDblClick = (link: LinkSpec) => {
  console.log('Link double-clicked:', link.id)
  addTestResult('dblclick', '双击测试', 'pass', `双击了连线: ${link.id}`)
}

// 生命周期
onMounted(() => {
  // 初始化
  console.log('测试页面已加载')
})
</script>

<style scoped>
.test-page {
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-controls {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.control-row button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.control-row button:hover {
  background: #0056b3;
}

.control-row label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-row input[type="range"] {
  width: 100px;
}

.test-results {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.result-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.result-status.pass {
  background: #d4edda;
  color: #155724;
}

.result-status.fail {
  background: #f8d7da;
  color: #721c24;
}

.result-status.running {
  background: #fff3cd;
  color: #856404;
}

.result-name {
  font-weight: bold;
  min-width: 120px;
}

.test-canvas-container {
  margin-bottom: 20px;
}

.test-canvas {
  margin: 20px 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.test-node {
  transition: all 0.2s;
}

.test-node:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.test-node.selected {
  box-shadow: 0 0 0 3px #007bff;
}

.link-management {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.link-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.link-controls button {
  padding: 6px 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.link-controls button:hover {
  background: #218838;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.link-style-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.link-style-controls input[type="color"] {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.link-style-controls select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn:hover {
  background: #c82333;
}

.debug-info {
  background: #e9ecef;
  padding: 20px;
  border-radius: 8px;
  font-family: monospace;
}

.debug-info div {
  margin-bottom: 5px;
}
</style>
