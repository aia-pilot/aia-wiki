<template>
  <!-- 双栏模式 -->
  <template v-if="!showParallel">
    <Splitpanes class="default-theme">
      <Pane :size="80">
        <slot name="main"></slot>
      </Pane>
      <Pane :size="20">
        <slot name="sidebar"></slot>
      </Pane>
    </Splitpanes>
  </template>

  <!-- 三栏模式 -->
  <template v-else>
    <Splitpanes class="default-theme">
      <Pane :size="40">
        <slot name="main"></slot>
      </Pane>
      <Pane :size="40">
        <slot name="parallel"></slot>
      </Pane>
      <Pane :size="20">
        <slot name="sidebar"></slot>
      </Pane>
    </Splitpanes>
  </template>
</template>

<script setup>
import {Splitpanes, Pane} from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

defineProps({
  showParallel: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
/* 这里可根据需求自定义样式 */
</style>
