<script setup lang="ts">
import { Button, Checkbox, Dialog, Input } from "@thkzt/eunoia";

const model = defineModel<boolean>({ default: false });

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
  <Dialog v-model="model" title="Create Locale" @close="handleClose">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- Code -->
      <div>
        <Input
          v-model="code"
          type="text"
          required
          placeholder="e.g., en-US, de-DE, fr-FR"
          :disabled="isPending"
          helper="ISO language code (e.g., en, de) or language-region code (e.g., en-US, de-DE)"
        >
          Code
        </Input>
      </div>

      <!-- Name (English) -->
      <div>
        <Input
          v-model="nameEn"
          type="text"
          required
          placeholder="e.g., English, German, French"
          helper="Display name for this locale"
          :disabled="isPending"
        >
          Name (English)
        </Input>
      </div>

      <!-- Is Default -->
      <Checkbox
        v-model="isDefault"
        :disabled="isPending"
        helper="This will be the fallback locale for translations"
      >
        <template #description> Set as default locale </template>
      </Checkbox>

      <!-- Error -->
      <div v-if="error" class="rounded-md bg-red-50 border border-red-200 p-3">
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <Button ghost :disabled="isPending" @click="handleClose">
          Cancel
        </Button>
        <Button primary :disabled="isPending">
          {{ isPending ? "Creating..." : "Create Locale" }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
