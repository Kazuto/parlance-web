import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export function useLocaleGet({ id }: { id: string }) {
  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...api.locales.get.use({ id }),
  });

  return {
    data,
    isLoading,
    isPending,
    error,
    refetch,
  };
}
