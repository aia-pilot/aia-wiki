# `OrthogonalLinkLayer` 组件规格说明

用于在已有 DOM 布局中绘制避障正交折线连接的 Vue 3 组件。支持清晰的连线、避开节点遮挡、丰富交互与样式自定义，适用于树形结构、流程图、同步关系等场景。

---

## 📦 基本信息

* **组件名**：`<OrthogonalLinkLayer />`
* **框架**：Vue 3
* **渲染类型**：SVG 层（覆盖在目标容器之上）
* **布局逻辑**：网格化正交折线路由，避开指定障碍物

---

## 🧾 Props

### `obstacles: HTMLElement[]`

> 要避开的 DOM 节点列表（如 `.node-head` 元素）

* 每个元素的 `getBoundingClientRect()` 将用于构建避障区域。

---

### `links: LinkSpec[]`

> 描述需要绘制的连线

```ts
interface LinkSpec {
  id: string
  from: HTMLElement
  to: HTMLElement
  label?: string
  type?: 'solid' | 'dashed' | 'conditional'
}
```

---

### `containerRef: Ref<HTMLElement | null>`

> SVG 所依附的容器元素（决定绘图尺寸、坐标系基准）

---

### `padding?: number`

> （默认：6）
> 每个障碍物 bbox 扩张的像素，用于为路径腾出安全距离

---

### `gridSize?: number`

> （默认：10）
> 网格单元边长，单位像素；控制避障路径精度与性能

---

### `styles?: Record<string, LinkStyle>`

> 对每条连线的样式进行个性化控制，key 为 `LinkSpec.id`

```ts
interface LinkStyle {
  color?: string
  dashed?: boolean
  arrow?: 'none' | 'end' | 'both'
  strokeWidth?: number
  zIndex?: number
}
```

---

## 🎨 渲染行为

* 使用单个 SVG `<path>` 元素渲染每条连线；
* 默认采用水平-垂直-水平三段式折线路径；
* 每条线都具备唯一 ID 和可交互事件；
* SVG 层处于容器顶层，避免被 DOM 遮挡；
* SVG 路径使用 `pointer-events: stroke`，不会遮挡节点交互。

---

## ✨ 交互事件

| 事件名             | 参数                 | 描述       |
| --------------- | ------------------ | -------- |
| `link:click`    | `(link: LinkSpec)` | 用户点击连线   |
| `link:hover`    | `(link: LinkSpec)` | 用户 hover |
| `link:dblclick` | `(link: LinkSpec)` | 用户双击连线   |

---

## 🧠 路由逻辑说明

* 构建二维网格地图，根据 gridSize 离散化容器；
* 将 obstacles 映射为网格中的 blocked 区域；
* 对每条连线使用 A\* 算法从 `from → to` 寻找正交避障路径；
* 连线路径由点序列转换为 SVG 折线。

---

## 🔁 响应式行为

* 组件响应以下变更自动重绘：

  * `links` 数组变化
  * `obstacles` 变化（坐标重新获取）
  * `containerRef` 尺寸变化（ResizeObserver）
* 每次变更将重新计算所有路径并更新 SVG 内容。

---

## 🧩 示例用法

```vue
<OrthogonalLinkLayer
  :obstacles="nodeHeadEls"
  :links="syncLinks"
  :containerRef="containerEl"
  :styles="linkStyles"
  padding="6"
  @link:click="handleClick"
/>
```

---

## 📌 限制说明

* 暂不支持曲线、斜线；
* 不自动处理 label（未来可扩展为 marker + tooltip）；
* 多路径不交叉通过路径偏移或惩罚机制实现，精度受限于 gridSize；
* `from`/`to` 节点必须为渲染后 DOM 元素。

---
