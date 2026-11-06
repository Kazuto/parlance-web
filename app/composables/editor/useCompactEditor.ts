import type { SplitViewItem } from "@thkzt/eunoia";
import { useMediaQuery } from "@vueuse/core";
import type { Ref } from "vue";

/**
 * On narrow screens an editor page shows either its list or the open item, not
 * both. The open item's id sits in the URL (`?entry=…`), so the browser's back
 * button returns to the list; moving to the next item replaces it instead.
 *
 * A link or reload with an id opens that item once the list holds it, and the
 * list when it doesn't. Wide screens show both side by side and ignore the id.
 */
export function useCompactEditor(options: {
  items: Ref<SplitViewItem[]>;
  selected: Ref<SplitViewItem | undefined>;
}) {
  // The width where the sidebar gives way to the bottom navigation.
  const compact = useMediaQuery("(width < 48rem)");
  const route = useRoute();
  const router = useRouter();

  const openId = computed(() =>
    typeof route.query.entry === "string" ? route.query.entry : undefined,
  );
  const editorOpen = computed(() => compact.value && !!openId.value);

  // Whether the open item was pushed onto the history here, so going back to the
  // list can pop it rather than add another step.
  let pushed = false;

  watch(openId, (id) => {
    if (!id) pushed = false;
  });

  function show(id: string) {
    if (!compact.value) return;

    const query = { ...route.query, entry: id };

    if (openId.value) {
      void router.replace({ query });

      return;
    }

    pushed = true;
    void router.push({ query });
  }

  function close() {
    if (pushed) {
      pushed = false;
      router.back();

      return;
    }

    const query = { ...route.query };

    Reflect.deleteProperty(query, "entry");
    void router.replace({ query });
  }

  watch(
    [compact, openId, options.items],
    ([narrow, id, items]) => {
      if (!narrow || !id || String(options.selected.value?.key) === id) return;

      const item = items.find((candidate) => String(candidate.key) === id);

      if (item) options.selected.value = item;
      else if (items.length) close();
    },
    { immediate: true },
  );

  return { compact, editorOpen, show, close };
}
