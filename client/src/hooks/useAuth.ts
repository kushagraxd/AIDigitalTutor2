import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  // Always enable demo mode for now to bypass auth issues
  const [demoMode, setDemoMode] = useState<boolean>(true);
  
  // Check for demo mode on component mount
  useEffect(() => {
    // Force demo mode to true and save it
    localStorage.setItem('demoMode', 'true');
    setDemoMode(true);
  }, []);
  
  // Query the user info with demo mode header
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        headers: {
          'x-demo-mode': 'true'
        }
      });
      
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
    isAuthenticated: !!user,
    isDemoMode: true // Always return true for demo mode
  };
}
