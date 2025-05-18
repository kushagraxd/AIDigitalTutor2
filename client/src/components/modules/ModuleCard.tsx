import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Module } from "@shared/schema";
import { useLocation } from "wouter";

interface ModuleCardProps {
  module: Module;
}

export default function ModuleCard({ module }: ModuleCardProps) {
  const [_, setLocation] = useLocation();
  
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
        </div>
        <CardDescription>{module.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
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
          Start Learning
        </Button>
      </CardFooter>
    </Card>
  );
}
