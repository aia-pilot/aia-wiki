<template>
  <div v-if="shouldDisplay" class="main-side-eaog-links">
    <OrthogonalLinkLayer
      :obstacles="obstacles"
      :links="links"
      :container="containerRef"
      :styles="linkStyles"
      @link:click="handleLinkClick"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 主EAOG与辅EAOG关联线层组件
 *
 * 功能：在mainEaog和sideEaog之间绘制连线，展示它们之间的关联关系
 * 当且仅当mainEaog和sideEaog都存在时才显示
 * 使用mainEaog.root.sideCP.syncPoints来确定连线点
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import OrthogonalLinkLayer from './node-links-layer/orthogonal-link-layer.vue';
import type { LinkSpec, LinkStyle } from './node-links-layer/types';
import { mainEaog, sideEaog } from '../models/cp-editor-state';
import type { SyncPoint, SideCP } from '../models/index';
import Debug from 'debug';

const debug = Debug('aia:cp:main-side-eaog-links');

// 定义组件属性
interface Props {
  // 容器引用
  containerRef: HTMLElement | undefined;
}

const props = defineProps<Props>();

// 定义组件事件
const emit = defineEmits<{
  'link:click': [syncPoint: SyncPoint];
}>();

// 是否应该显示连线层
const shouldDisplay = computed(() => {
  return !!mainEaog.value && !!sideEaog.value && !!getSideCP();
});

// 获取sideCP数据
function getSideCP(): SideCP | undefined {
  if (!mainEaog.value) return undefined;
  return mainEaog.value.cp.sideCPs[0]; // TODO: 待改进
}

// 获取障碍物元素
const obstacles = computed(() => {
  // 收集所有可能成为障碍的元素
  const elements: HTMLElement[] = [];

  // 获取所有EAOG节点元素作为障碍物
  if (props.containerRef) {
    const nodeElements = props.containerRef.querySelectorAll('.eaog-node-header');
    nodeElements.forEach(el => {
      elements.push(el as HTMLElement);
    });
  }

  return elements;
});

// 自定义连线样式
const linkStyles = {
  'sync-point': {
    color: '#1890ff', // 使用蓝色表示同步点
    dashed: false,
    arrow: 'end' as const,
    strokeWidth: 2,
    zIndex: 10
  },
  'blocking-sync-point': {
    color: '#ff4d4f', // 使用红色表示阻塞式同步点
    dashed: false,
    arrow: 'end' as const,
    strokeWidth: 2,
    zIndex: 10
  }
};

// 构建连线数据
const links = computed<LinkSpec[]>(() => {
  if (!shouldDisplay.value || !props.containerRef) return [];

  const sideCP = getSideCP();
  if (!sideCP?.syncPoints?.length) return [];

  const result: LinkSpec[] = [];

  // 遍历所有同步点
  for (const syncPoint of sideCP.syncPoints) {
    try {
      // 查找主EAOG中的actor节点DOM元素
      const actorSelector = `.main-eaog [data-node-path$="${syncPoint.actor.path}"]`;
      const actorElement = props.containerRef.querySelector(actorSelector) as HTMLElement;

      // 查找辅助EAOG中的waiter节点DOM元素
      const waiterSelector = `.side-eaog [data-node-path$="${syncPoint.waiter.path}"]`;
      const waiterElement = props.containerRef.querySelector(waiterSelector) as HTMLElement;

      if (!actorElement || !waiterElement) {
        debug(`未找到同步点DOM元素: actor=${syncPoint.actor.path}, waiter=${syncPoint.waiter.path}`);
        continue;
      }

      // 创建连线规格
      const linkId = `sync-${encodeURIComponent(syncPoint.actor.path)}-${encodeURIComponent(syncPoint.waiter.path)}`;
      const linkType = syncPoint.block ? 'blocking-sync-point' : 'sync-point';
      const linkLabel = syncPoint.description || `${syncPoint.exePhase} ${syncPoint.block ? 'blocking' : 'non-blocking'}`;

      result.push({
        id: linkId,
        from: actorElement,
        to: waiterElement,
        label: linkLabel,
        type: linkType
      });
    } catch (error) {
      debug('创建连线时出错:', error);
    }
  }

  return result;
});

// 处理连线点击事件
function handleLinkClick(linkSpec: LinkSpec) {
  const sideCP = getSideCP();
  if (!sideCP?.syncPoints) return;

  // 从ID中提取路径信息
  const parts = linkSpec.id.split('-');
  if (parts.length < 3) return;

  const actorPath = decodeURIComponent(parts[1]);
  const waiterPath = decodeURIComponent(parts[2]);

  // 查找对应的同步点
  const syncPoint = sideCP.syncPoints.find(
    sp => sp.actor.path === actorPath && sp.waiter.path === waiterPath
  );

  if (syncPoint) {
    emit('link:click', syncPoint);
  }
}

// 监听DOM变化，在节点元素发生变化时重新计算连线
const observer = ref<MutationObserver | null>(null);

onMounted(() => {
  // 创建观察器以监听DOM变化
  observer.value = new MutationObserver(() => {
    debug('DOM变化，重新计算连线');
  });

  // 开始观察
  if (props.containerRef) {
    observer.value.observe(props.containerRef, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-node-path']
    });
  }
});

onUnmounted(() => {
  // 停止观察
  if (observer.value) {
    observer.value.disconnect();
    observer.value = null;
  }
});
</script>

<style scoped>
.main-side-eaog-links {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}
</style>
