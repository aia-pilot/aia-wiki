import type { RouteRecordRaw } from 'vue-router';
import { $t } from '@vben/locales';

const routes: RouteRecordRaw[] = [
  {
    path: '/wiki',
    name: 'Wiki',
    // component: () => import('#/views/wiki/WikiLayout.vue'), // 自定义布局组件
    meta: {
      title: $t('wiki.title'),
    },
    children: [
      {
        path: '',
        name: 'WikiHome',
        component: () => import('#/views/wiki/index.vue'),
        meta: {
          title: $t('wiki.home'),
        },
      },
      {
        path: ':id',
        name: 'WikiDetail',
        component: () => import('#/views/wiki/detail.vue'),
        meta: {
          title: $t('wiki.detail'),
        }
      }
    ]
  }
];

export default routes;
