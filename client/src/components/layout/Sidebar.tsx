import React, { useState, useEffect } from "react";
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
  const { data: modules, isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
  });
  
  // Fetch user progress (only when not in demo mode)
  const { data: apiProgress, isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    enabled: !!modules && !isDemoMode && !!user && isAuthenticated,
    // Add a refetch interval to ensure progress is updated regularly
    refetchInterval: 5000, // Refetch every 5 seconds
  });
  
  // Fetch chat history (only when not in demo mode)
  const { data: apiHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/history", { limit: 5 }],
    enabled: !isDemoMode && !!user && isAuthenticated,
  });
  
  // Use demo data if in demo mode, otherwise use API data
  const progress = isDemoMode ? demoProgress : apiProgress;
  const history = isDemoMode ? demoHistory : apiHistory;
  
  // Find current module progress
  const findCurrentModule = () => {
    if (!modules || modules.length === 0) return null;
    
    // Get current module ID from URL if available
    const currentPath = location;
    const moduleIdMatch = currentPath.match(/\/module\/(\d+)/);
    const currentModuleId = moduleIdMatch ? parseInt(moduleIdMatch[1]) : null;
    
    // If we have a current module ID, find it and its progress
    if (currentModuleId) {
      const currentModule = modules.find(m => m.id === currentModuleId);
      const currentProgress = Array.isArray(progress) 
        ? progress.find(p => p.moduleId === currentModuleId)
        : null;
      
      if (currentModule) {
        // Always return a module with progress data, even if no progress exists yet
        // This ensures the progress bar is always displayed
        return {
          module: currentModule,
          progress: currentProgress || { 
            id: -1, 
            userId: user?.id || 'current-user', 
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
    
    // Otherwise find the most recently accessed module
    let sortedProgress: UserProgress[] = [];
    if (Array.isArray(progress)) {
      sortedProgress = [...progress].sort((a, b) => {
        const dateA = a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0;
        const dateB = b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0;
        return dateB - dateA;
      });
    }
    
    if (sortedProgress.length > 0) {
      const recentModuleId = sortedProgress[0].moduleId;
      const recentModule = modules.find(m => m.id === recentModuleId);
      
      if (recentModule) {
        return {
          module: recentModule,
          progress: sortedProgress[0]
        };
      }
    }
    
    // If no current module, return the first one
    if (modules.length > 0) {
      return {
        module: modules[0],
        progress: Array.isArray(progress) 
          ? progress.find(p => p.moduleId === modules[0].id) || { 
              id: -1, 
              userId: user?.id || 'current-user', 
              moduleId: modules[0].id, 
              percentComplete: 10, 
              completed: false,
              lastAccessed: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          : null
      };
    }
    
    return null;
  };
  
  const currentModuleData = findCurrentModule();
  
  const navigateToModule = (moduleId: number) => {
    setLocation(`/module/${moduleId}`);
    onClose();
  };
  
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Digital Marketing AI</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100"
            aria-label="Close sidebar"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <ScrollArea className="flex-grow">
          <div className="p-4">
            <h2 className="text-xs uppercase tracking-wider text-neutral-gray font-semibold mb-3">
              Course Modules
            </h2>
            
            {modulesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <ul className="space-y-2">
                {modules?.map((module) => (
                  <li key={module.id}>
                    <button
                      onClick={() => navigateToModule(module.id)}
                      className={cn(
                        "w-full text-left py-2 px-3 rounded-md text-sm flex items-center hover:bg-neutral-light",
                        location === `/module/${module.id}` ? "bg-primary/10 text-primary font-medium" : ""
                      )}
                    >
                      <span className={cn(
                        "material-icons flex-shrink-0 mr-2 text-sm",
                        location === `/module/${module.id}` ? "text-primary" : "text-neutral-gray"
                      )}>
                        {module.icon || "description"}
                      </span>
                      <span className="truncate">{module.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h2 className="text-xs uppercase tracking-wider text-neutral-gray font-semibold mb-3 px-4">
              Your Progress
            </h2>
            
            {progressLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : currentModuleData ? (
              <div className="bg-neutral-light mx-4 rounded-lg p-4">
                <ModuleProgress 
                  module={currentModuleData.module}
                  progress={currentModuleData.progress}
                  totalModules={modules?.length || 0}
                />
              </div>
            ) : (
              <div className="bg-neutral-light mx-4 rounded-lg p-4 text-sm text-neutral-gray">
                No progress yet. Start a module to track your progress.
              </div>
            )}
          </div>
          
          <Separator className="my-4" />
          
          <div className="p-4">
            <h2 className="text-xs uppercase tracking-wider text-neutral-gray font-semibold mb-3">
              Recent Questions
            </h2>
            
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : history && history.length > 0 ? (
              <ul className="space-y-4">
                {history.slice(0, 3).map((item: any) => (
                  <li key={item.id} className="text-sm">
                    <p className="font-medium text-neutral-dark mb-1">{item.question}</p>
                    <p className="text-neutral-gray">{item.answer}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-neutral-gray">
                No recent questions. Start chatting with the AI to see your history.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}