import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Module } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import ModuleCard from "@/components/modules/ModuleCard";

export default function Home() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Fetch modules
  const { data: modules, isLoading } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
  });
  
  return (
    <div className="flex-grow overflow-auto p-6">
      <h1 className="text-2xl font-heading font-bold mb-6">
        Welcome{user?.firstName ? `, ${user.firstName}` : ""}!
      </h1>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }}></div>
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.4s" }}></div>
            </div>
            <p className="mt-4 text-neutral-gray">Loading modules...</p>
          </div>
        </div>
      ) : (
        <>
          {/* All Modules Section */}
          <section>
            <h2 className="text-xl font-heading font-semibold mb-4">All Modules</h2>
            
            {modules && modules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map(module => (
                  <ModuleCard 
                    key={module.id} 
                    module={module} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-neutral-light rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium mb-2">No modules available</h3>
                <p className="text-neutral-gray mb-4">We're still preparing content for you.</p>
              </div>
            )}
          </section>
        </>
      )}
      
      {/* Features Section */}
      <section className="mt-12">
        <h2 className="text-xl font-heading font-semibold mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <span className="material-icons text-primary">school</span>
            </div>
            <h3 className="font-medium mb-2">Personalized Learning</h3>
            <p className="text-sm text-neutral-gray">Customized content based on your learning style and pace.</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <span className="material-icons text-primary">psychology</span>
            </div>
            <h3 className="font-medium mb-2">Adaptive Learning</h3>
            <p className="text-sm text-neutral-gray">AI automatically adjusts to your knowledge level and learning pace.</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <span className="material-icons text-primary">update</span>
            </div>
            <h3 className="font-medium mb-2">Current Information</h3>
            <p className="text-sm text-neutral-gray">Access to the latest digital marketing trends and strategies.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
