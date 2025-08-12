# CPE 架构与开发

> 目标：在**零安装（方案A，纯浏览器）****前提下，完成 CP 可视化编辑（CPE）与可视化调试（CPD），以****统一调试协议（CPDP）****为核心抽象，先在浏览器内运行 Runner 验证产品与交互；待稳定后可平滑切换到****远程服务端执行**以保护 IP 与满足企业级需求。

---

## 1. 背景与范围

- 平台早期用户少、项目多为单人：以**最小复杂度**先跑通编辑与调试闭环。
- 代码结构已确定：每个工作流目录包含 `xxx.cp.js / xxx.cp.ctx.js / xxx.cp.md`，包根含 `aia-cp-index.json`。
- 当前优先级：**CPE（编辑）+ CPD（调试 UI）+ 浏览器内 Runner 适配**；未来再接 **Server Runner**、Git、私有 npm、CRDT/MCP。

## 2. 设计原则

1. **零安装，隐私优先**：本地文件由用户授权目录读写，默认不上传源码。
2. **协议优先**：UI 仅依赖 CPDP；运行位置（浏览器/服务端）由适配器决定。
3. **确定性调试**：虚拟时钟 + 可播种 PRNG，确保同输入→同轨迹，可录制/回放。
4. **最小能力注入**：禁用危险能力，按白名单开放 `fetch`、文件根目录写入等。
5. **可迁移**：保持文件/接口稳定，未来接 Git/Registry/MCP 时无需重写 UI/Runner。

\$1

### 3.1 项目布局（统一为 `@aia/cpd`，`cpd-ui` 内嵌到 CPE）

为贴合现状（已有 CPE：Vue3 + TS + Vite）并降低早期维护成本，调整为：

- **CPE 应用（现有工程）**：新增内置组件 ``（即原 `cpd-ui`），作为 CPE 的一个视图/面板，不单独发包。
- **统一 npm 包：**``（单包多子入口）
  - `@aia/cpd/core`：CPDP 协议类型、EventBus/Trace 类型、VirtualClock、Seeded RNG、JSON Patch 工具、回放/录制 API。
  - `@aia/cpd/adapter-mock`：模拟/脚本化事件源与回放驱动，供 View-First 与测试使用。
  - `@aia/cpd/adapter-worker`：浏览器 Worker 适配器，把 Runner（打包为 ESM/WASM）与 CPDP 打通。
  - `@aia/cpd/types`：公共类型再导出，便于第三方接入。

> 说明：`<CpdPanel/>` 只依赖 `@aia/cpd` 的子入口；未来若需要独立发布 UI，再从 CPE 中抽离为单独包亦可无痛迁移。

**建议的 **``**（示例）**

```json
{
  "name": "@aia/cpd",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",                
    "./core": "./dist/core/index.js",
    "./adapter-mock": "./dist/adapter-mock/index.js",
    "./adapter-worker": "./dist/adapter-worker/index.js",
    "./types": "./dist/types/index.d.ts"
  },
  "typesVersions": { "*": { "core": ["dist/core/index.d.ts"], "adapter-mock": ["dist/adapter-mock/index.d.ts"], "adapter-worker": ["dist/adapter-worker/index.d.ts"], "types": ["dist/types/index.d.ts"] } }
}
```

## 4.  关键模块说明

### 4.1 FS Access 模块（摘要）

- 核心 API：
  - `pickRoot()/restoreRoot()/forgetRoot()` 授权管理
  - `list/readText/readBinary/writeText/writeBinary/ensureDir/remove/move/walk/stat/sha256`
- 能力：原子写（`createWritable().close()`）、乐观并发（preconditionSha256）、路径规范化（禁止 `..` 越界）、软链越根拒绝。

### 4.2 调试协议 CPDP（最小集）

- **事件（Runner→UI）**：
  - `run.start` / `run.end`
  - `node.enter` / `node.exit`、`breakpoint.hit`
  - `ctx.patch`（RFC6902）
  - `log`（info/warn/error）
- **指令（UI→Runner）**：
  - `run.create`（含 `deterministic`/`seed`）/ `run.pause` / `run.continue`
  - `run.stepOver` / `run.stepInto` / `run.stepOut` / `run.terminate`
  - `bp.add` / `bp.remove`
  - `ctx.apply`（JSON Patch）

### 4.3 BrowserWorkerAdapter

- 在 Web Worker 中装载 Runner，主线程通过 `postMessage` 发送 CPDP 指令，接收事件。
- 隔离主线程，保证调试期间 UI 流畅；长任务在节点/边界 `await` 让出。

### 4.4 Runner 可插桩

