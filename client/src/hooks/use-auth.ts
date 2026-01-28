import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { BASE_URL, getAuthHeaders } from "@/lib/api-config";

async function fetchUser(): Promise<User | null> {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    return null;
  }

  const response = await fetch(`${BASE_URL}/api/auth/user`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    // Token is invalid or expired, clear it
    localStorage.removeItem("auth_token");
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  // Clear token from localStorage
  localStorage.removeItem("auth_token");

  // Optionally call backend logout endpoint
  try {
    await fetch(`${BASE_URL}/api/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch (error) {
    // Ignore errors, token is already cleared
    console.error("Logout API call failed:", error);
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      // Redirect to login page
      window.location.href = "/login";
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
