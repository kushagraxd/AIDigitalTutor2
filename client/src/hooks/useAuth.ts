import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Query the user info
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user");
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      return response.json();
    },
    retry: 1
  });
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user
  };
}
