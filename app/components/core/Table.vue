<script setup lang="ts">
export type DataTableColumn = {
  title: string;
  key: string;
  sortable?: boolean;
  align?: "start" | "end";
  value?: (item: Record<string, unknown>) => unknown;
};

defineProps<{
  headers: DataTableColumn[];
  items: Record<string, unknown>[];
}>();
</script>

<template>
  <table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
      <tr>
        <th
          v-for="header in headers"
          :key="header.key"
          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          {{ header.title }}
        </th>
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      <tr v-for="(item, index) in items" :key="index" class="hover:bg-gray-50">
        <td
          v-for="header in headers"
          :key="header.key"
          class="px-6 py-4 whitespace-nowrap"
        >
          {{ header.value ? header.value(item) : item[header.key] }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
