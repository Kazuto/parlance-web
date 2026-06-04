<script setup lang="ts">
defineProps<{
  open: boolean;
}>();

// Form state
const code = ref("");
const nameEn = ref("");
const isDefault = ref(false);
const error = ref<string>();

const { create } = useLocaleStore();
const { mutateAsync: createLocale, isPending } = create;

function resetForm() {
  code.value = "";
  nameEn.value = "";
  isDefault.value = false;
  error.value = undefined;
}

async function handleSubmit() {
  error.value = undefined;

  if (!code.value || !nameEn.value) {
    error.value = "Code and name are required";
    return;
  }

  await createLocale({
    code: code.value,
    names: {
      en: nameEn.value,
    },
    isDefault: isDefault.value,
  });
}

const emit = defineEmits<{
  close: [];
}>();

function handleClose() {
  if (!isPending) {
    emit("close");

    resetForm();
  }
}
</script>

<template>
  <CoreDialog :open @close="handleClose">
    <form class="px-6 py-4 space-y-4" @submit.prevent="handleSubmit">
      <!-- Code -->
      <div>
        <label for="code" class="block text-sm font-medium text-gray-700 mb-1">
          Code <span class="text-red-500">*</span>
        </label>
        <input
          id="code"
          v-model="code"
          type="text"
          required
          placeholder="e.g., en-US, de-DE, fr-FR"
          :disabled="isPending"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p class="mt-1 text-xs text-gray-500">
          ISO language code (e.g., en, de) or language-region code (e.g., en-US,
          de-DE)
        </p>
      </div>

      <!-- Name (English) -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
          Name (English) <span class="text-red-500">*</span>
        </label>
        <input
          id="name"
          v-model="nameEn"
          type="text"
          required
          placeholder="e.g., English, German, French"
          :disabled="isPending"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p class="mt-1 text-xs text-gray-500">Display name for this locale</p>
      </div>

      <!-- Is Default -->
      <div class="flex items-start">
        <div class="flex items-center h-5">
          <input
            id="isDefault"
            v-model="isDefault"
            type="checkbox"
            :disabled="isPending"
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
          />
        </div>
        <div class="ml-3">
          <label for="isDefault" class="text-sm font-medium text-gray-700">
            Set as default locale
          </label>
          <p class="text-xs text-gray-500">
            This will be the fallback locale for translations
          </p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="rounded-md bg-red-50 border border-red-200 p-3">
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          :disabled="isPending"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isPending"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isPending ? "Creating..." : "Create Locale" }}
        </button>
      </div>
    </form>
  </CoreDialog>
</template>
