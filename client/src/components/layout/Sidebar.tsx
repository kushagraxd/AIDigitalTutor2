import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Module, UserProgress } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ModuleProgress from "../modules/ModuleProgress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  // Fetch modules
  const { data: modules } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
  });
  
  // Fetch user progress (with refresh interval)
  const { data: progress } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    enabled: !!modules && !!user && isAuthenticated,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  // Fetch chat history
  const { data: history } = useQuery({
    queryKey: ["/api/history", { limit: 5 }],
    enabled: !!user && isAuthenticated,
  });
  
  // Find current module
  const getCurrentModule = () => {
    if (!modules || modules.length === 0) return null;
    
    // Get current module ID from URL
    const moduleIdMatch = location.match(/\/modules\/(\d+)/);
    const currentModuleId = moduleIdMatch ? parseInt(moduleIdMatch[1]) : null;
    
    // If we have a current module ID, find it
    if (currentModuleId) {
      const currentModule = modules.find(m => m.id === currentModuleId);
      const currentProgress = progress?.find(p => p.moduleId === currentModuleId);
      
      if (currentModule) {
        return {
          module: currentModule,
          progress: currentProgress || { 
            id: -1, 
            userId: user?.id || '', 
            moduleId: currentModuleId, 
            percentComplete: 10, 
            completed: false,
            lastAccessed: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
      }
    }
    
    // Default to first module if none selected
    if (modules.length > 0) {
      return {
        module: modules[0],
        progress: progress?.find(p => p.moduleId === modules[0].id) || null
      };
    }
    
    return null;
  };
  
  const currentModuleData = getCurrentModule();
  
  const handleModuleClick = (moduleId: number) => {
    console.log("Navigating to module:", moduleId);
    setLocation(`/modules/${moduleId}`);
    onClose();
  };
  
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-lg border-r transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold">Digital Marketing AI</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-full"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4">
            <h3 className="mb-2 text-sm font-medium">Modules</h3>
            
            <div className="space-y-1">
              {modules?.map(module => (
                <button
                  key={module.id}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md flex items-center",
                    location === `/modules/${module.id}` 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-accent"
                  )}
                  onClick={() => handleModuleClick(module.id)}
                >
                  <span className="material-icons text-sm mr-2">
                    {module.icon || "school"}
                  </span>
                  <span>{module.title}</span>
                </button>
              ))}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {currentModuleData && (
            <div className="px-4 mb-4">
              <h3 className="mb-2 text-sm font-medium">Progress</h3>
              <div className="bg-accent/50 p-3 rounded-lg">
                <ModuleProgress
                  module={currentModuleData.module}
                  progress={currentModuleData.progress}
                  totalModules={modules?.length || 0}
                />
              </div>
            </div>
          )}
          
          <Separator className="my-4" />
          
          <div className="px-4">
            <h3 className="mb-2 text-sm font-medium">Recent Questions</h3>
            
            {history && Array.isArray(history) && history.length > 0 ? (
              <div className="space-y-3">
                {history.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="text-sm">
                    <p className="font-medium">{item.question}</p>
                    <p className="text-muted-foreground text-xs">{item.answer}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent questions</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}