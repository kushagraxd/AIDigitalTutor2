import React, { Suspense } from "react";
import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Admin from "@/pages/admin";
import Layout from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import ChatInterface from "@/components/chat/ChatInterface";
import ModuleHeader from "@/components/modules/ModuleHeader";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Module } from "@shared/schema";
import Profile from "@/pages/profile";

function ModulePage() {
  // Extract module ID from URL params using wouter's hooks
  const [match, params] = useRoute('/modules/:id');
  const moduleId = parseInt(params?.id || '0');
  console.log("Module page loaded with ID:", moduleId, "match:", match, "params:", params);
  
  const { user } = useAuth();
  
  // Fetch module data
  const { data: module, isLoading } = useQuery<Module>({
    queryKey: [`/api/modules/${moduleId}`],
    enabled: !isNaN(moduleId)
  });
  
  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }}></div>
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    );
  }
  
  if (!module) {
    return (
      <div className="flex-grow p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Module not found. Please select a valid module.
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-white border-b border-neutral-medium p-4">
        <ModuleHeader module={module} />
      </div>
      <ChatInterface moduleId={moduleId} module={module} />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <Suspense fallback={<div className="flex-grow flex items-center justify-center">Loading authentication...</div>}>
          {React.createElement(React.lazy(() => import('./pages/auth/login')))}
        </Suspense>
      </Route>
      <Route path="/" component={Home} />
      <Route path="/modules/:id" component={ModulePage} />
      <Route path="/admin" component={Admin} />
      <Route path="/profile">
        <Suspense fallback={<div className="flex-grow flex items-center justify-center">Loading profile...</div>}>
          {React.createElement(React.lazy(() => import('./pages/profile')))}
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Layout>
            <Router />
          </Layout>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
