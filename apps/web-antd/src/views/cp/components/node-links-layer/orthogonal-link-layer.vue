<template>
  <svg
    ref="svgRef"
    class="orthogonal-link-layer"
    :style="svgStyles"
    @click="handleSvgClick"
  >
    <!-- 连线路径 -->
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

    <!-- 连线坐标标签 (调试模式) -->
    <g v-if="debug" v-for="link in computedLinks" :key="`coords-${link.id}`" class="coord-labels">
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import Debug from 'debug';

// 导入类型和工具函数
import type { LinkSpec, LinkStyle, Point } from './types';
import { useLinkPathCalculation, getLinkEndpoint, getArrowOrient } from './composables/useLinkPathCalculation';

const _debug = Debug('aia:orthogonal-link-layer');

// Props 定义
interface Props {
  obstacles: HTMLElement[] | DOMRect[];
  links: LinkSpec[];
  container: HTMLElement | undefined;
  padding?: number;
  gridSize?: number;
  styles?: Record<string, LinkStyle>;
  smoothPath?: boolean; // 是否启用平滑路径
  cornerRadius?: number; // 圆角半径
  debug?: boolean; // 是否启用调试模式
}

const props = withDefaults(defineProps<Props>(), {
  padding: 6,
  gridSize: 10,
  styles: () => ({}),
  smoothPath: true, // 默认启用平滑路径
  cornerRadius: 10, // 默认圆角半径为10px
  debug: false // 默认不启用调试模式
});

// Emits
const emit = defineEmits<{
  'link:click': [link: LinkSpec];
  'link:hover': [link: LinkSpec];
  'link:dblclick': [link: LinkSpec];
  'debug:path': [points: Point[]];
}>();

// Refs
const svgRef = ref<SVGElement>();
const resizeObserver = ref<ResizeObserver>();

// 默认连线样式
const defaultLinkStyle = {
  color: '#666',
  dashed: false,
  arrow: 'end' as const,
  strokeWidth: 2,
  zIndex: 1
};

// SVG 样式计算
const svgStyles = computed(() => {
  const containerRect = props.container?.getBoundingClientRect() || null;
  if (!containerRect) return undefined;

  const styles = {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${containerRect.width}px`,
    height: `${containerRect.height}px`,
    pointerEvents: 'none',
    zIndex: 1000
  } as const;

  _debug('svgStyles', styles);
  return styles;
});

// 使用路径计算组合函数
const { computedLinks } = useLinkPathCalculation(props, defaultLinkStyle, emit);

// 事件处理函数
const handleSvgClick = (_event: MouseEvent) => {
  // SVG 点击事件（可根据需要实现）
};

const handleLinkClick = (link: LinkSpec) => {
  emit('link:click', link);
};

const handleLinkDblClick = (link: LinkSpec) => {
  emit('link:dblclick', link);
};

const handleLinkHover = (link: LinkSpec) => {
  emit('link:hover', link);
};

// 生命周期钩子
onMounted(() => {
  // 监听容器大小变化
  _debug("************ Orthogonal Link Layer Mounted ************");

  if (props.container) {
    resizeObserver.value = new ResizeObserver(() => {
      // 触发重新计算
      nextTick();
    });
    resizeObserver.value.observe(props.container);
  }
});

onUnmounted(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
});
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
