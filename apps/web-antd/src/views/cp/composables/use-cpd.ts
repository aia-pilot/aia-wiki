// ui/composables/useCpd.ts
import { reactive, shallowRef, onBeforeUnmount, markRaw } from 'vue';
import type { Breakpoint, Adapter } from 'aia-cpd/core';
import { DebugController } from 'aia-cpd/core';

export function useCpd(adapter: Adapter) {
  // const adapter = new BrowserWorkerAdapter(new URL('./worker.js', import.meta.url));
  const controller = markRaw(new DebugController(adapter));

  // 1) Session 直接响应式
  const session = reactive(controller.session);
  controller.session = session; // 确保 controller.session 指向同一个响应式对象

  // 2) 断点列表自己维护
  const breakpoints = shallowRef<Breakpoint[]>(controller.breakpoints.list());
  const addBreakpoint = (bp: Breakpoint) => {
    controller.addBreakpoint(bp);
    breakpoints.value = controller.breakpoints.list();
  };
  const removeBreakpoint = (id: string) => {
    controller.removeBreakpoint(id);
    breakpoints.value = controller.breakpoints.list();
  };

  onBeforeUnmount(() => controller.dispose());

  return { controller, session, breakpoints, addBreakpoint, removeBreakpoint };
}