- 在 **节点进入/退出**、**边触发**、**hook**（before/after/compensation）处统一 `emit(CPDEvent)`。
- 断点模型：位置 + 条件表达式；命中后挂起到“调度门闩”。
- 步进语义：
  - `stepOver`：到同层下一个可中断点；
  - `stepInto`：进入子流程/hook；
  - `stepOut`：回到父层下一个点。

### 4.5 确定性运行

- **虚拟时钟**：替代 `Date.now/setTimeout`；时间推进由调试器驱动（暂停不走）。
- **可播种 PRNG**：替代 `Math.random`；支持 `rng.fork(label)` 派生子流，保证并发时可复现。
- **I/O 处理**：调试期默认禁用外部 `fetch` 或白名单；支持录制/回放固定响应。

\#\$1

\$1

### 4.7.9 并发渐进策略与兼容性（v0 → v1）

为了“先有界面、后补并发”，避免未来大改，采用如下兼容策略：

- **协议向前兼容**：从 v0 起事件结构就包含 `laneId?: LaneId`（缺省等价于 `[0]`），断点与步进指令的 `scope` 字段存在但可忽略。
- **UI 预留并发视图**：时间线支持单泳道起步；当有多 lane 事件时自动分轨显示；focus 概念默认聚焦 `[0]`。
- **调度抽象提前**：即使在 v0 线性执行，也通过 `Scheduler` 接口推进“微步”，确保日后替换为 BFS 轮询无需改 UI。
- **ctx 抽象提前**：v0 先用单一 `ContextStore`，但 API 以“lane-local patch log + join 合并”设计；线性时 `laneId=[0]`；上线并发时无破坏性迁移。
- **事件总序固定**：定义 `<logical time, spawnOrder, laneId, microstepSeq>` 的确定性排序，从 v0 开始遵守。
- **回放格式稳定**：录制文件从 v0 就带 `laneId` 字段，即使全是 `[0]`；并发实现后可直接回放历史录制。

> 结论：并发可以延后实现，但**必须**在 v0 就引入字段和抽象，确保未来切换时不动 UI 与协议。## 5. UI（CPD）

- **时间线/轨迹视图**：按事件流展示，支持回放定位；
- **图上高亮**：当前节点/边高亮、历史路径淡显；
- **断点面板**：列表、启用/禁用、条件断点；
- **上下文（ctx）**：树形查看、Diff、JSON Patch 编辑与撤销；
- **控制栏**：Run / Pause / Continue / StepOver / StepInto / StepOut / Terminate；
- **I/O 面板**：外部调用（若启用）与模拟响应；
- **控制台**：结构化日志与跳转联动。

## 6. 运行模式

- **当前：浏览器内运行**（Dev Runner in Worker）
  - 强优势：零后端、延迟低、开发验证最快。
  - 风险：Runner 暴露于客户端 → 正式版切换到服务端保护 IP。
- **后续：服务端运行**（Server Runner）
  - 通过 `ServerAdapter` 替换连接方式，CPDP 保持不变；
  - 临时产物上行、沙箱执行、事件下行；支持多人旁观与审计。

## 7. 存储与数据

- **浏览器端**：
  - IndexedDB 持久化 `FileSystemHandle`（授权恢复）；
  - 可选保存“调试会话”摘要与事件流（JSON），便于回放与分享；
  - 不默认持久化源码快照（隐私优先）。
- **未来服务端**：对象存储存放临时产物与事件流（带哈希与 TTL），审计可选。

## 8. 迁移路线

1. 继续方案A（纯浏览器）完善 CPE/CPD 使用体验；
2. 增加 `ServerAdapter` 原型，支持远程执行（单项目、一次性 Runner）；
3. 引入内部 Registry 与 Git（可选），将发布/回滚与审计接入；
4. 需要本地工具时，再引入 MCP 或自定义轻量客户端。

## 9. 开发计划（里程碑）— View First & 单包多入口

> 前置现状：FS Access 模块已完成并整合到 CPE。 策略：**View 优先**。先落地 `@aia/cpd`（core+mock），完成 CPE 内置 `<CpdPanel/>` 的交互与可视化；随后接入 Runner（adapter-worker）。

**M0（第1周）— **``** 包基线 + 面板占位**

- 建立 `@aia/cpd` 单包工程（或 monorepo 但只发一个包），子入口：`core`、`adapter-mock`、`adapter-worker`（空实现）。
- `core@0.1.0`：定义 CPDP v0.1（含可选 `laneId`/`scope`）、EventBus、Trace 基类、VirtualClock/RNG 雏形、JSON Patch 帮助方法。
- CPE 内加入 `<CpdPanel/>` 占位与路由/入口，接入事件总线（暂由 `adapter-mock` 驱动）。

