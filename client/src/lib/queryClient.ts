import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  // Check if in demo mode - don't throw error for 401 responses in demo mode
  const isDemoMode = localStorage.getItem('demoMode') === 'true';
  
  if (!res.ok && !(isDemoMode && res.status === 401)) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  // Check if in demo mode
  const isDemoMode = localStorage.getItem('demoMode') === 'true';
  
  // Create headers with demo mode if needed
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (isDemoMode) {
    headers["x-demo-mode"] = "true";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Parse JSON response
  try {
    return await res.json();
  } catch (e) {
    // Return empty object if not JSON
    return {};
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check if in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true';
    
    // Add headers for demo mode
    const headers: Record<string, string> = {};
    if (isDemoMode) {
      headers["x-demo-mode"] = "true";
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
