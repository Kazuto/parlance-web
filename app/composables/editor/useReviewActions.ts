import type { ReviewDecision } from "~/lib/api/schemas/parlance/v1/CommonSchema";

type ReviewMutation<Request> = {
  isPending: boolean;
  mutateAsync: (request: Request) => Promise<unknown>;
};

/**
 * Approving and sending back translations in an editor page. The page says how
 * to pick items × languages in its request, e.g. by entry ids.
 */
export function useReviewActions<Request>(options: {
  review: () => ReviewMutation<Request>;
  /** `onlyDrafts` leaves approved translations out, e.g. when rejecting ticked items. */
  request: (
    itemIds: string[],
    localeIds: string[],
    decision: ReviewDecision,
    comment?: string,
    onlyDrafts?: boolean,
  ) => Request;
  /** Reloads what shows the review state, e.g. the list and the open item. */
  afterReview: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const { showSuccess, showError } = useErrorHelper();
  const isReviewing = computed(() => options.review().isPending);
  /**
   * What a reviewer is about to send back: one translation, named by its
   * language, or the drafts of ticked items.
   */
  const rejecting = ref<{
    itemIds: string[];
    localeIds: string[];
    language?: string;
    /** Leaves approved translations among the items approved. */
    onlyDrafts?: boolean;
  }>();

  async function run(request: Request, message: (count: number) => string) {
    try {
      const response = (await options.review().mutateAsync(request)) as Record<
        string,
        unknown[] | undefined
      >;
      const count = Object.values(response).find(Array.isArray)?.length ?? 0;

      showSuccess(message(count));
      await options.afterReview();

      return true;
    } catch (error) {
      showError(error);

      return false;
    }
  }

  /** Approves the drafts of the items in the languages. */
  function approve(itemIds: string[], localeIds: string[]) {
    if (!itemIds.length || !localeIds.length || isReviewing.value) return;

    return run(
      options.request(itemIds, localeIds, "REVIEW_DECISION_APPROVE"),
      (count) => t("review.approvedCount", { count }, count),
    );
  }

  function requestReject(itemId: string, localeId: string, language: string) {
    rejecting.value = { itemIds: [itemId], localeIds: [localeId], language };
  }

  /** Asks to send back the drafts of the items in the languages. */
  function requestRejectMany(itemIds: string[], localeIds: string[]) {
    if (!itemIds.length || !localeIds.length) return;
    rejecting.value = {
      itemIds: [...itemIds],
      localeIds: [...localeIds],
      onlyDrafts: true,
    };
  }

  async function confirmReject(comment: string) {
    const target = rejecting.value;

    if (!target || isReviewing.value) return;

    const { language } = target;
    const done = await run(
      options.request(
        target.itemIds,
        target.localeIds,
        "REVIEW_DECISION_REJECT",
        comment,
        target.onlyDrafts,
      ),
      (count) =>
        language
          ? t("review.rejectedToast", { language })
          : t("review.rejectedCount", { count }, count),
    );

    if (done) rejecting.value = undefined;
  }

  return {
    isReviewing,
    rejecting,
    approve,
    requestReject,
    requestRejectMany,
    confirmReject,
  };
}
