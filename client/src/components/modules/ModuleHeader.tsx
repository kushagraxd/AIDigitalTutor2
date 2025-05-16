import React from "react";
import { Module } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ModuleHeaderProps {
  module: Module;
}

export default function ModuleHeader({ module }: ModuleHeaderProps) {
  return (
    <div className="bg-white border-b border-neutral-medium p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-heading font-semibold text-neutral-dark">{module.title}</h1>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost">
                  <span className="material-icons">share</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share module</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost">
                  <span className="material-icons">more_vert</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Module settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="mt-1 text-sm text-neutral-gray flex items-center">
        <span className="material-icons text-xs mr-1">schedule</span>
        <span>Estimated time: {module.estimatedHours} hours</span>
      </div>
      
      {module.description && (
        <p className="mt-2 text-sm text-neutral-gray">{module.description}</p>
      )}
    </div>
  );
}
