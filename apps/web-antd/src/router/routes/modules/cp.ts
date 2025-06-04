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
      }
    ]
  }
];

export default routes;
