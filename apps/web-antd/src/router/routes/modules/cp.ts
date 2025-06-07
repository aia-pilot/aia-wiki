import type { RouteRecordRaw } from 'vue-router';
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
        path: '',
        name: 'CPHome',
        component: () => import('#/views/cp/spike.vue'),
        meta: {
          icon: 'lucide:network',
          title: $t('cp.home'),
        },
      },
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
        component: () => import('#/views/cp/dynamic-record-form-example.vue'),
        meta: {
          icon: 'lucide:file-plus',
          title: '动态表单',
        },
      }
    ]
  }
];

export default routes;
