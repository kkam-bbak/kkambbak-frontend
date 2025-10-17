import { useQuery } from '@tanstack/react-query'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => ({ id: '0', name: 'mock' }),
    retry: 0,
  })
}