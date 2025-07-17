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
        component: () => import('#/views/cp/components/link-layer/simple-example.vue'),
        meta: {
          icon: 'lucide:zap',
          title: '正交线简单示例',
        },
      },
      { // @DEV
        // OrthogonalLinkLayer 演示页面
        path: 'orthogonal-link-layer-demo',
        name: 'OrthogonalLinkLayerDemo',
        component: () => import('#/views/cp/components/link-layer/orthogonal-link-layer-demo.vue'),
        meta: {
          icon: 'lucide:share-2',
          title: '正交线演示',
        },
      },
      { // @DEV
        // OrthogonalLinkLayer 组件测试 - 用于在已有 DOM 布局中绘制避障正交折线连接
        path: 'orthogonal-link-layer',
        name: 'OrthogonalLinkLayer',
        component: () => import('#/views/cp/components/link-layer/test-page.vue'),
        meta: {
          icon: 'lucide:git-fork',
          title: '正交线测试',
        },
      }
    ]
  }
];

export default routes;
