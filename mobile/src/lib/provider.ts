import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { BusinessDetail, ProviderDashboard } from './types';

/** The provider's own business, or null if they haven't created one yet. */
export const useMyBusiness = () =>
  useQuery({
    queryKey: ['my-business'],
    queryFn: () =>
      api<BusinessDetail>('/provider/business').catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
  });

export const useDashboard = (enabled: boolean) =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => api<ProviderDashboard>('/provider/dashboard'), enabled });
