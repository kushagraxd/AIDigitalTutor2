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
  const { isDemoMode } = useAuth();
  const [demoProgress, setDemoProgress] = useState<UserProgress[]>([]);
  const [demoHistory, setDemoHistory] = useState<any[]>([]);
  
  // Fetch modules
  const { data: modules, isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
  });
  
  // Generate demo data when in demo mode and modules are loaded
  useEffect(() => {
    if (isDemoMode && modules && modules.length > 0) {
      // Create mock progress data
      const mockProgress = modules.map((module, index) => ({
        id: module.id,
        userId: "demo-user-123",
        moduleId: module.id,
        percentComplete: Math.min(100, Math.floor(Math.random() * 100) + (index === 0 ? 30 : 0)),
        completed: index === 0 ? false : Math.random() > 0.7,
        lastAccessed: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      setDemoProgress(mockProgress);
      
      // Create mock chat history
      const mockHistory = [
        {
          id: 1,
          userId: "demo-user-123",
          moduleId: modules[0].id,
          question: "What is the best social media platform for B2B marketing?",
          answer: "LinkedIn is typically the most effective for B2B marketing.",
          confidenceScore: 95,
          timestamp: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
          id: 2,
          userId: "demo-user-123",
          moduleId: modules[0].id,
          question: "How do I measure ROI for digital marketing?",
          answer: "Track conversions, analyze cost per acquisition, and monitor lifetime value.",
          confidenceScore: 92,
          timestamp: new Date(Date.now() - 1000 * 60 * 60)
        }
      ];
      setDemoHistory(mockHistory);
    }
  }, [isDemoMode, modules]);
  
  // Fetch user progress (only when not in demo mode)
  const { data: apiProgress, isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
    enabled: !!modules && !isDemoMode,
  });
  
  // Fetch chat history (only when not in demo mode)
  const { data: apiHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/history", { limit: 5 }],
    enabled: !isDemoMode,
  });
  
  // Use demo data if in demo mode, otherwise use API data
  const progress = isDemoMode ? demoProgress : apiProgress;
  const history = isDemoMode ? demoHistory : apiHistory;
  
  // Find current module progress
  const findCurrentModule = () => {
    if (!modules || !progress || progress.length === 0) return null;
    
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
      
      if (currentModule && currentProgress) {
        return {
          module: currentModule,
          progress: currentProgress
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
          ? progress.find(p => p.moduleId === modules[0].id) || null
          : null
      };
    }
    
    return null;
  };
  
  const currentModuleData = findCurrentModule();
  
  const navigateToModule = (moduleId: number) => {
    setLocation(`/module/${moduleId}`);
    if (onClose) onClose();
  };
  
  return (
    <aside 
      className={cn(
        "bg-white border-r border-neutral-medium w-64 flex-shrink-0 overflow-y-auto transition-all duration-300",
        "fixed md:static inset-y-0 left-0 z-40 transform",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-wider text-neutral-gray font-semibold mb-3">
              Course Modules
            </h2>
            
            {modulesLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <ul className="space-y-1">
                {modules && modules.map((module) => (
                  <li key={module.id}>
                    <button
                      onClick={() => navigateToModule(module.id)}
                      className={cn(
                        "flex items-center w-full px-3 py-2 text-sm rounded-md transition-all text-left",
                        location === `/module/${module.id}`
                          ? "bg-neutral-light text-primary"
                          : "text-neutral-dark hover:bg-neutral-light hover:text-primary"
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
            <h2 className="text-xs uppercase tracking-wider text-neutral-gray font-semibold mb-3">
              Your Progress
            </h2>
            
            {progressLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : currentModuleData ? (
              <div className="bg-neutral-light rounded-lg p-4">
                <ModuleProgress 
                  module={currentModuleData.module}
                  progress={currentModuleData.progress}
                  totalModules={modules?.length || 0}
                />
              </div>
            ) : (
              <div className="bg-neutral-light rounded-lg p-4 text-sm text-neutral-gray">
                No progress yet. Start a module to track your progress.
              </div>
            )}
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h2 className="text-xs uppercase tracking-wider text-neutral-gray font-semibold mb-3">
              History
            </h2>
            
            {historyLoading && !isDemoMode ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : history && Array.isArray(history) && history.length > 0 ? (
              <ul className="space-y-1">
                {history.map((item: any) => (
                  <li key={item.id}>
                    <button
                      onClick={() => navigateToModule(item.moduleId)}
                      className="flex items-center w-full px-3 py-2 text-sm rounded-md text-neutral-dark hover:bg-neutral-light group transition-all text-left"
                    >
                      <span className="material-icons text-neutral-gray group-hover:text-primary mr-3 text-sm">
                        history
                      </span>
                      <div className="overflow-hidden">
                        <p className="truncate text-sm">{item.question}</p>
                        <p className="text-xs text-neutral-gray">
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-neutral-gray p-2">
                No chat history yet.
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onClose}
        />
      )}
    </aside>
  );
}