**M1（第2周）— View First：CPD 面板**

- `<CpdPanel/>` 初版：
  - 时间线（单泳道起步，内部结构支持 lane 分轨）、当前节点/边高亮占位；
  - 控制栏：Run/Pause/Continue；断点列表（添加/删除，条件先不做）；
  - ctx 视图（树形）与 JSON Patch 编辑（通过 `core` 的 `ctx.patch` 协议）。
- `adapter-mock`：脚本化 Trace/随机生成器，支持 `run.start/node.enter/exit/breakpoint.hit/run.end`。

**M2（第3周）— 录制/回放与确定性工具**

- `core`：TraceRecorder（JSON 存储）、回放驱动；VirtualClock + Seeded RNG 实用化。
- `<CpdPanel/>`：回放控件（跳转到事件、播放速度）。

**M3（第4周）— 接入真实 Runner（线性）**

- `adapter-worker`：把现有 Runner 打到 Worker；enter/exit/hook 事件适配为 CPDP 流。
- 支持 `pause/continue/stepOver`（线性）；断点命中；与面板按钮联动。
- E2E：CPE 修改 → 保存 → 调试 → 命中断点，录制/回放一致。

**M4（第5周）— 并发骨架与 UI 预留**

- `core`：加入 Scheduler/Lane 接口（实现仍可线性，`laneId=[0]`）；ContextStore API 升级为 lane-local patch 模型（线性同 `[0]`）。
- `<CpdPanel/>`：开启泳道视图与 focus lane 交互（即便只有 `[0]` 也正常）。

**M5（第6周）— 并发 v1（pand + 合并）**

- Runner 插桩扩展：`lane.spawn/lane.end/lane.join`；调度器实现 **BFS 轮询**；
- 合并策略：默认 `last-writer`；冲突标识；面板冲突提示；
- 步进并发版：`stepInto/Over/Out` 针对 focus lane；断点支持 `any`/指定 lane。

**M6（第7\~8周，可选）— 远程原型**

- 新增 `@aia/cpd/adapter-server`（同包新入口）+ WS 网关；一次性产物上传/TTL 擦除；旁观订阅。

### 风险与应对（并发延后是否有坑？）

- **风险**：若 v0 不预留 lane 与调度抽象，后续改动会波及 UI/协议。
- **对策**：从 M0 起就引入 `laneId?`、`scope?`、`Scheduler`、`ContextStore(lane)` 与事件总序；UI 以单泳道实现但结构支持多泳道 → **无破坏升级**。

## 10. 接口摘要 接口摘要

**FS 模块**：`pickRoot/restoreRoot/list/readText/writeText/readBinary/writeBinary/ensureDir/remove/move/walk/stat/sha256`

**CPDP 事件**：`run.start/run.end/node.enter/node.exit/breakpoint.hit/ctx.patch/log`

**CPDP 指令**：`run.create/run.pause/run.continue/run.stepOver/run.stepInto/run.stepOut/run.terminate/bp.add/bp.remove/ctx.apply`

**Runner 适配器接口**：

- `onEvent((e) => void)`，`send(cmd)`，`dispose()`；Browser/Server 两实现同接口。

## 11. 风险与对策

- **Runner IP 暴露**（浏览器内）：仅限开发/演示；正式版切换 Server Runner。
- **浏览器兼容性**：FS Access 限 Chromium；Safari/Firefox 提供 zip 导入/导出降级。
- **长任务阻塞**：节点边界 `await` 让出；必要时下放到 WASM。
- **非确定性来源**：禁止直接用 `Date.now/Math.random/fetch`；统一通过注入层与白名单。

## 12. 资源与依赖

- 前端：Vite + TypeScript + Web Worker；
- JSON Patch：RFC6902 实现库（或自写精简版）；
- 可选：Comlink/SES/Realm、WASM 工具链（后续）。

---

### 附：演示脚本（Demo Checklist）

1. 选择项目目录 → 加载工作流清单与图。
2. 修改 `xxx.cp.js` 一处节点逻辑 → 保存成功（哈希校验通过）。
3. 设置断点 → 运行 → 命中 → 查看 ctx → `stepOver/Into/Out`。
4. 编辑 ctx（JSON Patch）→ 继续运行 → 结果变化可见。
5. 开启确定性模式（seed 固定）→ 录制 → 回放轨迹一致。

> 本文档为“产品/工程对齐蓝本”，随迭代更新 CPDP 版本与模块边界。

