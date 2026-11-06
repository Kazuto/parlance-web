<script setup lang="ts">
import { HEX_COLOR } from "~/lib/colors";
import {
  Button,
  Dialog,
  Input,
  Textarea,
  useTypingPlaceholder,
} from "@thkzt/eunoia";
import type { Scope } from "~/lib/api/schemas/parlance/v1/ScopeSchema";

// Without an item the dialog creates a scope; with an item it edits it.
const props = defineProps<{ open: boolean; item?: Scope }>();
const emit = defineEmits<{ close: [] }>();

const DEFAULT_COLOR = "#6366f1";

const form = ref({ name: "", slug: "", description: "", color: "" });
// Follow the name until the slug is edited by hand; existing slugs are never rewritten.
const slugTouched = ref(false);
const scopeStore = useScopeStore();
const isEdit = computed(() => !!props.item);
const { t } = useI18n();
const { showSuccess } = useErrorHelper();
const colorInvalid = computed(
  () => !!form.value.color && !HEX_COLOR.test(form.value.color),
);
const { placeholder: namePlaceholder } = useTypingPlaceholder([
  "Backend",
  "Frontend",
  "Marketing",
  "Mobile",
  "Admin",
  "Public",
]);
const { placeholder: slugPlaceholder } = useTypingPlaceholder([
  "backend",
  "frontend",
  "marketing",
  "mobile",
  "admin",
  "public",
]);

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const { error, isPending, submit, cancel } = useFormDialog({
  open: () => props.open,
  isPending: () => scopeStore.create.isPending || scopeStore.update.isPending,
  reset: () => {
    form.value = {
      name: props.item?.name ?? "",
      slug: props.item?.slug ?? "",
      description: props.item?.description ?? "",
      color: props.item?.color ?? "",
    };
    slugTouched.value = isEdit.value;
  },
  close: () => emit("close"),
});

watch(
  () => form.value.name,
  (name) => {
    if (!slugTouched.value) form.value.slug = slugify(name);
  },
);

function updateSlug(value: string | undefined) {
  slugTouched.value = true;
  form.value.slug = value ?? "";
}

function handleSubmit() {
  submit(async () => {
    const name = form.value.name.trim();
    const slug = slugify(form.value.slug);

    if (!name || !slug) {
      error.value = t("scopes.nameSlugRequired");

      return false;
    }

    if (colorInvalid.value) {
      error.value = t("scopes.colorInvalid");

      return false;
    }

    const input = {
      name,
      slug,
      description: form.value.description.trim(),
      color: form.value.color,
    };

    if (props.item) {
      if (!props.item.id) return false;
      await scopeStore.update.mutateAsync({ id: props.item.id, ...input });
      showSuccess(t("scopes.updated", { name }));
    } else {
      await scopeStore.create.mutateAsync(input);
      showSuccess(t("scopes.created", { name }));
    }
  });
}
</script>

<template>
  <Dialog
    :open
    :title="t(isEdit ? 'scopes.edit' : 'scopes.create')"
    :persistent="isPending"
    @close="cancel"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <Input
        v-model="form.name"
        required
        :disabled="isPending"
        :placeholder="namePlaceholder"
      >
        {{ t("common.name") }}
      </Input>
      <Input
        :model-value="form.slug"
        required
        :disabled="isPending"
        :placeholder="slugPlaceholder"
        :helper="t('scopes.slugHelp')"
        @update:model-value="updateSlug"
      >
        {{ t("scopes.slug") }}
      </Input>
      <Textarea
        v-model="form.description"
        :disabled="isPending"
        :placeholder="t('scopes.descriptionPlaceholder')"
      >
        {{ t("common.description") }}
      </Textarea>
      <Input
        v-model="form.color"
        :disabled="isPending"
        :placeholder="DEFAULT_COLOR"
        :invalid="colorInvalid"
        :errors="colorInvalid ? [t('scopes.colorInvalid')] : undefined"
      >
        {{ t("scopes.color") }}
        <template #prepend>
          <!-- prettier-ignore -->
          <input
            type="color"
            class="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
            :value="HEX_COLOR.test(form.color) ? form.color : DEFAULT_COLOR"
            :disabled="isPending"
            :aria-label="t('scopes.pickColor')"
            @input="form.color = ($event.target as HTMLInputElement).value"
          >
        </template>
      </Input>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <Button type="button" ghost :disabled="isPending" @click="cancel">
          {{ t("common.cancel") }}
        </Button>
        <Button primary :disabled="isPending" @click="handleSubmit">
          {{
            isPending
              ? t(isEdit ? "common.saving" : "common.creating")
              : t(isEdit ? "common.save" : "scopes.create")
          }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
