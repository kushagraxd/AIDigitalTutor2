import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Redirect to home if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };
  
  const handleDemoLogin = () => {
    localStorage.setItem('demoMode', 'true');
    setLocation("/");
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }}></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
          <p className="mt-4 text-neutral-gray">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-lightest">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-neutral-dark">AI Digital Marketing Professor</h1>
            <p className="text-neutral-gray mt-2">Access your personalized learning experience</p>
          </div>
          
          {/* Educational graphic */}
          <div className="mb-8 mx-auto w-full max-w-sm">
            <img 
              src="https://images.unsplash.com/photo-1517048676732-d65bc937f952" 
              alt="Digital marketing education concept" 
              className="w-full h-auto rounded-lg shadow" 
            />
          </div>
          
          {/* Login Form */}
          <div className="space-y-4">
            <Button 
              className="w-full py-3 px-4" 
              onClick={handleLogin}
            >
              <span className="material-icons mr-2">login</span>
              Sign In
            </Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-lightest px-2 text-neutral-gray">or</span>
              </div>
            </div>
            
            <Button 
              className="w-full py-3 px-4" 
              variant="outline"
              onClick={handleDemoLogin}
            >
              <span className="material-icons mr-2">play_circle</span>
              Try Demo Mode
            </Button>
            
            <p className="text-sm text-center text-neutral-gray mt-4">
              Learn digital marketing with an AI professor customized to your needs and learning style.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
