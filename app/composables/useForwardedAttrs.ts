import { computed, useAttrs } from "vue";

export function useForwardedAttrs() {
  const attrs = useAttrs();

  const classAttr = computed(() => attrs.class as string);

  const forwardedAttrs = computed(() => {
    const { class: _, ...rest } = attrs;
    return rest;
  });

  return { classAttr, forwardedAttrs };
}
