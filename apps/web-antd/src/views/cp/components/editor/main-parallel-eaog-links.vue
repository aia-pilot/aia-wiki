<template>
  <div class="main-parallel-eaog-links">
    <OrthogonalLinkLayer
      :obstacles="obstacles"
      :links="links"
      :container="container"
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
import {computed, onMounted, onUnmounted, ref} from 'vue';
import OrthogonalLinkLayer from '../node-links-layer/orthogonal-link-layer.vue';
import type {LinkSpec} from '../node-links-layer/types';
import {parallelCPs} from '../../viewmodels/cp-editor-state';
import type {SyncPoint} from '../../models/types';
import Debug from 'debug';
import {type ContentBox, getAllContentBoxes} from "#/views/cp/components/node-links-layer/utils/get-all-content-box";

const debug = Debug('aia:cp:main-parallel-eaog-links');

const props = defineProps<{
  container: HTMLElement | undefined
}>();

// 定义组件事件
const emit = defineEmits<{
  'link:click': [syncPoint: SyncPoint];
}>();


// 添加一个触发器，用于重新计算链接
const recalculateTrigger = ref(0);

// 触发重新计算的方法
function triggerRecalculate() {
  recalculateTrigger.value++;
  debug('触发链接重新计算，recalculateTrigger:', recalculateTrigger.value);
}

const links = computed<LinkSpec[]>(() => {
  // 添加对recalculateTrigger的依赖，确保在触发重新计算时能够重新执行此计算函数
  const trigger = recalculateTrigger.value;
  debug('重新计算links，trigger:', trigger);

  const sideCPs = parallelCPs.value!;
  const integrationManager = sideCPs[0].cpInstance.eaog.integrationManager;
  const syncPoints = sideCPs.flatMap(sp => sp.syncPoints);

  const linkSpecs: LinkSpec[] = [];

  // 遍历所有同步点 TODO: 绘制launch point
  for (const syncPoint of syncPoints) {
    try {
      // 查找主EAOG中的actor节点DOM元素
      const actorEaogPath = integrationManager.getNodeBriefPath(syncPoint.actor.path);
      const actorSelector = `.main-eaog [data-node-path$="${actorEaogPath}"] .eaog-node-name`;
      const actorElement = props.container.querySelector(actorSelector) as HTMLElement;

      // 查找辅助EAOG中的waiter节点DOM元素
      const waiterEaogPath = integrationManager.getNodeBriefPath(syncPoint.waiter.path);
      const waiterSelector = `.parallel-eaog [data-node-path$="${waiterEaogPath}"] .node-type-icon span`;
      const waiterElement = props.container.querySelector(waiterSelector) as HTMLElement;

      if (!actorElement || !waiterElement) {
        !actorElement && debug(`未找到同步点DOM元素: actor=${syncPoint.actor.path}`);
        !waiterElement && debug(`未找到同步点DOM元素: waiter=${syncPoint.waiter.path}`);
        continue;
      }

      // 创建连线规格
      // const linkId = `sync-${encodeURIComponent(syncPoint.actor.path)}-${encodeURIComponent(syncPoint.waiter.path)}`;
      const linkId = crypto.randomUUID(); // 使用随机ID，避免重复
      const linkType = syncPoint.block ? 'solid' : 'dashed';
      const linkLabel = syncPoint.description || `${syncPoint.exePhase} ${syncPoint.block ? 'blocking' : 'non-blocking'}`;

      linkSpecs.push({
        id: linkId,
        from: actorElement,
        to: waiterElement,
        label: linkLabel,
        type: linkType,
        style: {
          color: syncPoint.block ? '#f00' : '#00f',
          dashed: !syncPoint.block,
          arrow: syncPoint.block ? 'start' : 'end',
          strokeWidth: 2,
          // zIndex: 1
        },
        data: {syncPoint: syncPoint}
      });
    } catch (error) {
      debug('创建连线时出错:', error);
    }
  }

  return linkSpecs;
});

const obstacles = computed(() => {
  const trigger = recalculateTrigger.value;
  debug('重新计算obstacles，trigger:', trigger);

  if (!props.container) return [];

  // @DEV
  // window.getAllContentBoxes ||= getAllContentBoxes
  // const eaogPanesContainer = props.container.querySelector('.eaog-panes');
  // const contentBoxs = getAllContentBoxes(eaogPanesContainer, true);

  const eaogPanesContainer = props.container.querySelector('.eaog-panes');
  const contentBoxs = getAllContentBoxes(eaogPanesContainer!);
  return contentBoxs.map((box: ContentBox) => box.rect);
});

// 处理连线点击事件
function handleLinkClick(linkSpec: LinkSpec) {
  debug('处理连线点击事件:', linkSpec.data!.syncPoint);
  emit('link:click', linkSpec.data!.syncPoint);
}

// 监听DOM变化，在节点元素发生变化时重新计算连线
const observer = ref<MutationObserver | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

onMounted(() => {
  if (!props.container) return;

  // // 创建并配置DOM变化观察器
  // observer.value = new MutationObserver(() => {
  //   debug('DOM变化，重新计算连线');
  //   // triggerRecalculate();
  // });
  //
  // // 开始观察DOM变化
  // observer.value.observe(props.container, {
  //   childList: true,
  //   subtree: true,
  //   attributes: true,
  //   attributeFilter: ['class', 'data-node-path']
  // });

// 创建并配置容器大小变化和滚动事件观察器
  resizeObserver.value = new ResizeObserver(() => {
    debug('容器大小变化，重新计算连线');
    triggerRecalculate();
  });

// 开始观察容器大小变化
  const parallelEaogPane = props.container.querySelector('.parallel-eaog');
  resizeObserver.value.observe(parallelEaogPane);

// 监听滚动事件
  const eaogPanes = props.container.querySelector('.main-eaog, .parallel-eaog');
  eaogPanes.addEventListener('scroll', triggerRecalculate);
});

onUnmounted(() => {
  // 停止DOM变化观察
  if (observer.value) {
    observer.value.disconnect();
    observer.value = null;
  }

  // 停止容器大小变化观察
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }

  // 停止滚动事件监听
  const eaogPanes = props.container?.querySelector('.main-eaog, .parallel-eaog');
  eaogPanes.removeEventListener('scroll', triggerRecalculate);
});
</script>

<style scoped>
.main-parallel-eaog-links {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}
</style>
