/**
 * OrthogonalLinkLayer 组件
 * ------------------------
 * 在已有 DOM 布局中绘制避障正交折线连接的 Vue 3 组件。
 * 用于可视化主CP与边CP的关系，包括：执行点（LP）、同步点（SP）关系。
 *
 * @component
 * @props {HTMLElement[]} obstacles - 障碍物元素列表
 * @props {LinkSpec[]} links - 连线列表
 * @props {HTMLElement} [container] - 容器元素
 * @props {number} [padding] - 障碍物周围的内边距
 * @props {number} [gridSize] - 网格大小
 * @props {Record<string, LinkStyle>} [styles] - 连线样式映射
 * @props {boolean} [debug] - 是否开启调试模式
 *
 * @example
 * <OrthogonalLinkLayer :obstacles="..." :links="..." />
 */
declare const OrthogonalLinkLayer: typeof import('../orthogonal-link-layer.vue')['default']
export default OrthogonalLinkLayer;

/**
 * 连线规格定义
 */
export interface LinkSpec {
  /** 唯一标识 */
  id: string;
  /** 起始元素 */
  from: HTMLElement;
  /** 目标元素 */
  to: HTMLElement;
  /** 连线标签 */
  label?: string;
  /** 连线类型 */
  type?: 'solid' | 'dashed' | 'conditional';
  /** 样式 */
  style?: LinkStyle;
  /** 数据 */
  data?: Record<string, any>;
}

/**
 * 连线样式定义
 */
export interface LinkStyle {
  /** 连线颜色 */
  color?: string;
  /** 是否为虚线 */
  dashed?: boolean;
  /** 箭头方向 */
  arrow?: 'none' | 'end' | 'both';
  /** 线条宽度 */
  strokeWidth?: number;
  /** 层级 */
  zIndex?: number;
}

/**
 * 必填样式属性的连线样式
 */
export interface RequiredLinkStyle {
  color: string;
  dashed: boolean;
  arrow: 'none' | 'end' | 'both';
  strokeWidth: number;
  zIndex: number;
}

/**
 * 坐标点
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 网格单元格
 */
export interface GridCell {
  x: number;
  y: number;
  blocked: boolean;
}

/**
 * 计算后的连线
 */
export interface ComputedLink {
  /** 唯一标识 */
  id: string;
  /** SVG路径字符串 */
  path: string;
  /** 应用的样式 */
  style: RequiredLinkStyle;
  /** 原始连线规格 */
  spec: LinkSpec;
}

/**
 * 组件属性
 */
export interface OrthogonalLinkLayerProps {
  /** 障碍物元素列表 */
  obstacles: HTMLElement[];
  /** 连线列表 */
  links: LinkSpec[];
  /** 容器元素 */
  container: HTMLElement | undefined;
  /** 障碍物周围的内边距 */
  padding?: number;
  /** 网格大小 */
  gridSize?: number;
  /** 连线样式映射 */
  styles?: Record<string, LinkStyle>;
  /** 是否开启调试模式 */
  debug?: boolean;
}
