import type { RouteRecordRaw } from 'vue-router';
import { $t } from '@vben/locales';

const routes: RouteRecordRaw[] = [
  {
    path: '/app',
    name: 'App',
    meta: {
      icon: 'lucide:app-window',
      order: 10,
      title: $t('app.title'),
    },
    children: [
      {
        path: '',
        name: 'AppHome',
        component: () => import('../../../views/app/index.vue'),
        meta: {
          icon: 'lucide:home',
          title: $t('app.home'),
        },
      },
      {
        path: ':id',
        name: 'AppDetail',
        component: () => import('../../../views/app/detail.vue'),
        meta: {
          icon: 'lucide:file-text',
          title: $t('app.detail'),
        }
      }
    ]
  }
];

export default routes;
