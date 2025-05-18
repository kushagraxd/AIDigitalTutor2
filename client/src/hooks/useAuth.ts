import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Query the user info - Added refetchOnWindowFocus
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user");
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: true
  });
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetchUser: refetch
  };
}
