import type {Directive, DirectiveBinding} from 'vue';
import {IS_STANDALONE_APP} from "#/utils/aia-constants";

// 声明 Electron API 类型
declare global {
  interface Window {
    electronAPI?: {
      bindFileFolderDrop: (element: HTMLElement, callback: (data: {
        isDirectory: boolean,
        filePath: string
      }) => void) => void;
      unbindFileFolderDrop: (element: HTMLElement) => void;
    }
  }
}


export interface ElectronDragAndDropOptions {
  onDrop?: (data: { isDirectory: boolean, filePath: string }) => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
}

/**
 * Electron文件拖拽指令
 * 使用方式：v-electron-drag-and-drop="{ onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave }"
 */
export const vElectronDrop: Directive = {
  // 在绑定元素的父组件挂载之前调用
  beforeMount(el: HTMLElement, binding: DirectiveBinding<ElectronDragAndDropOptions>) {
    // 如果不是独立应用，不进行任何操作
    if (!IS_STANDALONE_APP) {
      return;
    }

    const options = binding.value || {};

    // 添加拖拽相关事件监听器
    el.addEventListener('dragover', (e: Event) => {
      e.preventDefault();
      options.onDragOver?.();
    });

    el.addEventListener('dragleave', (e: Event) => {
      e.preventDefault();
      options.onDragLeave?.();
    });

    // 绑定Electron的拖拽处理
    window.electronAPI?.bindFileFolderDrop(el, (data) => {
      options.onDrop?.(data);
    });
  },

  // 在绑定元素的父组件卸载之前调用
  beforeUnmount(el: HTMLElement) {
    if (!IS_STANDALONE_APP) {
      return;
    }
    window.electronAPI?.unbindFileFolderDrop(el);
  }
};

export default vElectronDrop;
