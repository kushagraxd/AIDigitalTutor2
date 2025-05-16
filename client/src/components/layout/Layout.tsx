import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import TopNavBar from "./TopNavBar";
import Sidebar from "./Sidebar";
import { useLocation } from "wouter";
import { Module, UserProgress } from "@shared/schema";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // If not authenticated and not loading, redirect to login
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex space-x-2 justify-center items-center">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }}></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
          <p className="mt-4 text-neutral-gray">Loading...</p>
        </div>
      </div>
    );
  }

  // If on login page, just render children without layout
  if (location === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex flex-col">
      <TopNavBar 
        user={user} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <div className="flex-grow flex overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <main className="flex-grow flex flex-col bg-neutral-lightest overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
