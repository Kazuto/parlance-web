import { useQuery } from "@tanstack/vue-query";
import { api } from "~/lib/api";

export function useUserGet({ id }: { id: string }) {
  const { data, isLoading, isPending, error, refetch } = useQuery({
    ...api.users.get.use({ id }),
  });

  return {
    data,
    isLoading,
    isPending,
    error,
    refetch,
  };
}
