import type { RouteRecordRaw } from 'vue-router';
// @ts-ignore
import { $t } from '@vben/locales';

const routes: RouteRecordRaw[] = [
  {
    path: '/cp',
    name: 'CP',
    meta: {
      icon: 'lucide:brain-circuit',
      order: 30,
      title: $t('cp.title'),
    },
    children: [
      {
        path: 'editor',
        name: 'CPEditor',
        component: () => import('#/views/cp/editor.vue'),
        meta: {
          icon: 'lucide:edit',
          title: $t('cp.editor'),
        },
      },
      { // @DEV
        // 如何利用useVbenForm，为形如z.record(z.string(), z.union([z.string(), z.function(), z.any()]))的数据，生成表单Input，让用户使用时，可以动态添加/删除 record的item？
        // https://deepwiki.com/search/usevbenformzrecordzstring-zuni_aa8f1434-b1b3-4536-933c-6b33d74c13cd
        path: 'dynamic',
        name: '动态表单',
        component: () => import('#/views/cp/@dev-dynamic-example/dynamic-record-form-example.vue'),
        meta: {
          icon: 'lucide:file-plus',
          title: '动态表单',
        },
      },
      { // @DEV
        // OrthogonalLinkLayer 简单示例
        path: 'orthogonal-link-layer-simple',
        name: 'OrthogonalLinkLayerSimple',
        component: () => import('#/views/cp/components/node-links-layer/simple-example.test.vue'),
        meta: {
          icon: 'lucide:zap',
          title: '正交线验证',
        },
      },
      { // @DEV
        path: 'splitpanes',
        name: 'Split Panes Test',
        component: () => import('#/views/cp/splitpanes.test.vue'),
        meta: {
          icon: 'lucide:zap',
          title: 'Split Panes',
        },
      },
      { // @DEV
        path: 'workspace',
        name: 'Workspace Test',
        component: () => import('#/views/cp/workspace.test.vue'),
        meta: {
          icon: 'lucide:zap',
          title: 'Workspace Test',
        },
      },
    ]
  }
];

export default routes;
