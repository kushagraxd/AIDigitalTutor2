import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// Demo user for testing purposes
const DEMO_USER = {
  id: "demo-user-123",
  email: "demo@example.com",
  firstName: "Demo",
  lastName: "User",
  profileImageUrl: "https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export function useAuth() {
  const [demoMode, setDemoMode] = useState<boolean>(false);
  
  // Check for demo mode on component mount
  useEffect(() => {
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    setDemoMode(isDemoMode);
  }, []);
  
  const { data: authUser, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !demoMode // Only query if not in demo mode
  });
  
  // Use demo user if in demo mode, otherwise use authenticated user
  const user = demoMode ? DEMO_USER : authUser;
  const isLoading = demoMode ? false : authLoading;
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isDemoMode: demoMode
  };
}
