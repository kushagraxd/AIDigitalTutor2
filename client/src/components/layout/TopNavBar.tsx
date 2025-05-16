import React from "react";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TopNavBarProps {
  user?: User;
  toggleSidebar: () => void;
}

export default function TopNavBar({ user, toggleSidebar }: TopNavBarProps) {
  const [location, setLocation] = useLocation();
  const { isDemoMode, toggleDemoMode } = useAuth();
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };
  
  return (
    <header className="bg-white shadow-sm border-b border-neutral-medium">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            <span className="material-icons text-neutral-dark">menu</span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 bg-primary rounded-md flex items-center justify-center cursor-pointer"
              onClick={() => setLocation("/")}
            >
              <span className="material-icons text-white text-xl">school</span>
            </div>
            <h1 className="text-lg font-heading font-semibold text-neutral-dark hidden md:block">
              AI Digital Marketing Professor
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Demo Mode Toggle */}
          <div className="hidden md:flex items-center space-x-2 mr-2">
            <Label htmlFor="demo-mode" className={`text-sm ${isDemoMode ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
              Demo Mode
            </Label>
            <Switch
              id="demo-mode"
              checked={isDemoMode}
              onCheckedChange={toggleDemoMode}
            />
          </div>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || "User"} />
                    <AvatarFallback>
                      {user?.firstName?.[0] || user?.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setLocation("/profile")}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setLocation("/settings")}
                >
                  Settings
                </DropdownMenuItem>
                {/* Demo Mode Toggle (Mobile) */}
                <DropdownMenuItem 
                  className="cursor-pointer md:hidden"
                  onClick={toggleDemoMode}
                >
                  {isDemoMode ? 'Turn Off Demo Mode' : 'Turn On Demo Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <a href="/api/login">Log in</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
