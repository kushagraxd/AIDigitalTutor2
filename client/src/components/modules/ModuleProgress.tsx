import React from "react";
import { Progress } from "@/components/ui/progress";
import { Module, UserProgress } from "@shared/schema";

interface ModuleProgressProps {
  module: Module;
  progress: UserProgress | null;
  totalModules: number;
}

export default function ModuleProgress({ module, progress, totalModules }: ModuleProgressProps) {
  // Make sure to display a visible progress value (minimum 10%)
  const percentComplete = progress?.percentComplete ?? 10;
  const moduleNumber = module.order || 1;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-neutral-dark">Current Module</span>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
          {moduleNumber}/{totalModules}
        </span>
      </div>
      
      <Progress 
        value={percentComplete} 
        className="h-2 mb-3" 
      />
      
      <p className="text-xs text-neutral-gray">
        {module.title} ({percentComplete}% complete)
      </p>
    </div>
  );
}
