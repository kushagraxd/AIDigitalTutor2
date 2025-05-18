import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Module, UserProgress } from "@shared/schema";
import { useLocation } from "wouter";

interface ModuleCardProps {
  module: Module;
  progress?: UserProgress;
}

export default function ModuleCard({ module, progress }: ModuleCardProps) {
  const [_, setLocation] = useLocation();
  
  const percentComplete = progress?.percentComplete || 0;
  const isCompleted = progress?.completed || false;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex space-x-2 items-center">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <span className="material-icons text-primary">{module.icon || "description"}</span>
            </div>
            <CardTitle>{module.title}</CardTitle>
          </div>
          
          {isCompleted && (
            <div className="rounded-full bg-green-100 text-green-600 text-xs px-2 py-1 flex items-center">
              <span className="material-icons text-xs mr-1">check_circle</span>
              <span>Complete</span>
            </div>
          )}
        </div>
        <CardDescription>{module.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{percentComplete}%</span>
          </div>
          <Progress value={percentComplete} className="h-2" />
        </div>
        
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <span className="material-icons text-xs mr-1">schedule</span>
          <span>Estimated: {module.estimatedHours} hours</span>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          className="w-full" 
          onClick={() => {
            console.log(`Navigating to module: ${module.id}`);
            setLocation(`/modules/${module.id}`);
          }}
        >
          {percentComplete > 0 ? "Continue Learning" : "Start Learning"}
        </Button>
      </CardFooter>
    </Card>
  );
}
