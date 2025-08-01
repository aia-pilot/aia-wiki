<template>
  <template v-if="showParallel">
    <Splitpanes class="default-theme">
      <Pane key="main-only" :size="80">
        <slot name="main"></slot>
      </Pane>
      <Pane key="sidebar-only" :size="20">
        <slot name="sidebar"></slot>
      </Pane>
    </Splitpanes>
  </template>

  <template v-else>
    <Splitpanes class="default-theme">
      <Pane key="main-with-parallel" :size="40">
        <slot name="main"></slot>
      </Pane>
      <Pane key="parallel" :size="40">
        <slot name="parallel"></slot>
      </Pane>
      <Pane key="sidebar-with-parallel" :size="20">
        <slot name="sidebar"></slot>
      </Pane>
    </Splitpanes>
  </template>


  <button @click="showParallel = !showParallel" class="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded">
    Toggle Parallel
  </button>

</template>

<script setup>
import {ref, computed} from 'vue'
import {Splitpanes, Pane} from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const showParallel = ref(false)

// 固定总和 10
const sizes = computed(() => ({
  main: showParallel.value ? 40 : 80,
  parallel: showParallel.value ? 40 : 0,
  sidebar: 20
}))


</script>
