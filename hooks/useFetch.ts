import useSWR, { SWRConfiguration } from 'swr';
import { fetcher } from '@/lib/fetcher';

export function useFetch<T = any>(url: string | null, options?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}
