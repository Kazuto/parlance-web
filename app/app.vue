<script setup lang="ts">
const { initializeLocale } = useLocalePreference();

onMounted(() => {
  initializeLocale();
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
