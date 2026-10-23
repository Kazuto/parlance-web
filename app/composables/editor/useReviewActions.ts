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
  request: (
    itemIds: string[],
    localeIds: string[],
    decision: ReviewDecision,
    comment?: string,
  ) => Request;
  /** Reloads what shows the review state, e.g. the list and the open item. */
  afterReview: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const { showSuccess, showError } = useErrorHelper();
  const isReviewing = computed(() => options.review().isPending);
  /** The translation a reviewer is about to send back. */
  const rejecting = ref<{
    itemId: string;
    localeId: string;
    language: string;
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
    rejecting.value = { itemId, localeId, language };
  }

  async function confirmReject(comment: string) {
    const target = rejecting.value;

    if (!target || isReviewing.value) return;

    const done = await run(
      options.request(
        [target.itemId],
        [target.localeId],
        "REVIEW_DECISION_REJECT",
        comment,
      ),
      () => t("review.rejectedToast", { language: target.language }),
    );

    if (done) rejecting.value = undefined;
  }

  return { isReviewing, rejecting, approve, requestReject, confirmReject };
}
