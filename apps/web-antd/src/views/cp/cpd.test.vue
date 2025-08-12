<!-- src/components/cpd.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import type { CPDEvent, LaneId } from 'aia-cpd/core'
import { DebugController } from 'aia-cpd/core'
import { MockAdapter } from 'aia-cpd/adapter-mock'
// 如需接真 Runner：
// import { BrowserWorkerAdapter } from '@aia/cpd/adapter-worker'
// const adapter = new BrowserWorkerAdapter(new URL('../worker.js', import.meta.url))

// --- Mock：模拟一条最小轨迹 + ctx 变化 + 断点命中 ---
const adapter = new MockAdapter(async (emit) => {
  await wait(120)
  emit({ type: 'node.enter', runId: 'mock', at: { workflowId: 'demo', kind: 'node', id: 'start' } })
  await wait(160)
  emit({ type: 'ctx.patch', runId: 'mock', laneId: [0], diff: [{ op: 'add', path: '/counter', value: 1 }] })
  await wait(160)
  emit({ type: 'node.exit', runId: 'mock', at: { workflowId: 'demo', kind: 'node', id: 'start' } })
  await wait(120)
  emit({ type: 'node.enter', runId: 'mock', at: { workflowId: 'demo', kind: 'node', id: 'next' } })
  await wait(120)
  emit({ type: 'breakpoint.hit', runId: 'mock', bpId: 'bp-1', at: { workflowId: 'demo', kind: 'node', id: 'next' } })
})
function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// --- DebugController：聚合事件 & 发协议命令 ---
const dc = new DebugController(adapter)

const events = ref<CPDEvent[]>([])
const state = computed(() => dc.session.state)                // idle | running | paused | terminated | error
const lastAt = computed(() => dc.session.lastAt)
const ctxView = computed(() => JSON.stringify(dc.ctx.getGlobal(), null, 2))

// 断点与 Patch 输入
const bpId = ref('bp-1')
const bpNodeId = ref('next')
const patchText = ref('[{"op":"add","path":"/user/name","value":"alice"}]')

// lane 焦点（v0 可省略，等价 [0]；并发上线后再用）
const focusLane = ref<LaneId | 'focused' | undefined>('focused')

onMounted(() => {
  dc.onEvent(e => events.value.push(e))
})
onBeforeUnmount(() => dc.dispose())

// 控制栏动作
function run() {
  events.value = []
  dc.createRun('demo', { foo: 'bar' }, { deterministic: true, seed: 42 })
}
function pause()     { if (dc.session.runId) dc.pause() }
function cont()      { if (dc.session.runId) dc.continue() }
function stepInto()  { if (dc.session.runId) dc.stepInto({ lane: focusLane.value ?? 'focused' }) }
function stepOver()  { if (dc.session.runId) dc.stepOver({ lane: focusLane.value ?? 'focused' }) }
function stepOut()   { if (dc.session.runId) dc.stepOut({ lane: focusLane.value ?? 'focused' }) }
function terminate() { if (dc.session.runId) dc.terminate() }

function addBreakpoint() {
  if (!bpNodeId.value) return
  dc.addBreakpoint({
    id: bpId.value || `bp-${Date.now()}`,
    at: { workflowId: 'demo', kind: 'node', id: bpNodeId.value },
    enabled: true
  })
}

function applyPatch() {
  try {
    const patch = JSON.parse(patchText.value)
    dc.applyCtxPatch(patch) // v0: 全局；并发后可传 { lane: [...] }
  } catch (e) {
    alert('JSON Patch 无效：' + (e as Error).message)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <!-- Toolbar -->
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-2">
        <button class="btn" @click="run">Run</button>
        <button class="btn" :class="{'btn-disabled': state!=='running'}" :disabled="state!=='running'" @click="pause">Pause</button>
        <button class="btn" :class="{'btn-disabled': state!=='paused'}" :disabled="state!=='paused'" @click="cont">Continue</button>
        <button class="btn" :class="{'btn-disabled': state!=='paused'}" :disabled="state!=='paused'" @click="stepInto">Step Into</button>
        <button class="btn" :class="{'btn-disabled': state!=='paused'}" :disabled="state!=='paused'" @click="stepOver">Step Over</button>
        <button class="btn" :class="{'btn-disabled': state!=='paused'}" :disabled="state!=='paused'" @click="stepOut">Step Out</button>
        <button class="btn btn-danger" :class="{'btn-disabled': state==='idle'}" :disabled="state==='idle'" @click="terminate">Terminate</button>
      </div>

      <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span class="badge" :class="{
          'badge-green': state==='running',
          'badge-amber': state==='paused',
          'badge-slate': state==='idle',
          'badge-red': state==='error'
        }">{{ state }}</span>
        <span v-if="lastAt" class="hidden sm:inline"> @ {{ lastAt?.kind }}:{{ lastAt?.id }}</span>
      </div>
    </header>

    <!-- Grid -->
    <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <!-- Breakpoints -->
      <div class="card">
        <h3 class="card-title">断点</h3>
        <div class="flex flex-col sm:flex-row gap-2">
          <input class="inp" v-model="bpId" placeholder="breakpoint id" />
          <input class="inp" v-model="bpNodeId" placeholder="node id（如 next）" />
          <button class="btn" @click="addBreakpoint">添加</button>
        </div>
        <p class="text-xs text-slate-500">说明：示例按 <code>node.id</code> 命中；并发上线后可扩展 lane 维度。</p>
      </div>

      <!-- Ctx -->
      <div class="card">
        <h3 class="card-title">上下文（ctx）</h3>
        <textarea class="inp font-mono min-h-[100px]" v-model="patchText"></textarea>
        <div><button class="btn" @click="applyPatch">Apply JSON Patch</button></div>
        <pre class="mt-2 rounded-md bg-slate-900 text-slate-100 p-3 text-xs leading-relaxed overflow-auto max-h-64">{{ ctxView }}</pre>
      </div>

      <!-- Events -->
      <div class="card">
        <h3 class="card-title">事件流</h3>
        <div class="space-y-1 overflow-auto max-h-72">
          <div v-for="(e, i) in events" :key="i" class="flex items-baseline gap-2 text-sm">
            <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100">{{ e.type }}</code>
            <code v-if="'at' in e && e.at" class="text-slate-500">{{ (e as any).at.kind }}:{{ (e as any).at.id }}</code>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<!-- Tailwind utility classes; 无需额外 CSS 文件 -->
<style scoped>
/* 基础按钮 */
.btn { @apply inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700; }
.btn-danger { @apply border-red-300 text-red-700 hover:bg-red-50 active:bg-red-100 dark:border-red-600 dark:text-red-200 dark:hover:bg-red-700; }
.btn-disabled { @apply opacity-50 cursor-not-allowed; }

/* 输入框 */
.inp { @apply w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600; }

/* 卡片 */
.card { @apply rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800; }
.card-title { @apply mb-2 text-sm font-semibold text-slate-700 dark:text-slate-100; }

/* 状态徽章 */
.badge { @apply inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium; }
.badge-slate { @apply bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100; }
.badge-green { @apply bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-50; }
.badge-amber { @apply bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-50; }
.badge-red { @apply bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-50; }
</style>
