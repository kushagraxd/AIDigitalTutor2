import { Switch, Route } from "wouter";
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

function ModulePage() {
  // Extract module ID from URL
  const path = window.location.pathname;
  const moduleId = parseInt(path.split('/module/')[1]);
  
  // Fetch module data
  const { data: module, isLoading } = useQuery({
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
      <ModuleHeader module={module} />
      <ChatInterface moduleId={moduleId} module={module} />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/module/:id">
        <ModulePage />
      </Route>
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
