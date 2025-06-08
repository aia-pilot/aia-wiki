<script setup lang="ts">
import { VbenIconButton, VbenIcon } from '@vben-core/shadcn-ui';

defineProps<{
  icon: string;
  tooltip: string;
  disabled?: boolean;
}>();

</script>

<template>
  <VbenIconButton :tooltip="tooltip" :disabled="disabled === true">
    <VbenIcon :icon="icon" class="size-4" />
  </VbenIconButton>
</template>
