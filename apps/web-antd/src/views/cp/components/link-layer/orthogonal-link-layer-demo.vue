<template>
  <div class="demo-container">
    <h2>OrthogonalLinkLayer 演示</h2>

    <!-- 控制面板 -->
    <div class="controls">
      <div class="control-group">
        <label>Grid Size:</label>
        <input v-model.number="gridSize" type="number" min="5" max="50" />
      </div>
      <div class="control-group">
        <label>Padding:</label>
        <input v-model.number="padding" type="number" min="0" max="20" />
      </div>
      <div class="control-group">
        <button @click="addRandomLink">添加随机连线</button>
        <button @click="clearLinks">清除所有连线</button>
        <button @click="shuffleNodes">重排节点</button>
      </div>
    </div>

    <!-- 画布容器 -->
    <div
      ref="containerRef"
      class="canvas-container"
      :style="{ position: 'relative', width: '800px', height: '600px', border: '1px solid #ccc', background: '#f9f9f9' }"
    >
      <!-- 节点 -->
      <div
        v-for="node in nodes"
        :key="node.id"
        ref="nodeElements"
        class="node"
        :style="{
          position: 'absolute',
          left: node.x + 'px',
          top: node.y + 'px',
          width: node.width + 'px',
          height: node.height + 'px',
          background: node.color,
          border: '2px solid #333',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#fff',
          cursor: 'pointer',
          zIndex: 10
        }"
        @click="selectNode(node)"
      >
        {{ node.label }}
      </div>

      <!-- 连线层 -->
      <OrthogonalLinkLayer
        :obstacles="nodeElements || []"
        :links="links"
        :container="containerRef"
        :padding="padding"
        :grid-size="gridSize"
        :styles="linkStyles"
        @link:click="handleLinkClick"
        @link:hover="handleLinkHover"
        @link:dblclick="handleLinkDblClick"
      />
    </div>

    <!-- 信息面板 -->
    <div class="info-panel">
      <div class="info-section">
        <h3>节点信息</h3>
        <div>总节点数: {{ nodes.length }}</div>
        <div v-if="selectedNode">选中节点: {{ selectedNode.label }}</div>
      </div>

      <div class="info-section">
        <h3>连线信息</h3>
        <div>总连线数: {{ links.length }}</div>
        <div v-if="hoveredLink">悬停连线: {{ hoveredLink.id }}</div>
        <div v-if="clickedLink">点击连线: {{ clickedLink.id }}</div>
      </div>
    </div>

    <!-- 样式配置 -->
    <div class="style-config">
      <h3>连线样式配置</h3>
      <div v-for="link in links" :key="link.id" class="style-item">
        <span>{{ link.id }}:</span>
        <input
          v-model="linkStyles[link.id].color"
          type="color"
          @change="updateLinkStyle(link.id, 'color', $event.target.value)"
        />
        <label>
          <input
            v-model="linkStyles[link.id].dashed"
            type="checkbox"
            @change="updateLinkStyle(link.id, 'dashed', $event.target.checked)"
          />
          虚线
        </label>
        <select
          v-model="linkStyles[link.id].arrow"
          @change="updateLinkStyle(link.id, 'arrow', $event.target.value)"
        >
          <option value="none">无箭头</option>
          <option value="end">末端箭头</option>
          <option value="both">双向箭头</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, reactive } from 'vue'
import OrthogonalLinkLayer from './orthogonal-link-layer.vue'

