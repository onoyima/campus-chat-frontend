import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { buildUrl, getAuthHeaders } from "@/lib/api-config";

// GET /api/identity/me
export function useMyIdentity() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [api.identity.me.path],
    queryFn: async () => {
      const res = await fetch(buildUrl(api.identity.me.path), { headers: getAuthHeaders() });
      if (res.status === 401) return null;
      if (res.status === 404) return null; // Not set up yet
      if (!res.ok) throw new Error('Failed to fetch identity');
      return api.identity.me.responses[200].parse(await res.json());
    },
    enabled: !!isAuthenticated,
  });
}

// GET /api/identities (Search)
export function useIdentities(params?: { search?: string; role?: string; departmentId?: number }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [api.identity.list.path, params],
    queryFn: async () => {
      // Clean undefined params
      const cleanParams: Record<string, string> = {};
      if (params?.search) cleanParams.search = params.search;
      if (params?.role) cleanParams.role = params.role;
      if (params?.departmentId) cleanParams.departmentId = String(params.departmentId);

      const queryString = new URLSearchParams(cleanParams).toString();
      const url = buildUrl(api.identity.list.path + (queryString ? `?${queryString}` : ''));

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error('Failed to fetch identities');
      return api.identity.list.responses[200].parse(await res.json());
    },
    enabled: !!isAuthenticated,
  });
}

// POST /api/debug/switch-identity
export function useSwitchIdentity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (identityId: number) => {
      const res = await fetch(buildUrl(api.debug.switchIdentity.path), {
        method: api.debug.switchIdentity.method,
        headers: getAuthHeaders(),
        body: JSON.stringify({ identityId }),
      });
      if (!res.ok) throw new Error('Failed to switch identity');
      return api.debug.switchIdentity.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.identity.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

// POST /api/debug/seed
export function useSeedData() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(buildUrl(api.debug.seed.path), {
        method: api.debug.seed.method,
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to seed data');
      return api.debug.seed.responses[200].parse(await res.json());
    },
  });
}
