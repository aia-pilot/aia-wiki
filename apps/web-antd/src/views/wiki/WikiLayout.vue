<!-- 注意！现在没有采用，未来可能要用externalRoutes -->
<script setup lang="ts">
import { VbenLogo } from '@vben-core/shadcn-ui';
import { preferences } from '@vben/preferences';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="wiki-layout">
    <!-- 顶部导航栏 -->
    <header class="wiki-header">
      <div class="logo-container">
        <VbenLogo
          :src="preferences.logo.source"
          :text="'AiA Wiki'"
          :collapsed="false"
          @click="router.push('/wiki')"
        />
      </div>
      <div class="header-actions">
        <!-- 用户信息、通知等 -->
        <slot name="header-actions"></slot>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="wiki-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<style scoped>
.wiki-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.wiki-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background-color: var(--background);
}

.logo-container {
  display: flex;
  align-items: center;
}

.wiki-content {
  flex: 1;
  overflow: auto;
}
</style>
