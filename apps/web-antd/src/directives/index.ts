import type { App } from 'vue';
import vElectronDragAndDrop from './electron-drag-and-drop';

/**
 * 注册所有全局指令
 * @param app Vue应用实例
 */
export function registerDirectives(app: App): void {
  app.directive('electron-drag-and-drop', vElectronDragAndDrop);
}

export { vElectronDragAndDrop };
