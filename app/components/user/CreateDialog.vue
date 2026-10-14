<script setup lang="ts">
import { Button, Dialog, Input } from "@thkzt/eunoia";
import type { CreateUserResponse } from "~/lib/api";

defineProps<{
  open: boolean;
}>();

const form = ref({
  name: "",
  email: "",
  password: "",
});

const error = ref<string>();

const { create } = useUserStore();
const { mutateAsync: createUser, isPending } = create;

const toast = useToast();

function resetForm() {
  form.value = {
    name: "",
    email: "",
    password: "",
  };

  error.value = undefined;
}

async function handleSubmit() {
  error.value = undefined;

  if (!form.value.name || !form.value.password || !form.value.email) {
    error.value = "Username, password, and email are required";
    return;
  }

  await createUser(
    {
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
    },
    {
      onSuccess: (response: CreateUserResponse) => {
        toast.add(`User ${response.user?.name ?? form.value.name} created`, {
          variant: "success",
        });
      },
      onError: () => {
        toast.add(`Failed to create user: ${form.value.name}`, {
          variant: "danger",
        });
      },
    },
  );

  handleClose();
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
  <Dialog :open title="Create User" @close="handleClose">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- Code -->
      <div>
        <Input
          v-model="form.name"
          type="text"
          required
          placeholder="e.g., John Doe"
          :disabled="isPending"
        >
          Name
        </Input>
      </div>

      <!-- Name (English) -->
      <div>
        <Input
          v-model="form.email"
          type="text"
          required
          placeholder="e.g., john.doe@example.com"
          :disabled="isPending"
        >
          Email
        </Input>
      </div>

      <!-- Password -->
      <div>
        <Input
          v-model="form.password"
          type="password"
          required
          placeholder="e.g., password"
          :disabled="isPending"
        >
          Password
        </Input>
      </div>

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
          {{ isPending ? "Creating..." : "Create User" }}
        </Button>
      </div>
    </form>
  </Dialog>
</template>
