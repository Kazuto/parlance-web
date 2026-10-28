<script setup lang="ts">
// The glossary used to live at /terminologies; keep old links and bookmarks working.
definePageMeta({
  redirect: (to) => ({ path: "/glossary", query: to.query, hash: to.hash }),
});
</script>

<template>
  <div />
</template>