// 类型定义
interface Node {
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

// 响应式数据
const containerRef = ref<HTMLElement>()
const nodeElements = ref<HTMLElement[]>()
const gridSize = ref(10)
const padding = ref(6)
const selectedNode = ref<Node | null>(null)
const hoveredLink = ref<LinkSpec | null>(null)
const clickedLink = ref<LinkSpec | null>(null)

// 节点数据
const nodes = ref<Node[]>([
  { id: 'node1', label: 'Node 1', x: 50, y: 50, width: 80, height: 40, color: '#3498db' },
  { id: 'node2', label: 'Node 2', x: 300, y: 100, width: 80, height: 40, color: '#e74c3c' },
  { id: 'node3', label: 'Node 3', x: 150, y: 250, width: 80, height: 40, color: '#2ecc71' },
  { id: 'node4', label: 'Node 4', x: 450, y: 200, width: 80, height: 40, color: '#f39c12' },
  { id: 'node5', label: 'Node 5', x: 600, y: 350, width: 80, height: 40, color: '#9b59b6' },
  { id: 'obstacle1', label: 'Obstacle', x: 250, y: 200, width: 100, height: 60, color: '#95a5a6' }
])

// 连线数据
const links = ref<LinkSpec[]>([])

// 连线样式
const linkStyles = reactive<Record<string, LinkStyle>>({})

// 创建初始连线
const createInitialLinks = () => {
  nextTick(() => {
    if (nodeElements.value && nodeElements.value.length >= 4) {
      const initialLinks = [
        { id: 'link1', from: nodeElements.value[0], to: nodeElements.value[1] },
        { id: 'link2', from: nodeElements.value[1], to: nodeElements.value[2] },
        { id: 'link3', from: nodeElements.value[2], to: nodeElements.value[3] },
        { id: 'link4', from: nodeElements.value[0], to: nodeElements.value[3] }
      ]

      links.value = initialLinks

      // 设置默认样式
      initialLinks.forEach(link => {
        linkStyles[link.id] = {
          color: '#666666',
          dashed: false,
          arrow: 'end',
          strokeWidth: 2
        }
      })
    }
  })
}

// 方法
const selectNode = (node: Node) => {
  selectedNode.value = node
}

const addRandomLink = () => {
  if (nodeElements.value && nodeElements.value.length >= 2) {
    const availableNodes = nodeElements.value.filter(el =>
      !el.textContent?.includes('Obstacle')
    )

    if (availableNodes.length >= 2) {
      const from = availableNodes[Math.floor(Math.random() * availableNodes.length)]
      let to = availableNodes[Math.floor(Math.random() * availableNodes.length)]

      // 确保不是同一个节点
      while (to === from) {
        to = availableNodes[Math.floor(Math.random() * availableNodes.length)]
      }

      const linkId = `link${Date.now()}`
      links.value.push({
        id: linkId,
        from,
        to
      })

      // 设置随机样式
      linkStyles[linkId] = {
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        dashed: Math.random() > 0.5,
        arrow: ['none', 'end', 'both'][Math.floor(Math.random() * 3)] as 'none' | 'end' | 'both',
        strokeWidth: Math.random() > 0.5 ? 2 : 3
      }
    }
  }
}

const clearLinks = () => {
  links.value = []
  Object.keys(linkStyles).forEach(key => {
    delete linkStyles[key]
  })
}

const shuffleNodes = () => {
  nodes.value.forEach(node => {
    if (!node.label.includes('Obstacle')) {
      node.x = Math.random() * (750 - node.width)
      node.y = Math.random() * (550 - node.height)
    }
  })
}

const updateLinkStyle = (linkId: string, property: string, value: any) => {
  if (linkStyles[linkId]) {
    linkStyles[linkId][property] = value
  }
}

// 事件处理
const handleLinkClick = (link: LinkSpec) => {
  clickedLink.value = link
  console.log('Link clicked:', link.id)
}

const handleLinkHover = (link: LinkSpec) => {
  hoveredLink.value = link
  console.log('Link hovered:', link.id)
}

const handleLinkDblClick = (link: LinkSpec) => {
  console.log('Link double-clicked:', link.id)
  // 双击删除连线
  const index = links.value.findIndex(l => l.id === link.id)
  if (index !== -1) {
    links.value.splice(index, 1)
    delete linkStyles[link.id]
  }
}

// 生命周期
onMounted(() => {
  createInitialLinks()
})
</script>

<style scoped>
.demo-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f0f0f0;
  border-radius: 8px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-group label {
  font-size: 12px;
  font-weight: bold;
}

.control-group input,
.control-group button {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.control-group button {
  background: #007bff;
  color: white;
  cursor: pointer;
}

.control-group button:hover {
  background: #0056b3;
}

.canvas-container {
  margin-bottom: 20px;
  user-select: none;
}

.node {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.node:hover {
  transform: scale(1.05);
}

.info-panel {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.info-section h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.info-section div {
  margin: 5px 0;
  font-size: 14px;
}

.style-config {
  padding: 15px;
  background: #f0f0f0;
  border-radius: 8px;
}

.style-config h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.style-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.style-item span {
  min-width: 60px;
  font-weight: bold;
}

.style-item input[type="color"] {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.style-item select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.style-item label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
</style>
