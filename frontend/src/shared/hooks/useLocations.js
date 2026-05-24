import { useQuery } from '@tanstack/react-query';
import { locationApi } from '../api/location.api';

export const LOCATION_QUERY_KEY = ['locations'];

export function useProvinces() {
    return useQuery({
        queryKey: [...LOCATION_QUERY_KEY, 'provinces'],
        queryFn: locationApi.getProvinces,
        staleTime: Infinity,
    });
}

export function useWards(provinceCode) {
    return useQuery({
        queryKey: [...LOCATION_QUERY_KEY, 'wards', provinceCode],
        queryFn: () => locationApi.getWards(provinceCode),
        enabled: Boolean(provinceCode),
        staleTime: Infinity,
    });
}
